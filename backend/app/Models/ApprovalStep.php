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
}
