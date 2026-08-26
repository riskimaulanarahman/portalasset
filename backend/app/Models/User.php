<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use LdapRecord\Laravel\Auth\LdapAuthenticatable;
use LdapRecord\Laravel\Auth\AuthenticatesWithLdap;

// #7 FIX: SoftDeletes pada User agar user yang dihapus tidak mematikan histori approval
class User extends Authenticatable implements LdapAuthenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, HasRoles, AuthenticatesWithLdap, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'username',
        'password',
        'estate_id',
        'role_id',
        'not_active',
        'access_setup_required',
        'last_access',
        'guid',
        'domain',
    ];

    public function estate()
    {
        return $this->belongsTo(Estate::class, 'estate_id');
    }

    public function role()
    {
        return $this->belongsTo(\Spatie\Permission\Models\Role::class, 'role_id');
    }

    public function assetDepartments(): BelongsToMany
    {
        return $this->belongsToMany(AssetDepartment::class)->withTimestamps();
    }

    public function assetDivisions(): BelongsToMany
    {
        return $this->belongsToMany(AssetDivision::class)->withTimestamps();
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'not_active' => 'boolean',
            'access_setup_required' => 'boolean',
            'last_access' => 'date',
        ];
    }
}
