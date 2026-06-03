<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class SettingController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:edit-settings', only: ['updateBulk']),
        ];
    }

    /**
     * Display a listing of the settings.
     */
    public function index()
    {
        $settings = Setting::all()->mapWithKeys(function ($item) {
            $value = $item->value;
            if ($item->type === 'boolean') $value = filter_var($value, FILTER_VALIDATE_BOOLEAN);
            if ($item->type === 'json') $value = json_decode($value, true);
            
            return [$item->key => [
                'value' => $value,
                'group' => $item->group,
                'type' => $item->type
            ]];
        });

        return response()->json(['data' => $settings]);
    }

    /**
     * Update/Save multiple settings at once.
     */
    public function updateBulk(Request $request)
    {
        $validated = $request->validate([
            'settings' => 'required|array',
        ]);

        foreach ($validated['settings'] as $key => $data) {
            $value = $data['value'] ?? null;
            $type = $data['type'] ?? 'string';
            $group = $data['group'] ?? 'general';

            Setting::set($key, $value, $type, $group);
        }

        return response()->json([
            'message' => 'Settings updated successfully',
            'data' => Setting::all()
        ]);
    }

    /**
     * Get a single setting value.
     */
    public function show($key)
    {
        return response()->json([
            'key' => $key,
            'value' => Setting::get($key)
        ]);
    }
}
