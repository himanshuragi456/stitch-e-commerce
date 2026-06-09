<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

class SettingService
{
    private const CACHE_KEY = 'settings.all';

    /** @return array<string, mixed> */
    public function all(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function () {
            return Setting::query()->pluck('value', 'key')->toArray();
        });
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return data_get($this->all(), $key, $default);
    }

    public function set(string $key, mixed $value): void
    {
        Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        $this->flush();
    }

    public function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Subset of settings safe to expose publicly on the storefront.
     *
     * @return array<string, mixed>
     */
    public function publicSettings(): array
    {
        $all = $this->all();

        return [
            'store' => [
                'name' => data_get($all, 'store.name', 'Shree Krishna Collection'),
                'email' => data_get($all, 'store.email'),
                'phone' => data_get($all, 'store.phone'),
            ],
            'shipping' => [
                'flat_rate_paise' => (int) data_get($all, 'shipping.flat_rate_paise', 0),
                'free_threshold_paise' => (int) data_get($all, 'shipping.free_threshold_paise', 0),
            ],
            'social' => data_get($all, 'social', []),
            'style_video' => $this->styleVideo($all),
        ];
    }

    /**
     * Normalise the daily style video for the storefront — resolves the
     * admin-pasted YouTube URL (any format) into a clean video id ready to embed.
     *
     * @param  array<string, mixed>  $all
     * @return array{enabled: bool, title: string, subtitle: ?string, youtube_id: ?string}
     */
    private function styleVideo(array $all): array
    {
        $url = (string) data_get($all, 'style_video.youtube_url', '');
        $videoId = $this->extractYoutubeId($url);

        return [
            'enabled' => (bool) data_get($all, 'style_video.enabled', false) && $videoId !== null,
            'title' => (string) data_get($all, 'style_video.title', "Today's Style Suggestion"),
            'subtitle' => data_get($all, 'style_video.subtitle'),
            'youtube_id' => $videoId,
        ];
    }

    /**
     * Extract an 11-char YouTube id from watch / youtu.be / shorts / embed URLs,
     * or accept a bare id. Returns null if nothing valid is found.
     */
    public function extractYoutubeId(string $url): ?string
    {
        $url = trim($url);
        if ($url === '') {
            return null;
        }

        // Bare id.
        if (preg_match('/^[A-Za-z0-9_-]{11}$/', $url)) {
            return $url;
        }

        $patterns = [
            '/[?&]v=([A-Za-z0-9_-]{11})/',        // watch?v=ID
            '#youtu\.be/([A-Za-z0-9_-]{11})#',     // youtu.be/ID
            '#/shorts/([A-Za-z0-9_-]{11})#',       // /shorts/ID
            '#/embed/([A-Za-z0-9_-]{11})#',        // /embed/ID
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $url, $m)) {
                return $m[1];
            }
        }

        return null;
    }
}
