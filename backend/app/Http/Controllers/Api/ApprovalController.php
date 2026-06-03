<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\ApprovalPendingMail;
use App\Mail\TransferRejectedMail;
use App\Models\ApprovalLog;
use App\Models\ApprovalRequest;
use App\Services\MaterialTransferService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class ApprovalController extends Controller
{
    public function __construct(private MaterialTransferService $materialTransferService)
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

                // 2. Check Estate context
                // If the workflow itself has an estate_id, it must match
                if ($req->workflow->estate_id && $req->workflow->estate_id != $user->estate_id) {
                    return false;
                }

                // If the transaction has an estate context, it must match
                if ($req->reference && method_exists($req->reference, 'getApprovalEstateId')) {
                    $txnEstateId = $req->reference->getApprovalEstateId();
                    
                    // Allow if transaction has no estate (Global), otherwise must match
                    if ($txnEstateId && $txnEstateId != $user->estate_id) {
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
                if ($approvalReq->reference) {
                    $approvalReq->reference->update(['status' => 'Rejected']);
                }

                if ($approvalReq->reference_table === 'transfers' && $approvalReq->requester_id) {
                    $requester = \App\Models\User::find($approvalReq->requester_id);
                    if ($requester && $requester->email) {
                        $transfer = $approvalReq->reference->load(['fromEstate', 'toEstate', 'items']);
                        $rejectedEmail = [
                            'emails'     => [$requester->email],
                            'transfer'   => $transfer,
                            'rejectedBy' => Auth::user()->name ?? 'System',
                            'comment'    => $request->comment ?? null,
                        ];
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
                                'emails'   => $emails,
                                'transfer' => $transfer,
                                'sequence' => $nextStep->sequence,
                            ];
                        }
                    }
                } else {
                    $approvalReq->update(['status' => 'Approved']);
                    if ($approvalReq->reference) {
                        $updatePayload = ['status' => 'Approved'];

                        if ($approvalReq->reference_table === 'transfers' && $approvalReq->reference->type === 'Material') {
                            $this->materialTransferService->applyTransfer(
                                $approvalReq->reference,
                                Auth::user()->username ?? Auth::user()->name ?? 'system'
                            );
                            $updatePayload['receive_date'] = now();
                        }

                        $approvalReq->reference->update($updatePayload);

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
                                $approvedJobArgs = [$approvalReq->reference_id, $toEmails, $requesterEmail];
                            }
                        }
                    }
                }
            }

            DB::commit();

            if ($rejectedEmail) {
                $this->sendEmailIfEnabled(
                    $rejectedEmail['emails'],
                    new TransferRejectedMail($rejectedEmail['transfer'], $rejectedEmail['rejectedBy'], $rejectedEmail['comment'])
                );
            }

            if ($pendingEmail) {
                $this->sendEmailIfEnabled(
                    $pendingEmail['emails'],
                    new ApprovalPendingMail($pendingEmail['transfer'], $pendingEmail['sequence'])
                );
            }

            if ($approvedJobArgs) {
                \App\Jobs\SendTransferBeritaAcaraJob::dispatch(...$approvedJobArgs);
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
}
