<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SectionController;
use App\Http\Controllers\Api\EstateController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\MaterialController;
use App\Http\Controllers\Api\MaterialStockOpnameController;
use App\Http\Controllers\Api\AssetRegController;
use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\AssetDepartmentController;
use App\Http\Controllers\Api\AssetDivisionController;
use App\Http\Controllers\Api\AnggotaController;
use App\Http\Controllers\Api\AnggotaSyncController;
use App\Http\Controllers\Api\CostCenterController;
use App\Http\Controllers\Api\UnmappedCostCenterController;
use App\Http\Controllers\Api\ManufacturerController;
use App\Http\Controllers\Api\AssetTypeController;
use App\Http\Controllers\Api\UnitController;
use App\Http\Controllers\Api\VendorController;
use App\Http\Controllers\Api\TransConditionController;
use App\Http\Controllers\Api\TransMaintenanceController;
use App\Http\Controllers\Api\WriteOffController;
use App\Http\Controllers\Api\DataResetController;
use App\Http\Controllers\Api\UserActivationController;
use App\Http\Controllers\Api\ProfileEstateController;

// #3 FIX: Rate limiting — 5 percobaan per menit per IP
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/profile/estate-options', [ProfileEstateController::class, 'options']);
    Route::post('/profile/estate', [ProfileEstateController::class, 'update']);
    Route::get('/access-request/options', [\App\Http\Controllers\Api\AccessRequestController::class, 'options']);
    Route::post('/access-requests', [\App\Http\Controllers\Api\AccessRequestController::class, 'store']);
    Route::get('/access-requests/{accessRequest}', [\App\Http\Controllers\Api\AccessRequestController::class, 'show']);

    // #2 FIX: Queue endpoint diproteksi — hanya admin yang bisa trigger
    Route::get('/process-queue', function () {
        abort_unless(auth()->user()->hasRole('admin'), 403, 'Unauthorized: hanya admin yang dapat memicu queue.');
        \Illuminate\Support\Facades\Artisan::call('queue:work', ['--stop-when-empty' => true]);
        return response()->json(['message' => 'Queue processed', 'output' => \Illuminate\Support\Facades\Artisan::output()]);
    });

    // Dashboard
    Route::get('/dashboard', [\App\Http\Controllers\Api\DashboardController::class, 'getStats']);

    // Master Data
    Route::apiResource('sections', SectionController::class);
    Route::apiResource('estates', EstateController::class);
    Route::apiResource('business-units', \App\Http\Controllers\Api\BusinessUnitController::class);
    Route::apiResource('categories', CategoryController::class);
    Route::get('materials/generate-code', [MaterialController::class, 'generateCode']);
    Route::apiResource('materials', MaterialController::class);
    Route::apiResource('asset-departments', AssetDepartmentController::class);
    Route::apiResource('asset-divisions', AssetDivisionController::class);
    Route::apiResource('asset-regs', AssetRegController::class);
    Route::post('anggotas/sync', [AnggotaSyncController::class, 'sync']);
    Route::apiResource('anggotas', AnggotaController::class)->only(['index', 'show']);
    Route::get('unmapped-cost-centers', [UnmappedCostCenterController::class, 'index']);
    Route::get('unmapped-cost-centers/{unmappedCostCenter}', [UnmappedCostCenterController::class, 'show']);
    Route::post('unmapped-cost-centers/{unmappedCostCenter}/resolve', [UnmappedCostCenterController::class, 'resolve']);
    Route::get('user-activations', [UserActivationController::class, 'index']);
    Route::post('user-activations/{user}/activate', [UserActivationController::class, 'activate']);
    Route::post('user-activations/{user}/deactivate', [UserActivationController::class, 'deactivate']);
    Route::apiResource('cost-centers', CostCenterController::class);
    Route::apiResource('manufacturers', ManufacturerController::class);
    Route::apiResource('asset-types', AssetTypeController::class);
    Route::apiResource('units', UnitController::class);
    Route::apiResource('vendors', VendorController::class);

    // Asset Management
    Route::get('assets/generate-reg-id', [AssetController::class, 'generateRegId']);
    Route::post('assets/{asset}/report-damage', [AssetController::class, 'reportDamage']);
    Route::post('assets/{asset}/assign-member', [AssetController::class, 'assignMember']);
    Route::apiResource('assets', AssetController::class);

    // Asset Conditions & Maintenance
    Route::apiResource('asset-conditions', TransConditionController::class)->except(['show']);
    Route::apiResource('asset-maintenances', TransMaintenanceController::class);

    // Write-Off
    Route::get('write-offs', [WriteOffController::class, 'index']);
    Route::post('write-offs', [WriteOffController::class, 'store']);
    Route::get('write-offs/{id}', [WriteOffController::class, 'show']);
    Route::post('write-offs/{id}/cancel', [WriteOffController::class, 'cancel']);
    Route::get('write-offs/{id}/berita-acara', [WriteOffController::class, 'downloadBeritaAcara']);

    // Material Transactions
    Route::get('material-stock-opnames/{materialStockOpname}/export', [MaterialStockOpnameController::class, 'export']);
    Route::get('material-stock-opnames/{materialStockOpname}/berita-acara', [MaterialStockOpnameController::class, 'downloadBeritaAcara']);
    Route::post('material-stock-opnames/{materialStockOpname}/generate-items', [MaterialStockOpnameController::class, 'generateItems']);
    Route::post('material-stock-opnames/{materialStockOpname}/start-counting', [MaterialStockOpnameController::class, 'startCounting']);
    Route::put('material-stock-opnames/{materialStockOpname}/items/{item}/count', [MaterialStockOpnameController::class, 'countItem']);
    Route::post('material-stock-opnames/{materialStockOpname}/bulk-counts', [MaterialStockOpnameController::class, 'bulkCounts']);
    Route::post('material-stock-opnames/{materialStockOpname}/import-counts', [MaterialStockOpnameController::class, 'importCounts']);
    Route::post('material-stock-opnames/{materialStockOpname}/items/{item}/mark-recount', [MaterialStockOpnameController::class, 'markRecount']);
    Route::post('material-stock-opnames/{materialStockOpname}/submit-review', [MaterialStockOpnameController::class, 'submitReview']);
    Route::post('material-stock-opnames/{materialStockOpname}/submit-approval', [MaterialStockOpnameController::class, 'submitApproval']);
    Route::post('material-stock-opnames/{materialStockOpname}/cancel', [MaterialStockOpnameController::class, 'cancel']);
    Route::apiResource('material-stock-opnames', MaterialStockOpnameController::class)
        ->parameters(['material-stock-opnames' => 'materialStockOpname'])
        ->except(['destroy']);
    Route::apiResource('transactions', \App\Http\Controllers\Api\TransactionController::class);

    // Administration
    Route::apiResource('users', \App\Http\Controllers\Api\UserController::class);
    Route::apiResource('roles', \App\Http\Controllers\Api\RoleController::class);
    Route::get('approval-workflows/check', [\App\Http\Controllers\Api\ApprovalWorkflowController::class, 'checkWorkflow']);
    Route::apiResource('approval-workflows', \App\Http\Controllers\Api\ApprovalWorkflowController::class);
    
    // System Settings
    Route::get('settings', [\App\Http\Controllers\Api\SettingController::class, 'index']);
    Route::post('settings/bulk', [\App\Http\Controllers\Api\SettingController::class, 'updateBulk']);

    // Transfers & Approvals
    Route::apiResource('transfers', \App\Http\Controllers\Api\TransferController::class);
    Route::get('transfers/{id}/berita-acara', [\App\Http\Controllers\Api\TransferController::class, 'downloadBeritaAcara']);
    Route::post('transfers/{id}/cancel', [\App\Http\Controllers\Api\TransferController::class, 'cancel']); // #18 FIX
    Route::get('approvals/my-approvals', [\App\Http\Controllers\Api\ApprovalController::class, 'myApprovals']);
    Route::post('approvals/{id}/approve', [\App\Http\Controllers\Api\ApprovalController::class, 'approve']);
    Route::post('approvals/{id}/reject', [\App\Http\Controllers\Api\ApprovalController::class, 'reject']);

    // #16 FIX: Global search
    Route::get('search', [\App\Http\Controllers\Api\SearchController::class, 'search']);

    // #14 FIX: Password management
    Route::post('profile/change-password', [\App\Http\Controllers\Api\AuthController::class, 'changePassword']);
    Route::post('password/reset-by-admin', [\App\Http\Controllers\Api\AuthController::class, 'resetPasswordByAdmin']);

    // Reset Data UAT (admin only)
    Route::get('admin/data-reset/preview', [DataResetController::class, 'preview']);
    Route::post('admin/data-reset', [DataResetController::class, 'execute']);
});
