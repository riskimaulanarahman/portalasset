<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Estate;
use App\Models\Material;
use App\Models\Section;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * #24 FIX: Feature tests untuk Material CRUD + validasi
 */
class MaterialTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Estate $estate;
    private Category $category;
    private Section $section;

    protected function setUp(): void
    {
        parent::setUp();

        $this->estate   = Estate::factory()->create(['estate_id' => 'KLT']);
        $this->category = Category::factory()->create();
        $this->section  = Section::factory()->create();

        $this->user = User::factory()->create([
            'estate_id'  => $this->estate->id,
            'not_active' => false,
        ]);
        $this->user->givePermissionTo(['view-materials', 'create-materials', 'edit-materials', 'delete-materials']);
    }

    // ── Index ─────────────────────────────────────────────────────────────────

    public function test_can_list_materials_paginated(): void
    {
        // #13 FIX: API harus mengembalikan struktur paginated
        $this->actingAs($this->user, 'sanctum')
             ->getJson('/api/materials?per_page=5')
             ->assertOk()
             ->assertJsonStructure(['data', 'meta' => ['current_page', 'per_page', 'total', 'last_page']]);
    }

    public function test_can_list_all_materials_without_pagination(): void
    {
        $this->actingAs($this->user, 'sanctum')
             ->getJson('/api/materials?all=1')
             ->assertOk()
             ->assertJsonStructure(['data']);
    }

    // ── Create ────────────────────────────────────────────────────────────────

    public function test_can_create_material(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
             ->postJson('/api/materials', [
                 'code'        => 'MAT-KLT-000001',
                 'nama'        => 'Test Material',
                 'category_id' => $this->category->id,
                 'section_id'  => $this->section->id,
                 'estate_id'   => $this->estate->id,
             ]);

        $response->assertCreated()
                 ->assertJsonFragment(['nama' => 'Test Material']);

        $this->assertDatabaseHas('materials', ['code' => 'MAT-KLT-000001']);
    }

    public function test_duplicate_material_in_same_estate_is_rejected(): void
    {
        // #11 FIX: nama + category + estate harus unik
        Material::factory()->create([
            'nama'        => 'Duplicate Material',
            'category_id' => $this->category->id,
            'estate_id'   => $this->estate->id,
        ]);

        $this->actingAs($this->user, 'sanctum')
             ->postJson('/api/materials', [
                 'code'        => 'MAT-KLT-000099',
                 'nama'        => 'Duplicate Material',
                 'category_id' => $this->category->id,
                 'section_id'  => $this->section->id,
                 'estate_id'   => $this->estate->id,
             ])
             ->assertUnprocessable()
             ->assertJsonFragment(['nama' => ['Material dengan nama, kategori, dan estate yang sama sudah ada.']]);
    }

    // ── Soft Delete ───────────────────────────────────────────────────────────

    public function test_delete_soft_deletes_material(): void
    {
        // #7 FIX: Soft delete harus menjaga record di database
        $material = Material::factory()->create([
            'estate_id' => $this->estate->id,
        ]);

        $this->actingAs($this->user, 'sanctum')
             ->deleteJson("/api/materials/{$material->code}")
             ->assertOk();

        $this->assertSoftDeleted('materials', ['code' => $material->code]);
    }

    // ── Generate Code ─────────────────────────────────────────────────────────

    public function test_generate_code_is_estate_aware(): void
    {
        // #10 FIX: Code harus mengandung estate code
        $response = $this->actingAs($this->user, 'sanctum')
             ->getJson('/api/materials/generate-code');

        $response->assertOk();
        $code = $response->json('data.code');
        $this->assertStringContainsString('KLT', $code);
        $this->assertStringStartsWith('MAT-KLT-', $code);
    }
}
