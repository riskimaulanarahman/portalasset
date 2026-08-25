<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('cost_centers', 'estate_id')) {
            Schema::table('cost_centers', function (Blueprint $table) {
                $table->foreignId('estate_id')->nullable()->after('join_estate')->constrained('estates')->nullOnDelete();
            });
        }

        $estates = DB::table('estates')->select('id', 'estate_id')->get()->keyBy('estate_id');

        DB::table('cost_centers')
            ->whereNull('estate_id')
            ->orderBy('id')
            ->get(['id', 'estate', 'join_estate'])
            ->each(function ($costCenter) use ($estates) {
                $estateCode = trim((string) ($costCenter->join_estate ?: $costCenter->estate));
                $estateId = $estates->get($estateCode)?->id;

                if ($estateId) {
                    DB::table('cost_centers')
                        ->where('id', $costCenter->id)
                        ->update(['estate_id' => $estateId]);
                }
            });
    }

    public function down(): void
    {
        if (Schema::hasColumn('cost_centers', 'estate_id')) {
            Schema::table('cost_centers', function (Blueprint $table) {
                $table->dropForeign(['estate_id']);
                $table->dropColumn('estate_id');
            });
        }
    }
};
