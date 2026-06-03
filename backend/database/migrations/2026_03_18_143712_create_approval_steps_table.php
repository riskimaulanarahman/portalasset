<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('approval_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workflow_id')->constrained('approval_workflows')->cascadeOnDelete();
            $table->integer('sequence');
            $table->foreignId('role_id')->nullable(); // Depending on if spatie/laravel-permission is used. Or string.
            $table->string('role_name')->nullable(); // Using role name might be easier
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('action_type', ['Reviewer', 'Approver', 'Acknowledgment'])->default('Approver');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('approval_steps');
    }
};
