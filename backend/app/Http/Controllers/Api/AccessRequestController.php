<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccessRequest;
use App\Models\ApprovalRequest;
use App\Models\ApprovalStep;
use App\Models\ApprovalWorkflow;
use App\Models\Estate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

class AccessRequestController extends Controller
{
    public function options(Request $request)
    {
        $user = $request->user()->load(['role', 'estate']);

        $pending = AccessRequest::with(['requestedRole', 'requestedEstate'])
            ->where('user_id', $user->id)
            ->where('status', 'Pending')
            ->latest()
            ->first();

        return response()->json([
            'user' => $user,
            'roles' => Role::where('guard_name', 'web')
                ->where('name', '!=', 'admin')
                ->orderBy('name')
                ->get(),
            'estates' => Estate::orderBy('estate_id')->get(),
            'pending_request' => $pending,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'role_id' => 'required|exists:roles,id',
            'estate_id' => 'required|exists:estates,id',
            'reason' => 'nullable|string|max:1000',
        ]);

        $requestedRole = Role::where('id', $validated['role_id'])
            ->where('guard_name', 'web')
            ->firstOrFail();

        if ($requestedRole->name === 'admin') {
            throw ValidationException::withMessages([
                'role_id' => ['Role admin tidak dapat diajukan melalui request akses.'],
            ]);
        }

        if (
            (int) $user->role_id === (int) $validated['role_id']
            && (int) $user->estate_id === (int) $validated['estate_id']
        ) {
            throw ValidationException::withMessages([
                'role_id' => ['Role dan estate yang diajukan sama dengan akses saat ini.'],
            ]);
        }

        $hasPending = AccessRequest::where('user_id', $user->id)
            ->where('status', 'Pending')
            ->exists();

        if ($hasPending) {
            throw ValidationException::withMessages([
                'role_id' => ['Masih ada request akses yang menunggu approval.'],
            ]);
        }

        return DB::transaction(function () use ($user, $validated) {
            $accessRequest = AccessRequest::create([
                'user_id' => $user->id,
                'current_role_id' => $user->role_id,
                'current_estate_id' => $user->estate_id,
                'requested_role_id' => $validated['role_id'],
                'requested_estate_id' => $validated['estate_id'],
                'status' => 'Pending',
                'reason' => $validated['reason'] ?? null,
            ]);

            $workflow = $this->accessWorkflow();

            ApprovalRequest::create([
                'reference_table' => 'access_requests',
                'reference_id' => $accessRequest->id,
                'workflow_id' => $workflow->id,
                'current_sequence' => 1,
                'status' => 'Pending',
                'requester_id' => $user->id,
            ]);

            return response()->json([
                'message' => 'Request akses berhasil dikirim dan menunggu approval.',
                'data' => $accessRequest->load(['requestedRole', 'requestedEstate']),
            ], 201);
        });
    }

    public function show(Request $request, AccessRequest $accessRequest)
    {
        $user = $request->user();
        $userRoles = $user->roles->pluck('name')->toArray();

        $canView = $accessRequest->user_id === $user->id
            || in_array('admin', $userRoles, true)
            || (
                in_array('estate', $userRoles, true)
                && (int) $accessRequest->requested_estate_id === (int) $user->estate_id
            );

        abort_unless($canView, 403);

        return response()->json([
            'data' => $accessRequest->load([
                'user.role',
                'user.estate',
                'currentRole',
                'currentEstate',
                'requestedRole',
                'requestedEstate',
                'approvalRequests.workflow.steps',
                'approvalRequests.logs.user',
            ]),
        ]);
    }

    private function accessWorkflow(): ApprovalWorkflow
    {
        $workflow = ApprovalWorkflow::firstOrCreate(
            ['module_name' => 'access_requests', 'name' => 'Access Request Approval'],
            [
                'description' => 'Approval perubahan role dan estate user Portal Asset.',
                'is_active' => true,
                'estate_id' => null,
            ]
        );

        ApprovalStep::firstOrCreate(
            ['workflow_id' => $workflow->id, 'sequence' => 1],
            [
                'role_name' => 'estate',
                'action_type' => 'Approver',
            ]
        );

        return $workflow;
    }
}
