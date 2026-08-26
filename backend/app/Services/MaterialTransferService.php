<?php

namespace App\Services;

use App\Models\Estate;
use App\Models\Asset;
use App\Models\AssetTransferHistory;
use App\Models\Material;
use App\Models\MaterialTransferHistory;
use App\Models\Transaction;
use App\Models\Transfer;
use App\Models\TransferItem;
use Illuminate\Validation\ValidationException;

class MaterialTransferService
{
    public function applyTransfer(Transfer $transfer, ?string $actorName = null): void
    {
        $actorName = $this->legacyActorName($actorName);
        $transfer->loadMissing(['items', 'fromEstate', 'toEstate', 'materialHistories', 'assetHistories']);

        if ($transfer->type === 'Asset') {
            if ($transfer->assetHistories->isNotEmpty()) {
                return;
            }

            $this->applyAssetTransfer($transfer, $actorName);
            return;
        }

        if ($transfer->type !== 'Material') {
            return;
        }

        if ($transfer->materialHistories->isNotEmpty()) {
            return;
        }

        foreach ($transfer->items as $item) {
            $this->applyTransferItem($transfer, $item, $actorName);
        }
    }

    private function legacyActorName(?string $actorName): string
    {
        return mb_substr($actorName ?: 'system', 0, 20);
    }

    private function applyAssetTransfer(Transfer $transfer, string $actorName): void
    {
        $destinationEstate = $transfer->toEstate ?? Estate::find($transfer->to_estate_id);
        $processedAt = now();

        if (!$destinationEstate) {
            throw ValidationException::withMessages([
                'to_estate_id' => ['Estate tujuan transfer tidak ditemukan.'],
            ]);
        }

        foreach ($transfer->items as $item) {
            $asset = Asset::where('reg_id', $item->item_id)->lockForUpdate()->first();

            if (!$asset) {
                throw ValidationException::withMessages([
                    'items' => ["Asset {$item->item_id} tidak ditemukan."],
                ]);
            }

            if ($transfer->from_estate_id && (int) $asset->estate_id !== (int) $transfer->from_estate_id) {
                throw ValidationException::withMessages([
                    'items' => ["Asset {$asset->reg_id} bukan milik estate asal transfer."],
                ]);
            }

            AssetTransferHistory::create([
                'transfer_id' => $transfer->id,
                'transfer_item_id' => $item->id,
                'asset_id' => $asset->reg_id,
                'from_estate_id' => $asset->estate_id,
                'to_estate_id' => $destinationEstate->id,
                'previous_unit_id' => $asset->unit_id,
                'new_unit_id' => $destinationEstate->estate_id,
                'previous_anggota_id' => $asset->anggota_id,
                'target_anggota_id' => $transfer->anggota_id,
                'notes' => $item->notes,
                'processed_by' => $actorName,
                'processed_at' => $processedAt,
            ]);

            $asset->update([
                'estate_id' => $destinationEstate->id,
                'unit_id' => $destinationEstate->estate_id,
                'update_by' => $actorName,
            ]);
        }
    }

    private function applyTransferItem(Transfer $transfer, TransferItem $item, string $actorName): void
    {
        $qty = (float) $item->qty;
        $processedAt = now();

        $source = Material::where('code', $item->item_id)->lockForUpdate()->first();

        if (!$source) {
            throw ValidationException::withMessages([
                'items' => ["Material {$item->item_id} tidak ditemukan."],
            ]);
        }

        if ($transfer->from_estate_id && (int) $source->estate_id !== (int) $transfer->from_estate_id) {
            throw ValidationException::withMessages([
                'items' => ["Material {$source->code} bukan milik estate asal transfer."],
            ]);
        }

        if ((float) $source->stock < $qty) {
            throw ValidationException::withMessages([
                'items' => ["Stok material {$source->code} tidak cukup. Stock saat ini {$source->stock}, diminta {$qty}."],
            ]);
        }

        $destination = $this->findDestinationMaterial($source, (int) $transfer->to_estate_id);
        $destinationCreated = false;

        if (!$destination) {
            $destination = $this->createDestinationMaterial($source, (int) $transfer->to_estate_id, $actorName, $processedAt);
            $destinationCreated = true;
        } else {
            $destination = Material::where('code', $destination->code)->lockForUpdate()->firstOrFail();
        }

        $sourceStockBefore = (float) $source->stock;
        $destinationStockBefore = (float) $destination->stock;

        $source->update([
            'stock' => $sourceStockBefore - $qty,
            'update_by' => $actorName,
            'update_date' => $processedAt,
        ]);

        $destination->update([
            'stock' => $destinationStockBefore + $qty,
            'not_active' => false,
            'update_by' => $actorName,
            'update_date' => $processedAt,
        ]);

        MaterialTransferHistory::create([
            'transfer_id' => $transfer->id,
            'transfer_item_id' => $item->id,
            'source_material_code' => $source->code,
            'destination_material_code' => $destination->code,
            'from_estate_id' => $transfer->from_estate_id,
            'to_estate_id' => $transfer->to_estate_id,
            'qty' => $qty,
            'destination_created' => $destinationCreated,
            'source_stock_before' => $sourceStockBefore,
            'source_stock_after' => $sourceStockBefore - $qty,
            'destination_stock_before' => $destinationStockBefore,
            'destination_stock_after' => $destinationStockBefore + $qty,
            'notes' => $item->notes,
            'processed_by' => $actorName,
            'processed_at' => $processedAt,
        ]);

        $this->createTransactionLogs($transfer, $source, $destination, $qty, $actorName, $processedAt, $destinationCreated);
    }

