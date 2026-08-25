<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TblDepartment extends Model
{
    protected $connection = 'erp';
    protected $table = 'employee.tbl_department';
    protected $primaryKey = 'id';
    public $timestamps = false;
    public $incrementing = true;

    public function displayName(): ?string
    {
        foreach (['department', 'DepartmentName', 'name', 'Name'] as $column) {
            $value = trim((string) $this->getAttribute($column));

            if ($value !== '') {
                return $value;
            }
        }

        return null;
    }
}
