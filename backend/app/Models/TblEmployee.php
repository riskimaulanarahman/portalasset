<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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
}
