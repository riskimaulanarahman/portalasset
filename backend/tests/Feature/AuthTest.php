<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * #24 FIX: Feature tests untuk authentication flow
 */
class AuthTest extends TestCase
{
    use RefreshDatabase;

    // ── Login ─────────────────────────────────────────────────────────────────

    public function test_login_returns_token_for_valid_credentials(): void
    {
        $user = User::factory()->create([
            'username'   => 'testuser',
            'password'   => Hash::make('password123'),
            'not_active' => false,
        ]);

        $response = $this->postJson('/api/login', [
            'username' => 'testuser',
            'password' => 'password123',
        ]);

        $response->assertOk()
                 ->assertJsonStructure(['access_token', 'token_type', 'user', 'permissions']);
    }

    public function test_login_fails_for_wrong_password(): void
    {
        User::factory()->create([
            'username' => 'testuser',
            'password' => Hash::make('correct-password'),
        ]);

        $this->postJson('/api/login', [
            'username' => 'testuser',
            'password' => 'wrong-password',
        ])->assertUnprocessable()
          ->assertJsonValidationErrors(['password'])
          ->assertJsonMissingValidationErrors(['username'])
          ->assertJsonPath('errors.password.0', 'Password salah.');
    }

    public function test_login_fails_for_unknown_username(): void
    {
        $this->postJson('/api/login', [
            'username' => 'unknown',
            'password' => 'password123',
        ])->assertUnprocessable()
          ->assertJsonValidationErrors(['username'])
          ->assertJsonMissingValidationErrors(['password'])
          ->assertJsonPath('errors.username.0', 'User tidak ditemukan atau belum aktif');
    }

    public function test_login_fails_for_inactive_user(): void
    {
        User::factory()->create([
            'username'   => 'inactive',
            'password'   => Hash::make('password123'),
            'not_active' => true,
        ]);

        $this->postJson('/api/login', [
            'username' => 'inactive',
            'password' => 'password123',
        ])->assertUnprocessable()
          ->assertJsonValidationErrors(['username'])
          ->assertJsonMissingValidationErrors(['password'])
          ->assertJsonPath('errors.username.0', 'User tidak ditemukan atau belum aktif');
    }

    public function test_login_is_rate_limited(): void
    {
        // 5 percobaan harus berhasil dilimit setelah limit tercapai (#3 FIX)
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', ['username' => 'x', 'password' => 'x']);
        }

        $this->postJson('/api/login', ['username' => 'x', 'password' => 'x'])
             ->assertStatus(429); // Too Many Requests
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    public function test_logout_revokes_token(): void
    {
        $user = User::factory()->create(['not_active' => false]);
        $user->assignRole('admin');
        $token = $user->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', "Bearer $token")
             ->postJson('/api/logout')
             ->assertOk();

        // Token harus sudah tidak valid setelah logout
        $this->withHeader('Authorization', "Bearer $token")
             ->getJson('/api/user')
             ->assertUnauthorized();
    }

    // ── /me (GET /api/user) ───────────────────────────────────────────────────

    public function test_me_returns_current_user_with_permissions(): void
    {
        $user = User::factory()->create(['not_active' => false]);
        $user->givePermissionTo('view-assets');

        $this->actingAs($user, 'sanctum')
             ->getJson('/api/user')
             ->assertOk()
             ->assertJsonStructure(['user', 'permissions']);
    }

    // ── Change Password (#14 FIX) ─────────────────────────────────────────────

    public function test_user_can_change_own_password(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('old-password'),
        ]);

        $this->actingAs($user, 'sanctum')
             ->postJson('/api/profile/change-password', [
                 'current_password'      => 'old-password',
                 'password'              => 'new-password-123',
                 'password_confirmation' => 'new-password-123',
             ])
             ->assertOk()
             ->assertJsonFragment(['message' => 'Password berhasil diubah. Silakan login kembali.']);
    }

    public function test_change_password_fails_if_current_wrong(): void
    {
        $user = User::factory()->create(['password' => Hash::make('correct')]);

        $this->actingAs($user, 'sanctum')
             ->postJson('/api/profile/change-password', [
                 'current_password'      => 'wrong',
                 'password'              => 'new12345',
                 'password_confirmation' => 'new12345',
             ])
             ->assertUnprocessable();
    }
}
