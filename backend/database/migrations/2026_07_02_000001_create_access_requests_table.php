<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'access_setup_required')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('access_setup_required')->default(false)->after('not_active');
            });
        }

        Schema::create('access_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('current_role_id')->nullable()->constrained('roles')->nullOnDelete();
            $table->foreignId('current_estate_id')->nullable()->constrained('estates')->nullOnDelete();
            $table->foreignId('requested_role_id')->constrained('roles')->noActionOnDelete();
            $table->foreignId('requested_estate_id')->constrained('estates')->noActionOnDelete();
            $table->enum('status', ['Pending', 'Approved', 'Rejected', 'Cancelled'])->default('Pending');
            $table->text('reason')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('access_requests');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('access_setup_required');
        });
    }
};
