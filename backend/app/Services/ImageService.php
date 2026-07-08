<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class ImageService
{
    private const MAIN_WIDTH = 1200;

    private const THUMB_WIDTH = 400;

    private const QUALITY = 85;

    private const DISK = 'public';

    /**
     * Store an uploaded file as WebP + thumbnail. Returns [path, thumb_path].
     *
     * @return array{string, string}
     */
    public function storeProductImage(UploadedFile $file, string $productId): array
    {
        $manager = new ImageManager(new Driver);
        $uid = Str::uuid()->toString();
        $dir = "products/{$productId}";

        $main = $manager->read($file->getRealPath())
            ->scaleDown(width: self::MAIN_WIDTH)
            ->toWebp(quality: self::QUALITY);

        $thumb = $manager->read($file->getRealPath())
            ->scaleDown(width: self::THUMB_WIDTH)
            ->toWebp(quality: self::QUALITY);

        $path = "{$dir}/{$uid}.webp";
        $thumbPath = "{$dir}/{$uid}_thumb.webp";

        Storage::disk(self::DISK)->put($path, (string) $main);
        Storage::disk(self::DISK)->put($thumbPath, (string) $thumb);

        return [$path, $thumbPath];
    }

    public function delete(string $path): void
    {
        if (! Str::startsWith($path, ['http://', 'https://'])) {
            Storage::disk(self::DISK)->delete($path);
        }
    }
}
