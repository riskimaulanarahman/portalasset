<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Asset;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

trait InteractsWithAssetOwnershipScope
{
    use InteractsWithEstateScope;

    protected function canBypassAssetOwnership(?User $user = null): bool
    {
        $user ??= $this->authUser();

        return $user->hasRole('admin') || $this->isHeadOfficeUser();
    }

    protected function applyAssetVisibilityScope(Builder $query, ?int $estateId = null): Builder
    {
        $this->applyAssetEstateScope($query, $estateId);

        if ($this->canBypassAssetOwnership()) {
            return $query;
        }

        $user = $this->authUser();
        $departmentIds = $user->assetDepartments()->pluck('asset_departments.id')->all();
        $divisionIds = $user->assetDivisions()->pluck('asset_divisions.id')->all();

        if (empty($departmentIds) && empty($divisionIds)) {
            return $query->whereRaw('1 = 0');
        }

        return $query->where(function (Builder $owned) use ($departmentIds, $divisionIds) {
            if (!empty($departmentIds)) {
                $owned->whereIn('asset_department_id', $departmentIds);
            }

            if (!empty($divisionIds)) {
                $method = !empty($departmentIds) ? 'orWhereIn' : 'whereIn';
                $owned->{$method}('asset_division_id', $divisionIds);
            }
        });
    }

    protected function applyAssetEstateScope(Builder $query, ?int $estateId = null): Builder
    {
        $effectiveEstateId = $this->isHeadOfficeUser()
            ? $estateId
            : ($estateId ?? $this->currentEstateId());

        if (!$effectiveEstateId) {
            return $query;
        }

        $estateCode = null;
        if ($this->isHeadOfficeUser() && $estateId) {
            $estateCode = \App\Models\Estate::whereKey($estateId)->value('estate_id');
        } else {
            $estateCode = $this->currentEstateCode();
        }

        return $query->where(function (Builder $scoped) use ($effectiveEstateId, $estateCode) {
            $scoped->where('estate_id', $effectiveEstateId);

            if ($estateCode) {
                $scoped->orWhere(function (Builder $legacy) use ($estateCode) {
                    $legacy->whereNull('estate_id')
                        ->where('unit_id', $estateCode);
                });
            }
        });
    }

    protected function ensureAssetVisibility(Asset $asset): void
    {
        abort_unless(
            $this->applyAssetVisibilityScope(Asset::whereKey($asset->getKey()))->exists(),
            404
        );
    }

    protected function userNeedsAssetOwnershipSetup(?User $user = null): bool
    {
        $user ??= $this->authUser();

        if ($this->canBypassAssetOwnership($user)) {
            return false;
        }

        return !$user->assetDepartments()->exists() && !$user->assetDivisions()->exists();
    }
}
