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
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('role_id')->nullable()->after('estate_id');

            // Drop legacy columns
            $table->dropColumn(['access_list', 'view_list', 'access_edit', 'email2']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role_id');

            $table->text('access_list')->nullable();
            $table->text('view_list')->nullable();
            $table->integer('access_edit')->default(0);
            $table->string('email2')->nullable();
        });
    }
};
