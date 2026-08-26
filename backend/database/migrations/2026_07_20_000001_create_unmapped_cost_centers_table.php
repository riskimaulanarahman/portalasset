<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unmapped_cost_centers', function (Blueprint $table) {
            $table->id();
            $table->string('cost_center', 100)->unique();
            $table->string('employee_sap_id', 50)->nullable();
            $table->string('employee_name', 100)->nullable();
            $table->string('login_name', 50)->nullable();
            $table->string('source', 30)->default('erp_login');
            $table->string('status', 20)->default('pending');
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['status', 'last_seen_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unmapped_cost_centers');
    }
};
