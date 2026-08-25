<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendWriteOffBeritaAcaraJob;
use App\Mail\ApprovalPendingMail;
use App\Mail\TransferRejectedMail;
use App\Mail\WriteOffRejectedMail;
use App\Models\AccessRequest;
use App\Models\ApprovalLog;
use App\Models\ApprovalRequest;
use App\Models\User;
use App\Services\MaterialStockOpnameService;
use App\Services\MaterialTransferService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Spatie\Permission\Models\Role;

class ApprovalController extends Controller
{
    public function __construct(
        private MaterialTransferService $materialTransferService,
        private MaterialStockOpnameService $materialStockOpnameService
    )
    {
    }

    public function myApprovals()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Get user roles (assuming spatie/laravel-permission or similar setup)
        // If not using Spatie, we fall back to a comma separated list or similar depending on the existing system.
        // I will use $user->roles->pluck('name') if it exists, otherwise just check by user_id for now as fallback.
        $userRoles = method_exists($user, 'roles') ? $user->roles->pluck('name')->toArray() : [];

        $pendingRequests = ApprovalRequest::with(['workflow.steps', 'workflow.estate', 'reference', 'requester'])
            ->where('status', 'Pending')
            ->get()
            ->filter(function ($req) use ($user, $userRoles) {
                // Ensure user is active
                if ($user->not_active) return false;

                if ($req->reference_table === 'access_requests') {
                    return $this->canApproveAccessRequest($req, $user, $userRoles);
                }

                // Find the step corresponding to the current sequence
                $currentStep = $req->workflow->steps->where('sequence', $req->current_sequence)->first();

                if (!$currentStep) return false;

                // 1. Check Role/User assignment first
                $isAssigned = false;
                if ($currentStep->user_id === $user->id) {
                    $isAssigned = true;
                } elseif ($currentStep->role_name && in_array($currentStep->role_name, $userRoles)) {
                    $isAssigned = true;
                }

                if (!$isAssigned) return false;

                $canApproveAcrossEstate = $this->canApproveAcrossEstate($user, $userRoles, $currentStep);

                // 2. Check Estate context
                // If the workflow itself has an estate_id, it must match
                if (!$canApproveAcrossEstate && $req->workflow->estate_id && $req->workflow->estate_id != $user->estate_id) {
                    return false;
                }

                // If the transaction has an estate context, it must match
                if ($req->reference && method_exists($req->reference, 'getApprovalEstateId')) {
                    $txnEstateId = $req->reference->getApprovalEstateId();
                    
                    // Allow if transaction has no estate (Global), otherwise must match
                    if (!$canApproveAcrossEstate && $txnEstateId && $txnEstateId != $user->estate_id) {
                        return false;
                    }
                }

                return true;
            })->values();

