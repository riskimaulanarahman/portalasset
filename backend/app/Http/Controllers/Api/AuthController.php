<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Anggota;
use App\Models\TblEmployee;
use App\Models\User;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required',
            'password' => 'required',
        ]);

        $ldapCredentials = [
            'samaccountname' => $request->username,
            'password' => $request->password,
        ];

        $localUser = User::where('username', $request->username)->first();

        if (
            $localUser
            && Hash::check($request->password, $localUser->password)
            && $this->canUseLocalPortalPassword($localUser, $request->username)
        ) {
            return $this->respondWithToken($localUser);
        }

        $databaseFallback = config('auth.providers.users.database_fallback');
        Config::set('auth.providers.users.database_fallback', false);

        try {
            if (Auth::attempt($ldapCredentials)) {
                $user = Auth::user();

                $this->prepareLdapPortalUser($user, $localUser === null);
                $this->syncAnggotaFromErp($request->username);

                return $this->respondWithToken($user);
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::warning('LDAP login attempt failed.', [
                'username' => $request->username,
                'error' => $e->getMessage(),
            ]);
        } finally {
            Config::set('auth.providers.users.database_fallback', $databaseFallback);
        }

        if ($localUser) {
            throw ValidationException::withMessages([
                'password' => ['Password salah.'],
            ]);
        }

        throw ValidationException::withMessages([
            'username' => ['User tidak ditemukan atau belum aktif'],
        ]);
    }

    protected function canUseLocalPortalPassword(User $user, string $username): bool
    {
        if ($user->not_active) {
            return false;
        }

        $domain = trim((string) $user->domain);
        $guid = trim((string) $user->guid);

        if ($domain === 'seed') {
            return true;
        }

        if ($domain === 'uat' && str_starts_with($username, 'uat_')) {
            return true;
        }

        $existsInErp = $this->employeeExistsInErp($username);

        if ($domain === 'local') {
            return $existsInErp === false;
        }

        if ($domain !== '' || $guid !== '') {
            return false;
        }

        return $existsInErp === false;
    }

    protected function employeeExistsInErp(string $username): ?bool
    {
        try {
            return TblEmployee::where('LoginName', $username)->exists();
        } catch (\Throwable $e) {
            Log::warning('Unable to verify employee existence in ERP during local login check.', [
                'username' => $username,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    protected function prepareLdapPortalUser(User $user, bool $isFirstPortalLogin): void
    {
        $updates = [];

        if ($isFirstPortalLogin) {
            $updates['not_active'] = true;
            $updates['role_id'] = null;
            $updates['estate_id'] = null;
            $updates['access_setup_required'] = false;
        }

        if (!trim((string) $user->domain)) {
            $updates['domain'] = 'ldap';
        }

        if ($updates) {
            $user->forceFill($updates)->save();
        }

        if ($user->not_active) {
            $user->syncRoles([]);
            $user->unsetRelation('roles');
        }
    }

    protected function syncAnggotaFromErp(string $username): ?TblEmployee
    {
        try {
            $employee = TblEmployee::with('department')->where('LoginName', $username)->first();
        } catch (\Throwable $e) {
            Log::warning('Unable to sync anggota from ERP during LDAP login.', [
                'username' => $username,
                'error' => $e->getMessage(),
            ]);

            return null;
        }

        if (!$employee || !trim((string) $employee->SAPID)) {
            Log::warning('LDAP user has no matching ERP employee during login.', [
                'username' => $username,
            ]);

            return null;
        }

        $notActive = ((string) $employee->isTerminate === '1') || ((string) $employee->isActive !== '1');

        $department = $employee->departmentName();

        Anggota::updateOrCreate(
            ['sap_id' => trim((string) $employee->SAPID)],
            [
                'login_name'      => $employee->LoginName ? mb_substr(trim((string) $employee->LoginName), 0, 50) : null,
                'nama'            => $employee->FullName ? mb_substr((string) $employee->FullName, 0, 100) : null,
                'supervisor'      => $employee->superiorName ? mb_substr((string) $employee->superiorName, 0, 100) : null,
                'company_code'    => $employee->companycode ? mb_substr(trim((string) $employee->companycode), 0, 10) : null,
                'cost_center'     => $employee->CostCenter ? mb_substr(trim((string) $employee->CostCenter), 0, 100) : null,
                'department'      => $department ? mb_substr(trim($department), 0, 100) : null,
                'contract_status' => $employee->contract_status ? mb_substr(trim((string) $employee->contract_status), 0, 15) : null,
                'join_date'       => $employee->JoinDate,
                'gender'          => $employee->Gender ? mb_substr(trim((string) $employee->Gender), 0, 10) : null,
                'not_active'      => $notActive,
                'create_by'       => 'ldap_login',
                'update_by'       => 'ldap_login',
            ]
        );

        return $employee;
    }

    protected function nullableSubstring($value, int $limit): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : mb_substr($value, 0, $limit);
    }

    protected function respondWithToken($user)
    {
        $this->syncPrimaryRole($user);

        $token = $user->createToken('auth_token')->plainTextToken;
        $permissions = $user->not_active
            ? collect()
            : $user->getAllPermissions()->pluck('name')->values();

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->fresh()->load(['role', 'estate', 'assetDepartments', 'assetDivisions.department']),
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
        $user = $request->user()->load(['role', 'estate', 'assetDepartments', 'assetDivisions.department']);
        $this->syncPrimaryRole($user);

        $permissions = $user->not_active
            ? collect()
            : $user->getAllPermissions()->pluck('name')->values();

        return response()->json([
            'user' => $user,
            'permissions' => $permissions,
        ]);
    }

    protected function syncPrimaryRole(User $user): void
    {
        if ($user->not_active) {
            return;
        }

        $role = $user->role;
        if (!$role) {
            return;
        }

        if (!$user->roles->contains('id', $role->id)) {
            $user->syncRoles([$role]);
            $user->unsetRelation('roles');
        }
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
