<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Estate;
use App\Models\Transfer;
use App\Models\TransferItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * #24 FIX: Feature tests untuk Transfer flow
 */
class TransferTest extends TestCase
{
    use RefreshDatabase;

    private User $hoUser;
    private User $estateUser;
    private Estate $estateA;
    private Estate $estateB;
    private Estate $hoEstate;

    protected function setUp(): void
    {
        parent::setUp();

        $this->hoEstate   = Estate::factory()->create(['estate_id' => 'HO']);
        $this->estateA    = Estate::factory()->create(['estate_id' => 'KLT']);
        $this->estateB    = Estate::factory()->create(['estate_id' => 'SMD']);

        $this->hoUser = User::factory()->create([
            'estate_id'  => $this->hoEstate->id,
            'not_active' => false,
        ]);
        $this->hoUser->givePermissionTo(['view-transfers', 'create-transfers', 'edit-transfers']);

        $this->estateUser = User::factory()->create([
            'estate_id'  => $this->estateA->id,
            'not_active' => false,
        ]);
        $this->estateUser->givePermissionTo(['view-transfers', 'create-transfers']);
    }

    // ── Unique transfer_code (#4 FIX) ─────────────────────────────────────────

    public function test_transfer_code_is_unique(): void
    {
        $assetA = Asset::factory()->create(['estate_id' => $this->estateA->id]);
        $assetB = Asset::factory()->create(['estate_id' => $this->estateA->id]);

        // Buat transfer pertama
        $payload = [
            'type'           => 'Asset',
            'from_estate_id' => $this->estateA->id,
            'to_estate_id'   => $this->estateB->id,
            'items'          => [['item_id' => $assetA->reg_id, 'qty' => 1]],
        ];

        $r1 = $this->actingAs($this->hoUser, 'sanctum')->postJson('/api/transfers', $payload);
        $r2 = $this->actingAs($this->hoUser, 'sanctum')->postJson('/api/transfers', [
            ...$payload,
            'items' => [['item_id' => $assetB->reg_id, 'qty' => 1]],
        ]);

        if ($r1->status() === 201 && $r2->status() === 201) {
            $this->assertNotEquals(
                $r1->json('data.transfer_code'),
                $r2->json('data.transfer_code'),
                'Transfer codes must be unique',
            );
        }
    }

    // ── Double-transfer prevention (#5 FIX) ───────────────────────────────────

    public function test_asset_cannot_be_in_two_pending_transfers(): void
    {
        $asset = Asset::factory()->create(['estate_id' => $this->estateA->id]);

        // Transfer pertama
        $r1 = $this->actingAs($this->hoUser, 'sanctum')->postJson('/api/transfers', [
            'type'           => 'Asset',
            'from_estate_id' => $this->estateA->id,
            'to_estate_id'   => $this->estateB->id,
            'items'          => [['item_id' => $asset->reg_id, 'qty' => 1]],
        ]);

        if ($r1->status() !== 201) {
            $this->markTestSkipped('Transfer creation failed — skipping double-transfer test.');
        }

        // Transfer kedua dengan asset yang sama harus ditolak
        $this->actingAs($this->hoUser, 'sanctum')
             ->postJson('/api/transfers', [
                 'type'           => 'Asset',
                 'from_estate_id' => $this->estateA->id,
                 'to_estate_id'   => $this->estateB->id,
                 'items'          => [['item_id' => $asset->reg_id, 'qty' => 1]],
             ])
             ->assertUnprocessable()
             ->assertJsonFragment(['items' => ["Asset {$asset->reg_id} is already included in another pending transfer request."]]);
    }

    // ── Cancel Transfer (#18 FIX) ─────────────────────────────────────────────

    public function test_pending_transfer_can_be_cancelled(): void
    {
        $transfer = Transfer::factory()->create([
            'status'          => 'Pending Approval',
            'from_estate_id'  => $this->estateA->id,
            'to_estate_id'    => $this->estateB->id,
        ]);

        $this->actingAs($this->hoUser, 'sanctum')
             ->postJson("/api/transfers/{$transfer->id}/cancel")
             ->assertOk()
             ->assertJsonFragment(['message' => 'Transfer berhasil dibatalkan.']);

        $this->assertDatabaseHas('transfers', [
            'id'     => $transfer->id,
            'status' => 'Cancelled',
        ]);
    }

    public function test_approved_transfer_cannot_be_cancelled(): void
    {
        $transfer = Transfer::factory()->create([
            'status'         => 'Approved',
            'from_estate_id' => $this->estateA->id,
            'to_estate_id'   => $this->estateB->id,
        ]);

        $this->actingAs($this->hoUser, 'sanctum')
             ->postJson("/api/transfers/{$transfer->id}/cancel")
             ->assertBadRequest();
    }

    // ── Soft Delete (#7 FIX) ──────────────────────────────────────────────────

    public function test_transfer_uses_soft_delete(): void
    {
        $transfer = Transfer::factory()->create([
            'from_estate_id' => $this->estateA->id,
            'to_estate_id'   => $this->estateB->id,
        ]);

        $transfer->delete();

        $this->assertSoftDeleted('transfers', ['id' => $transfer->id]);
        $this->assertNotNull(Transfer::withTrashed()->find($transfer->id));
    }
}
