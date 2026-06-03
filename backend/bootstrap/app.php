<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
        ]);

        $middleware->redirectGuestsTo(fn () => response()->json(['message' => 'Unauthenticated.'], 401));
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\Illuminate\Database\QueryException $e, $request) {
            if ($e->getCode() == '23000' && str_contains($e->getMessage(), '1451')) {
                // Determine the table name from the error message if possible
                $message = 'Cannot delete or update this record because it is being used by another record.';
                
                // Example message: ... a foreign key constraint fails (`portal_asset`.`categories`, CONSTRAINT ...
                if (preg_match('/`([^`]+)`\.`([^`]+)`/', $e->getMessage(), $matches)) {
                    $table = $matches[2];
                    $message = "Cannot delete this data because it is still being used in the '{$table}' table.";
                }

                return response()->json([
                    'message' => $message,
                    'error' => 'Foreign Key Constraint Violation',
                ], 409);
            }
        });
    })->create();
