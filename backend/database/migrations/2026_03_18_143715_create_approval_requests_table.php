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
        Schema::create('approval_requests', function (Blueprint $table) {
            $table->id();
            $table->string('reference_table'); // e.g., 'transfers'
            $table->unsignedBigInteger('reference_id');
            $table->foreignId('workflow_id')->constrained('approval_workflows')->cascadeOnDelete();
            $table->integer('current_sequence')->default(1);
            $table->enum('status', ['Pending', 'Approved', 'Rejected', 'Cancelled'])->default('Pending');
            $table->foreignId('requester_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            
            $table->index(['reference_table', 'reference_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('approval_requests');
    }
};
