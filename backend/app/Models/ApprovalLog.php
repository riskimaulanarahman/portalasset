<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApprovalLog extends Model
{
    protected $fillable = [
        'approval_request_id',
        'sequence',
        'user_id',
        'action',
        'comment',
    ];

    public function request()
    {
        return $this->belongsTo(ApprovalRequest::class, 'approval_request_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
