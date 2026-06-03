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
        Schema::create('email_records', function (Blueprint $table) {
            $table->id();
            $table->text('from_')->nullable();
            $table->text('to_')->nullable();
            $table->text('cc_')->nullable();
            $table->text('subject_')->nullable();
            $table->text('body_')->nullable();
            $table->tinyInteger('status')->default(0)->comment('0=pending, 1=sent, 2=failed');
            $table->string('created_by', 15);
            $table->dateTime('created_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_records');
    }
};
