<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TblEmployee extends Model
{
    protected $connection = 'erp';
    protected $table = 'employee.tbl_employee';
    protected $primaryKey = 'id';
    public $timestamps = false;
    public $incrementing = true;

    protected $casts = [
        'BirthOfDate' => 'date',
        'JoinDate'    => 'date',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(TblDepartment::class, 'department_id', 'id');
    }

    public function departmentName(): ?string
    {
        $department = $this->relationLoaded('department')
            ? $this->getRelation('department')
            : $this->department()->first();

        return $department?->displayName();
    }
}
