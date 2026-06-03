<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApprovalRequest extends Model
{
    protected $fillable = [
        'reference_table',
        'reference_id',
        'workflow_id',
        'current_sequence',
        'status',
        'requester_id',
    ];

    public function workflow()
    {
        return $this->belongsTo(ApprovalWorkflow::class, 'workflow_id');
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function logs()
    {
        return $this->hasMany(ApprovalLog::class, 'approval_request_id')->orderBy('created_at', 'desc');
    }

    public function reference()
    {
        return $this->morphTo(null, 'reference_table', 'reference_id');
    }
}
