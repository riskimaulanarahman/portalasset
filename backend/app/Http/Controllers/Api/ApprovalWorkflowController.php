<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApprovalWorkflow;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class ApprovalWorkflowController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-approval-workflows', only: ['index', 'show']),
            new Middleware('permission:create-approval-workflows', only: ['store']),
            new Middleware('permission:edit-approval-workflows', only: ['update']),
            new Middleware('permission:delete-approval-workflows', only: ['destroy']),
        ];
    }

    public function index()
    {
        return response()->json([
            'data' => ApprovalWorkflow::with(['steps', 'estate'])->get()
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'module_name' => 'required|string|max:100',
            'estate_id' => 'nullable|exists:estates,id',
            'is_active' => 'boolean',
            'steps' => 'array',
            'steps.*.sequence' => 'required|integer',
            'steps.*.role_name' => 'required|string',
            'steps.*.action_type' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $workflow = ApprovalWorkflow::create([
                'name' => $validated['name'],
                'module_name' => $validated['module_name'],
                'estate_id' => $validated['estate_id'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            if (!empty($validated['steps'])) {
                foreach ($validated['steps'] as $step) {
                    $workflow->steps()->create([
                        'sequence' => $step['sequence'],
                        'role_name' => $step['role_name'],
                        'action_type' => $step['action_type'] ?? 'Approver',
                    ]);
                }
            }

            DB::commit();
            return response()->json(['message' => 'Workflow created successfully', 'data' => $workflow->load('steps')], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error creating workflow', 'error' => $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        return response()->json([
            'data' => ApprovalWorkflow::with('steps')->findOrFail($id)
        ]);
    }

    public function update(Request $request, $id)
    {
        $workflow = ApprovalWorkflow::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'module_name' => 'required|string|max:100',
            'estate_id' => 'nullable|exists:estates,id',
            'is_active' => 'boolean',
            'steps' => 'array',
            'steps.*.sequence' => 'required|integer',
            'steps.*.role_name' => 'required|string',
            'steps.*.action_type' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $workflow->update([
                'name' => $validated['name'],
                'module_name' => $validated['module_name'],
                'estate_id' => $validated['estate_id'] ?? $workflow->estate_id,
                'is_active' => $validated['is_active'] ?? $workflow->is_active,
            ]);

            if (isset($validated['steps'])) {
                // Remove old steps and recreate
                $workflow->steps()->delete();
                foreach ($validated['steps'] as $step) {
                    $workflow->steps()->create([
                        'sequence' => $step['sequence'],
                        'role_name' => $step['role_name'],
                        'action_type' => $step['action_type'] ?? 'Approver',
                    ]);
                }
            }

            DB::commit();
            return response()->json(['message' => 'Workflow updated successfully', 'data' => $workflow->load('steps')]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error updating workflow', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $workflow = ApprovalWorkflow::findOrFail($id);
        $workflow->delete();

        return response()->json(['message' => 'Workflow deleted successfully']);
    }

    public function checkWorkflow(Request $request)
    {
        $request->validate([
            'module_name' => 'required|string',
            'estate_id' => 'nullable|exists:estates,id',
        ]);

        $workflow = ApprovalWorkflow::where('module_name', $request->module_name)
            ->where('is_active', true)
            ->where('estate_id', $request->estate_id)
            ->first();

        if (!$workflow) {
            $workflow = ApprovalWorkflow::where('module_name', $request->module_name)
                ->where('is_active', true)
                ->whereNull('estate_id')
                ->first();
        }

        return response()->json([
            'exists' => !!$workflow,
            'workflow' => $workflow
        ]);
    }
}
