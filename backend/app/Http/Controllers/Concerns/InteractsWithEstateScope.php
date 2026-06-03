<?php

namespace App\Http\Controllers\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;

trait InteractsWithEstateScope
{
    protected function authUser(): User
    {
        /** @var User $user */
        $user = Auth::user();
        $user->loadMissing('estate');

        return $user;
    }

    protected function currentEstateId(): ?int
    {
        return $this->authUser()->estate_id ? (int) $this->authUser()->estate_id : null;
    }

    protected function currentEstateCode(): ?string
    {
        return $this->authUser()->estate?->estate_id;
    }

    protected function isHeadOfficeUser(): bool
    {
        return $this->currentEstateCode() === 'HO';
    }

    protected function currentBusinessUnitId(): ?int
    {
        $buId = $this->authUser()->estate?->business_unit_id;
        return $buId ? (int) $buId : null;
    }

    protected function applyEstateScope(Builder $query, string $column = 'estate_id', ?int $estateId = null): Builder
    {
        if ($this->isHeadOfficeUser()) {
            if ($estateId) {
                $query->where($column, $estateId);
            }

            return $query;
        }

        $query->where($column, $estateId ?? $this->currentEstateId());

        return $query;
    }

    protected function ensureEstateAccess(?int $estateId): void
    {
        if ($this->isHeadOfficeUser() || !$estateId) {
            return;
        }

        abort_if($estateId !== $this->currentEstateId(), 404);
    }
}