        return response()->json(['data' => $pendingRequests]);
    }

    public function approve(Request $request, $id)
    {
        return $this->processApproval($request, $id, 'Approved');
    }

    public function reject(Request $request, $id)
    {
        $request->validate(['comment' => 'required|string']);
        return $this->processApproval($request, $id, 'Rejected');
    }

    private function processApproval(Request $request, $id, $action)
    {
        try {
            DB::beginTransaction();

            $approvalReq = ApprovalRequest::with(['workflow.steps', 'reference'])->findOrFail($id);

            if ($approvalReq->status !== 'Pending') {
                return response()->json(['message' => 'Request is already processed'], 400);
            }

            $actor = Auth::user();
            $userRoles = $actor->roles->pluck('name')->toArray();
            if (!$this->canProcessApprovalRequest($approvalReq, $actor, $userRoles)) {
                return response()->json(['message' => 'You are not authorized to process this approval request'], 403);
            }

            $currentSequence = $approvalReq->current_sequence;

            ApprovalLog::create([
                'approval_request_id' => $approvalReq->id,
                'sequence' => $currentSequence,
                'user_id' => Auth::id(),
                'action' => $action,
                'comment' => $request->comment ?? null,
            ]);

            $pendingEmail   = null; // [emails, transfer, sequence]
            $rejectedEmail  = null; // [emails, transfer, rejectedBy, comment]
            $approvedJobArgs = null; // [transferId, toEmails, ccEmail]

            if ($action === 'Rejected') {
                $approvalReq->update(['status' => 'Rejected']);
                if ($approvalReq->reference_table === 'access_requests') {
                    AccessRequest::whereKey($approvalReq->reference_id)->update(['status' => 'Rejected']);
                }

                if ($approvalReq->reference) {
                    $approvalReq->reference->update(['status' => 'Rejected']);
                }

                if ($approvalReq->requester_id) {
                    $requester = \App\Models\User::find($approvalReq->requester_id);
                    if ($requester && $requester->email) {
                        if ($approvalReq->reference_table === 'transfers') {
                            $transfer = $approvalReq->reference->load(['fromEstate', 'toEstate', 'items']);
                            $ccEmails = $this->transferOversightCcEmails([$requester->email]);
                            $rejectedEmail = [
                                'type'       => 'transfer',
                                'emails'     => [$requester->email],
                                'cc'         => $ccEmails,
                                'transfer'   => $transfer,
                                'rejectedBy' => Auth::user()->name ?? 'System',
                                'comment'    => $request->comment ?? null,
                            ];
                        } elseif ($approvalReq->reference_table === 'trans_assets') {
                            $writeOff = $approvalReq->reference->load(['asset.estate']);
                            $rejectedEmail = [
                                'type'       => 'write-off',
                                'emails'     => [$requester->email],
                                'writeOff'   => $writeOff,
                                'rejectedBy' => Auth::user()->name ?? 'System',
                                'comment'    => $request->comment ?? null,
                            ];
                        }
                    }
                }
            } else { // Approved
                $nextStep = $approvalReq->workflow->steps->where('sequence', '>', $currentSequence)->sortBy('sequence')->first();

                if ($nextStep) {
                    $approvalReq->update(['current_sequence' => $nextStep->sequence]);

                    if ($approvalReq->reference_table === 'transfers') {
                        $transfer = $approvalReq->reference->load(['fromEstate', 'toEstate', 'items']);
                        $emails = $nextStep->getEmailRecipients($transfer->to_estate_id);
                        if (!empty($emails)) {
                            $pendingEmail = [
                                'type'     => 'transfer',
                                'emails'   => $emails,
                                'cc'       => $this->transferOversightCcEmails($emails),
                                'transfer' => $transfer,
                                'sequence' => $nextStep->sequence,
                            ];
                        }
                    } elseif ($approvalReq->reference_table === 'trans_assets') {
                        $writeOff = $approvalReq->reference->load(['asset.estate']);
                        $emails = $nextStep->getEmailRecipients($writeOff->getApprovalEstateId());
                        if (!empty($emails)) {
                            $pendingEmail = [
                                'emails'   => $emails,
                                'transfer' => $writeOff,  // reuse ApprovalPendingMail via writeOff
                                'sequence' => $nextStep->sequence,
                            ];
                        }
                    }
                } else {
                    $approvalReq->update(['status' => 'Approved']);
                    if ($approvalReq->reference_table === 'access_requests') {
                        $this->applyApprovedAccessRequest($approvalReq);
                    }

                    if ($approvalReq->reference) {
                        $updatePayload = ['status' => 'Approved'];

                        if ($approvalReq->reference_table === 'transfers') {
                            $this->materialTransferService->applyTransfer(
                                $approvalReq->reference,
                                Auth::user()->username ?? Auth::user()->name ?? 'system'
                            );
                            $updatePayload['receive_date'] = now();
                        }

                        if ($approvalReq->reference_table === 'trans_assets') {
                            // Write-Off final approval: nonaktifkan aset
                            $writeOff = $approvalReq->reference->load('asset');
                            $writeOff->asset->update([
                                'not_active' => true,
                                'update_by'  => mb_substr(Auth::user()->username ?? Auth::user()->name ?? 'system', 0, 20),
                            ]);
                        }

                        if ($approvalReq->reference_table === 'material_stock_opnames') {
                            if (!$actor->can('post-material-stock-opnames')) {
                                throw ValidationException::withMessages([
                                    'permission' => ['Anda tidak memiliki permission untuk posting stock opname.'],
                                ]);
                            }

                            $this->materialStockOpnameService->postAdjustments($approvalReq->reference, $actor);
                            $updatePayload = [];
                        }

                        if (!empty($updatePayload)) {
                            $approvalReq->reference->update($updatePayload);
                        }

                        if ($approvalReq->reference_table === 'transfers') {
                            $approvalUserIds = \App\Models\ApprovalLog::where('approval_request_id', $approvalReq->id)->pluck('user_id')->filter()->unique()->toArray();
                            $toEmails = \App\Models\User::whereIn('id', $approvalUserIds)->pluck('email')->filter()->toArray();

                            $requesterEmail = null;
                            if ($approvalReq->requester_id) {
                                $requester = \App\Models\User::find($approvalReq->requester_id);
                                if ($requester && $requester->email) {
                                    $requesterEmail = $requester->email;
                                }
                            }

                            if (!empty($toEmails)) {
                                $ccEmails = $this->transferOversightCcEmails(array_merge($toEmails, $requesterEmail ? [$requesterEmail] : []));
                                if ($requesterEmail) {
                                    $ccEmails[] = $requesterEmail;
                                }
                                $approvedJobArgs = [$approvalReq->reference_id, $toEmails, $ccEmails];
                            }
                        } elseif ($approvalReq->reference_table === 'trans_assets') {
                            $approvalUserIds = \App\Models\ApprovalLog::where('approval_request_id', $approvalReq->id)->pluck('user_id')->filter()->unique()->toArray();
                            $toEmails = \App\Models\User::whereIn('id', $approvalUserIds)->pluck('email')->filter()->toArray();

                            $requesterEmail = null;
                            if ($approvalReq->requester_id) {
                                $requester = \App\Models\User::find($approvalReq->requester_id);
                                if ($requester && $requester->email) {
                                    $requesterEmail = $requester->email;
                                }
                            }

                            if (!empty($toEmails)) {
                                $approvedJobArgs = ['write-off:' . $approvalReq->reference_id, $toEmails, $requesterEmail];
                            }
                        }
                    }
                }
            }

            DB::commit();

            if ($rejectedEmail) {
                if ($rejectedEmail['type'] === 'transfer') {
                    $this->sendEmailIfEnabled(
                        $rejectedEmail['emails'],
                        new TransferRejectedMail($rejectedEmail['transfer'], $rejectedEmail['rejectedBy'], $rejectedEmail['comment']),
                        $rejectedEmail['cc'] ?? []
                    );
                } elseif ($rejectedEmail['type'] === 'write-off') {
                    $this->sendEmailIfEnabled(
                        $rejectedEmail['emails'],
                        new WriteOffRejectedMail($rejectedEmail['writeOff'], $rejectedEmail['rejectedBy'], $rejectedEmail['comment'])
                    );
                }
            }

            if ($pendingEmail) {
                $ccEmails = ($pendingEmail['type'] ?? null) === 'transfer'
                    ? ($pendingEmail['cc'] ?? [])
                    : [];
                $this->sendEmailIfEnabled(
                    $pendingEmail['emails'],
                    new ApprovalPendingMail($pendingEmail['transfer'], $pendingEmail['sequence']),
                    $ccEmails
                );
            }

            if ($approvedJobArgs) {
                // Prefix 'write-off:' menandakan ini write-off job, bukan transfer
                if (str_starts_with($approvedJobArgs[0], 'write-off:')) {
                    $writeOffId = (int) str_replace('write-off:', '', $approvedJobArgs[0]);
                    SendWriteOffBeritaAcaraJob::dispatch($writeOffId, $approvedJobArgs[1], $approvedJobArgs[2]);
                } else {
                    \App\Jobs\SendTransferBeritaAcaraJob::dispatch(...$approvedJobArgs);
                }
            }

            return response()->json(['message' => "Successfully $action the request"]);
        } catch (ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to process approval',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to process approval', 'error' => $e->getMessage()], 500);
        }
    }

    private function canApproveAccessRequest(ApprovalRequest $request, User $user, array $userRoles): bool
    {
        if ($user->not_active) {
            return false;
        }

        if (in_array('admin', $userRoles, true)) {
            return true;
        }

        if (!in_array('estate', $userRoles, true)) {
            return false;
        }

        $accessRequest = AccessRequest::find($request->reference_id);

        return $accessRequest
            && $accessRequest->status === 'Pending'
            && (int) $accessRequest->requested_estate_id === (int) $user->estate_id;
    }

    private function canProcessApprovalRequest(ApprovalRequest $request, User $user, array $userRoles): bool
    {
        if ($user->not_active) {
            return false;
        }

        if ($request->reference_table === 'access_requests') {
            return $this->canApproveAccessRequest($request, $user, $userRoles);
        }

        $currentStep = $request->workflow?->steps
            ->where('sequence', $request->current_sequence)
            ->first();

        if (!$currentStep) {
            return false;
        }

        $isAssigned = $currentStep->user_id === $user->id
            || ($currentStep->role_name && in_array($currentStep->role_name, $userRoles, true));

        if (!$isAssigned) {
            return false;
        }

        $canApproveAcrossEstate = $this->canApproveAcrossEstate($user, $userRoles, $currentStep);

        if (!$canApproveAcrossEstate && $request->workflow->estate_id && (int) $request->workflow->estate_id !== (int) $user->estate_id) {
            return false;
        }

        if ($request->reference && method_exists($request->reference, 'getApprovalEstateId')) {
            $estateId = $request->reference->getApprovalEstateId();

            if (!$canApproveAcrossEstate && $estateId && (int) $estateId !== (int) $user->estate_id) {
                return false;
            }
        }

        return true;
    }

    private function canApproveAcrossEstate(User $user, array $userRoles, $currentStep): bool
    {
        if (in_array('admin', $userRoles, true)) {
            return true;
        }

        $isExplicitUserStep = $currentStep?->user_id && (int) $currentStep->user_id === (int) $user->id;
        $estateCode = mb_strtoupper((string) ($user->estate?->estate_id ?? ''));

        return $isExplicitUserStep && $estateCode === 'HO';
    }

    private function applyApprovedAccessRequest(ApprovalRequest $approvalRequest): void
    {
        $accessRequest = AccessRequest::findOrFail($approvalRequest->reference_id);
        $targetUser = User::findOrFail($accessRequest->user_id);
        $requestedRole = Role::findById($accessRequest->requested_role_id, 'web');

        $targetUser->forceFill([
            'role_id' => $requestedRole->id,
            'estate_id' => $accessRequest->requested_estate_id,
            'access_setup_required' => false,
        ])->save();

        $targetUser->syncRoles([$requestedRole]);

        $accessRequest->update(['status' => 'Approved']);
    }
}
