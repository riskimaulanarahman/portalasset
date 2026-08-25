<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssetDepartment extends Model
{
    protected $fillable = [
        'code',
        'name',
        'not_active',
    ];

    protected function casts(): array
    {
        return [
            'not_active' => 'boolean',
        ];
    }

    public function divisions(): HasMany
    {
        return $this->hasMany(AssetDivision::class);
    }

    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withTimestamps();
    }
}
