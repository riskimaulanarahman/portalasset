<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_departments', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->nullable();
            $table->string('name', 100);
            $table->boolean('not_active')->default(false);
            $table->timestamps();

            $table->unique('name');
            $table->index('code');
        });

        Schema::create('asset_divisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_department_id')->constrained('asset_departments')->noActionOnDelete();
            $table->string('code', 30)->nullable();
            $table->string('name', 100);
            $table->boolean('not_active')->default(false);
            $table->timestamps();

            $table->unique(['asset_department_id', 'name']);
            $table->index('code');
        });

        Schema::table('assets', function (Blueprint $table) {
            $table->foreignId('asset_department_id')->nullable()->constrained('asset_departments')->nullOnDelete();
            $table->foreignId('asset_division_id')->nullable()->constrained('asset_divisions')->nullOnDelete();
        });

        Schema::create('asset_department_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('asset_department_id')->constrained('asset_departments')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'asset_department_id']);
        });

        Schema::create('asset_division_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('asset_division_id')->constrained('asset_divisions')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'asset_division_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_division_user');
        Schema::dropIfExists('asset_department_user');

        Schema::table('assets', function (Blueprint $table) {
            $table->dropForeign(['asset_division_id']);
            $table->dropForeign(['asset_department_id']);
            $table->dropColumn(['asset_division_id', 'asset_department_id']);
        });

        Schema::dropIfExists('asset_divisions');
        Schema::dropIfExists('asset_departments');
    }
};
