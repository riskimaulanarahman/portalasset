<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApprovalStep extends Model
{
    protected $fillable = [
        'workflow_id',
        'sequence',
        'role_id',
        'role_name',
        'user_id',
        'action_type',
    ];

    public function workflow()
    {
        return $this->belongsTo(ApprovalWorkflow::class, 'workflow_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function getEmailRecipients(?int $estateId = null): array
    {
        if ($this->user_id) {
            $user = User::where('id', $this->user_id)
                ->where('not_active', false)
                ->first();
            return ($user && $user->email) ? [$user->email] : [];
        }

        if ($this->role_name) {
            $query = User::role($this->role_name)->where('not_active', false);
            if ($estateId) {
                $query->where('estate_id', $estateId);
            }
            return $query->pluck('email')->filter()->values()->toArray();
        }

        return [];
    }
}
