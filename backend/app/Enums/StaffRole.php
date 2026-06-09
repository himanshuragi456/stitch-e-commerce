<?php

namespace App\Enums;

enum StaffRole: string
{
    case Admin = 'admin';
    case Employee = 'employee';

    public function label(): string
    {
        return ucfirst($this->value);
    }
}
