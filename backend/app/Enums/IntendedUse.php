<?php

namespace App\Enums;

/**
 * The garment a piece of cloth is intended for. Drives pairing suggestions.
 */
enum IntendedUse: string
{
    case Shirt = 'shirt';
    case Pant = 'pant';
    case Suit = 'suit';
    case Kurta = 'kurta';
    case Saree = 'saree';
    case Dupatta = 'dupatta';
    case Other = 'other';

    /**
     * Complementary uses — what pairs well with this cloth. Used to pre-filter
     * the admin suggestion picker (e.g. shirt cloth → suggest pant/suit cloth).
     *
     * @return array<int, self>
     */
    public function complementaryUses(): array
    {
        return match ($this) {
            self::Shirt => [self::Pant, self::Suit],
            self::Pant => [self::Shirt, self::Suit],
            self::Suit => [self::Shirt],
            self::Kurta => [self::Dupatta, self::Pant],
            self::Saree => [self::Dupatta],
            self::Dupatta => [self::Kurta, self::Saree],
            self::Other => self::cases(),
        };
    }

    public function label(): string
    {
        return ucfirst($this->value);
    }
}
