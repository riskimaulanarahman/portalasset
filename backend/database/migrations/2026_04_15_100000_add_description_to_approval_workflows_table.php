<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('approval_workflows', 'description')) {
            return;
        }

        Schema::table('approval_workflows', function (Blueprint $table) {
            $table->text('description')->nullable()->after('module_name')->default(null);
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('approval_workflows', 'description')) {
            return;
        }

        Schema::table('approval_workflows', function (Blueprint $table) {
            $table->dropColumn('description');
        });
    }
};
