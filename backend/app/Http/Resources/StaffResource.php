<?php

namespace App\Http\Resources;

use App\Models\Staff;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Staff */
class StaffResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role->value,
            'permissions' => $this->getAllPermissions()->pluck('name')->values(),
            'is_active' => $this->is_active,
            'last_login_at' => $this->last_login_at?->toISOString(),
        ];
    }
}
