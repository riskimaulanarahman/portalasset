<?php

namespace App\Providers;

use App\Models\AccessRequest;
use App\Models\MaterialStockOpname;
use App\Models\Transfer;
use Illuminate\Support\ServiceProvider;
use Illuminate\Database\Eloquent\Relations\Relation;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Relation::morphMap([
            'access_requests' => AccessRequest::class,
            'material_stock_opnames' => MaterialStockOpname::class,
            'transfers' => Transfer::class,
        ]);

        \Illuminate\Support\Facades\Gate::before(function ($user, $ability) {
            return $user->hasRole('admin') ? true : null;
        });
    }
}
