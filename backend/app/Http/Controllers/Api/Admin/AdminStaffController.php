<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\StaffRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\StaffResource;
use App\Models\Staff;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;

class AdminStaffController extends Controller
{
    /**
     * GET /api/admin/staff
     */
    public function index(): JsonResponse
    {
        $staff = Staff::withTrashed()->orderBy('name')->get();

        return response()->json(['data' => StaffResource::collection($staff)]);
    }

    /**
     * POST /api/admin/staff
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', Rule::unique('staff', 'email')],
            'password' => ['required', PasswordRule::min(8)],
            'role' => ['required', Rule::enum(StaffRole::class)],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $data['password'] = Hash::make($data['password']);
        $staff = Staff::create($data);

        // Assign role-based permissions via Spatie.
        if ($staff->role === StaffRole::Admin) {
            $staff->syncPermissions([
                'manage-products', 'manage-orders', 'view-orders', 'print-labels',
                'manage-staff', 'manage-settings', 'manage-customers',
            ]);
        } else {
            $staff->syncPermissions(['view-orders', 'print-labels']);
        }

        return response()->json(['data' => new StaffResource($staff)], 201);
    }

    /**
     * PATCH /api/admin/staff/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $staff = Staff::withTrashed()->findOrFail($id);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'email' => ['sometimes', 'email', Rule::unique('staff', 'email')->ignore($staff->id)],
            'role' => ['sometimes', Rule::enum(StaffRole::class)],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $staff->update($data);

        if (isset($data['role'])) {
            if ($staff->role === StaffRole::Admin) {
                $staff->syncPermissions([
                    'manage-products', 'manage-orders', 'view-orders', 'print-labels',
                    'manage-staff', 'manage-settings', 'manage-customers',
                ]);
            } else {
                $staff->syncPermissions(['view-orders', 'print-labels']);
            }
        }

        return response()->json(['data' => new StaffResource($staff->fresh())]);
    }

    /**
     * DELETE /api/admin/staff/{id}  (soft delete)
     */
    public function destroy(string $id): JsonResponse
    {
        $staff = Staff::findOrFail($id);

        if ($staff->id === request()->user('staff')->id) {
            return response()->json(['message' => 'Cannot delete your own account.'], 422);
        }

        $staff->delete();

        return response()->json(null, 204);
    }

    /**
     * PATCH /api/admin/staff/{id}/password
     */
    public function resetPassword(Request $request, string $id): JsonResponse
    {
        $staff = Staff::withTrashed()->findOrFail($id);

        $data = $request->validate([
            'password' => ['required', PasswordRule::min(8)],
        ]);

        $staff->update(['password' => Hash::make($data['password'])]);

        return response()->json(['message' => 'Password updated.']);
    }
}
