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
        Schema::create('transfers', function (Blueprint $table) {
            $table->id();
            $table->string('transfer_code')->unique();
            $table->enum('type', ['Asset', 'Material']);
            $table->string('from_estate_id')->nullable();
            $table->string('to_estate_id')->nullable();
            $table->enum('status', ['Draft', 'Pending Approval', 'Approved', 'In Transit', 'Received', 'Rejected', 'Cancelled'])->default('Draft');
            $table->dateTime('transfer_date')->nullable();
            $table->dateTime('receive_date')->nullable();
            $table->text('notes')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transfers');
    }
};
