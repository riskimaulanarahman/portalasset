<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AssetType extends Model
{
    const CREATED_AT = 'create_date';
    const UPDATED_AT = 'update_date';

    protected $fillable = ['name', 'create_by', 'update_by'];
}
