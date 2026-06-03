<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class CategoryController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-categories', only: ['index', 'show']),
            new Middleware('permission:create-categories', only: ['store']),
            new Middleware('permission:edit-categories', only: ['update']),
            new Middleware('permission:delete-categories', only: ['destroy']),
        ];
    }
    public function index()
    {
        $categories = Category::with('section')->get();
        return response()->json(['data' => $categories]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category' => 'required|max:100',
            'section_id' => 'required|exists:sections,id',
            'not_active' => 'boolean',
        ]);

        $validated['create_by'] = Auth::user()->username ?? 'system';
        
        $category = Category::create($validated);
        return response()->json(['message' => 'Category created successfully', 'data' => $category], 201);
    }

    public function show(Category $category)
    {
        return response()->json(['data' => $category->load('section')]);
    }

    public function update(Request $request, Category $category)
    {
        $validated = $request->validate([
            'category' => 'sometimes|required|max:100',
            'section_id' => 'sometimes|required|exists:sections,id',
            'not_active' => 'boolean',
        ]);

        $validated['update_by'] = Auth::user()->username ?? 'system';

        $category->update($validated);
        return response()->json(['message' => 'Category updated successfully', 'data' => $category]);
    }

    public function destroy(Category $category)
    {
        $category->delete();
        return response()->json(['message' => 'Category deleted successfully']);
    }
}