    private function findDestinationMaterial(Material $source, int $toEstateId): ?Material
    {
        $query = Material::where('estate_id', $toEstateId);

        if ($source->matcode) {
            return (clone $query)
                ->where('matcode', $source->matcode)
                ->first();
        }

        return (clone $query)
            ->where('nama', $source->nama)
            ->where('category_id', $source->category_id)
            ->where('unit_id', $source->unit_id)
            ->where('section_id', $source->section_id)
            ->first();
    }

    private function createDestinationMaterial(Material $source, int $toEstateId, string $actorName, $processedAt): Material
    {
        $estate = Estate::find($toEstateId);

        if (!$estate) {
            throw ValidationException::withMessages([
                'to_estate_id' => ['Estate tujuan transfer tidak ditemukan.'],
            ]);
        }

        return Material::create([
            'code' => $this->generateEstateMaterialCode($estate),
            'nama' => $source->nama,
            'type' => $source->type,
            'category_id' => $source->category_id,
            'unit_id' => $source->unit_id,
            'matcode' => $source->matcode,
            'sn' => $source->sn,
            'min_stock' => $source->min_stock,
            'price' => $source->price,
            'stock' => 0,
            'pt' => $source->pt,
            'section_id' => $source->section_id,
            'estate_id' => $estate->id,
            'not_active' => false,
            'create_by' => $actorName,
            'create_date' => $processedAt,
            'update_by' => $actorName,
            'update_date' => $processedAt,
        ]);
    }

    private function generateEstateMaterialCode(Estate $estate): string
    {
        $prefix = 'MAT-' . $estate->estate_id . '-';

        $lastNumber = Material::withTrashed()
            ->where('estate_id', $estate->id)
            ->where('code', 'like', $prefix . '%')
            ->pluck('code')
            ->map(function (string $code) use ($prefix) {
                $suffix = substr($code, strlen($prefix));
                return ctype_digit($suffix) ? (int) $suffix : 0;
            })
            ->max() ?? 0;

        do {
            $lastNumber++;
            $code = $prefix . str_pad((string) $lastNumber, 3, '0', STR_PAD_LEFT);
        } while (Material::withTrashed()->where('code', $code)->exists());

        return $code;
    }

    private function createTransactionLogs(
        Transfer $transfer,
        Material $source,
        Material $destination,
        float $qty,
        string $actorName,
        $processedAt,
        bool $destinationCreated
    ): void {
        $transferDate = $processedAt->toDateString();
        $fromEstateCode = $transfer->fromEstate?->estate_id ?? 'N/A';
        $toEstateCode = $transfer->toEstate?->estate_id ?? 'N/A';
        $baseRemark = "Transfer {$transfer->transfer_code} {$fromEstateCode} -> {$toEstateCode}";

        Transaction::create([
            'date' => $transferDate,
            'code' => $source->code,
            'type' => 'OUT',
            'qty' => $qty,
            'section' => $source->section?->section,
            'estate' => $fromEstateCode,
            'keterangan' => "{$baseRemark}. Material keluar ke {$destination->code}.",
            'create_by' => $actorName,
            'create_date' => $processedAt,
        ]);

        Transaction::create([
            'date' => $transferDate,
            'code' => $destination->code,
            'type' => 'IN',
            'qty' => $qty,
            'section' => $destination->section?->section,
            'estate' => $toEstateCode,
            'keterangan' => "{$baseRemark}. Material masuk dari {$source->code}" . ($destinationCreated ? ' dan code baru dibuat.' : '.'),
            'create_by' => $actorName,
            'create_date' => $processedAt,
        ]);
    }
}
