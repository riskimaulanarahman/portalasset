<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Anggota;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required',
            'password' => 'required',
        ]);

        $credentials = [
            'username' => $request->username,
            'password' => $request->password,
        ];

        // First: Check local database
        $user = User::where('username', $request->username)->first();
        if ($user && Hash::check($request->password, $user->password)) {
            return $this->respondWithToken($user);
        }

        // Second: Try LDAP authentication
        try {
            if (Auth::attempt($credentials)) {
                $user = Auth::user();

                // Validasi: username harus terdaftar di anggotas.login_name dan masih aktif
                $isRegisteredMember = Anggota::where('login_name', $request->username)
                    ->where('not_active', false)
                    ->exists();

                if (!$isRegisteredMember) {
                    Auth::logout();
                    throw ValidationException::withMessages([
                        'username' => ['Akun tidak terdaftar sebagai anggota aktif.'],
                    ]);
                }

                // Sync password to local database if it matches the credentials
                // and is different from the current local password
                if (!Hash::check($request->password, $user->password)) {
                    $user->password = Hash::make($request->password);
                    $user->save();
                }

                return $this->respondWithToken($user);
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            // LDAP connection error or other exception
        }

        throw ValidationException::withMessages([
            'username' => ['User tidak ditemukan atau belum aktif'],
        ]);
    }

    protected function respondWithToken($user)
    {
        if ($user->not_active) {
            Auth::logout();
            throw ValidationException::withMessages([
                'username' => ['User tidak ditemukan atau belum aktif'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;
        $permissions = $user->getAllPermissions()->pluck('name')->values();

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->load(['role', 'estate']),
            'permissions' => $permissions,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load(['role', 'estate']);

        return response()->json([
            'user' => $user,
            'permissions' => $user->getAllPermissions()->pluck('name')->values(),
        ]);
    }

    /**
     * #14 FIX: User mengubah password sendiri dengan verifikasi password lama.
     *
     * POST /api/profile/change-password
     * Body: { current_password, password, password_confirmation }
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'password'         => 'required|string|min:8|confirmed',
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Password saat ini tidak sesuai.'],
            ]);
        }

        $user->update(['password' => Hash::make($request->password)]);

        // Cabut semua token lama agar user login ulang
        $user->tokens()->delete();

        return response()->json(['message' => 'Password berhasil diubah. Silakan login kembali.']);
    }

    /**
     * #14 FIX: Admin mereset password user lain.
     *
     * POST /api/password/reset-by-admin
     * Body: { user_id, password, password_confirmation }
     * Hak akses: role admin atau permission edit-users
     */
    public function resetPasswordByAdmin(Request $request)
    {
        /** @var \App\Models\User $actor */
        $actor = $request->user();

        if (!$actor->hasRole('admin') && !$actor->hasPermissionTo('edit-users')) {
            abort(403, 'Hanya admin yang dapat mereset password user lain.');
        }

        $request->validate([
            'user_id'  => 'required|exists:users,id',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $target = User::findOrFail($request->user_id);
        $target->update(['password' => Hash::make($request->password)]);

        // Cabut semua token target agar harus login ulang
        $target->tokens()->delete();

        return response()->json(['message' => "Password user '{$target->name}' berhasil direset."]);
    }
}
