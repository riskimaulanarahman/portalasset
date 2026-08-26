<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccessRequest extends Model
{
    protected $fillable = [
        'user_id',
        'current_role_id',
        'current_estate_id',
        'requested_role_id',
        'requested_estate_id',
        'status',
        'reason',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function currentRole()
    {
        return $this->belongsTo(\Spatie\Permission\Models\Role::class, 'current_role_id');
    }

    public function currentEstate()
    {
        return $this->belongsTo(Estate::class, 'current_estate_id');
    }

    public function requestedRole()
    {
        return $this->belongsTo(\Spatie\Permission\Models\Role::class, 'requested_role_id');
    }

    public function requestedEstate()
    {
        return $this->belongsTo(Estate::class, 'requested_estate_id');
    }

    public function approvalRequests()
    {
        return $this->morphMany(ApprovalRequest::class, 'reference', 'reference_table', 'reference_id');
    }

    public function getApprovalEstateId(): ?int
    {
        return $this->requested_estate_id ? (int) $this->requested_estate_id : null;
    }
}
