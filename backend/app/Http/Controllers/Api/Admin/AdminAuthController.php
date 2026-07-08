<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\StaffResource;
use App\Models\Staff;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminAuthController extends Controller
{
    /**
     * POST /api/admin/auth/login
     */
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        /** @var Staff|null $staff */
        $staff = Staff::where('email', $data['email'])->first();

        if (! $staff || ! Hash::check($data['password'], $staff->password)) {
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        if (! $staff->is_active) {
            return response()->json(['message' => 'Account is inactive.'], 403);
        }

        $staff->update(['last_login_at' => now()]);

        $token = $staff->createToken('admin-session')->plainTextToken;

        return response()->json([
            'token' => $token,
            'staff' => new StaffResource($staff),
        ]);
    }

    /**
     * POST /api/admin/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user('staff')->currentAccessToken()->delete();

        return response()->json(null, 204);
    }

    /**
     * GET /api/admin/auth/me
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json(['data' => new StaffResource($request->user('staff'))]);
    }
}
