<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\AssetDepartment;
use App\Models\AssetDivision;
use App\Models\AssetReg;
use App\Models\AssetType;
use App\Models\Estate;
use App\Models\Manufacturer;
use App\Models\Section;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class AssetRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Estate $estate;
    private AssetReg $assetReg;
    private AssetDepartment $department;
    private AssetDivision $division;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('create-assets', 'web');

        $this->estate = Estate::create([
            'estate_id' => 'KLT',
            'estate' => 'Kalimantan',
        ]);

        $section = Section::create(['section' => 'ITD', 'section_full' => 'IT Department']);
        $assetType = AssetType::create(['name' => 'Laptop']);
        $manufacturer = Manufacturer::create(['name' => 'Dell']);

        $this->assetReg = AssetReg::create([
            'asset_type_id' => $assetType->id,
            'manufacturer_id' => $manufacturer->id,
            'series' => 'Latitude 5420',
            'matcode' => 'MAT-LP-001',
            'section_id' => $section->id,
        ]);

        $this->department = AssetDepartment::create(['name' => 'IT']);
        $this->division = AssetDivision::create([
            'asset_department_id' => $this->department->id,
            'name' => 'Support',
        ]);

        $this->user = User::factory()->create([
            'estate_id' => $this->estate->id,
            'not_active' => false,
        ]);
        $this->user->givePermissionTo('create-assets');
    }

    public function test_generate_reg_id_uses_next_estate_sequence(): void
    {
        Asset::create([
            'reg_id' => 'AST-KLT-001',
            'asset_no' => 'ASSET-KLT-001',
            'serial_no' => 'SN-001',
            'type_id' => $this->assetReg->id,
            'type' => 'Laptop',
            'manufacture' => 'Dell',
            'series' => 'Latitude 5420',
            'section_id' => $this->assetReg->section_id,
            'estate_id' => $this->estate->id,
            'asset_department_id' => $this->department->id,
            'asset_division_id' => $this->division->id,
        ]);

        $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/assets/generate-reg-id')
            ->assertOk()
            ->assertJsonPath('data.reg_id', 'AST-KLT-002');
    }

    public function test_can_create_asset_without_section_and_with_generated_reg_id(): void
    {
        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/assets', $this->validPayload())
            ->assertCreated()
            ->assertJsonPath('data.reg_id', 'AST-KLT-001');

        $this->assertDatabaseHas('assets', [
            'reg_id' => 'AST-KLT-001',
            'asset_no' => 'ASSET-KLT-001',
            'serial_no' => 'SN-001',
            'section_id' => null,
        ]);
    }

    public function test_required_asset_fields_are_validated(): void
    {
        $payload = $this->validPayload();
        unset($payload['asset_no'], $payload['serial_no'], $payload['asset_department_id'], $payload['asset_division_id']);

        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/assets', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'asset_no',
                'serial_no',
                'asset_department_id',
                'asset_division_id',
            ]);
    }

    public function test_mismatched_department_and_division_is_rejected(): void
    {
        $otherDepartment = AssetDepartment::create(['name' => 'Operations']);

        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/assets', [
                ...$this->validPayload(),
                'asset_department_id' => $otherDepartment->id,
                'asset_division_id' => $this->division->id,
            ])
            ->assertUnprocessable();
    }

    private function validPayload(): array
    {
        return [
            'asset_no' => 'ASSET-KLT-001',
            'serial_no' => 'SN-001',
            'type_id' => $this->assetReg->id,
            'type' => 'Laptop',
            'manufacture' => 'Dell',
            'series' => 'Latitude 5420',
            'estate_id' => $this->estate->id,
            'asset_department_id' => $this->department->id,
            'asset_division_id' => $this->division->id,
        ];
    }
}
