<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Section;
use Illuminate\Http\Request;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class SectionController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-sections', only: ['index', 'show']),
            new Middleware('permission:create-sections', only: ['store']),
            new Middleware('permission:edit-sections', only: ['update']),
            new Middleware('permission:delete-sections', only: ['destroy']),
        ];
    }
    public function index()
    {
        $sections = Section::all();
        return response()->json(['data' => $sections]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'section' => 'required|max:25',
            'section_full' => 'nullable|max:50',
            'keterangan' => 'nullable|max:25',
            'not_active' => 'boolean',
        ]);

        $section = Section::create($validated);
        return response()->json(['message' => 'Section created successfully', 'data' => $section], 201);
    }

    public function show(Section $section)
    {
        return response()->json(['data' => $section->load('categories')]);
    }

    public function update(Request $request, Section $section)
    {
        $validated = $request->validate([
            'section' => 'sometimes|required|max:25',
            'section_full' => 'nullable|max:50',
            'keterangan' => 'nullable|max:25',
            'not_active' => 'boolean',
        ]);

        $section->update($validated);
        return response()->json(['message' => 'Section updated successfully', 'data' => $section]);
    }

    public function destroy(Section $section)
    {
        $section->delete();
        return response()->json(['message' => 'Section deleted successfully']);
    }
}
