<?php

namespace App\Providers;

use FancySeo\Facades\FancySeo;
use FancySeo\JsonLd;
use FancySeo\SitemapBuilder;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiters();
        $this->configureSeo();
    }

    /**
     * Rate limiters for the app.
     *
     * The 'ai' limiter guards the two endpoints that call the Anthropic API
     * (/api/agent/node and /api/workflow/chat). Both share a single per-IP
     * bucket of 30 requests/minute so a client can't run up the API bill or
     * use the app as a free LLM proxy. Keyed on IP since these routes are
     * unauthenticated.
     */
    private function configureRateLimiters(): void
    {
        RateLimiter::for('ai', fn (Request $request) => Limit::perMinute(30)->by($request->ip()));
    }

    /**
     * Server-rendered SEO (particle-academy/fancy-seo). The <x-fancy-seo::head>
     * component in app.blade.php renders the resolved payload for the matched
     * route into the first byte, so crawlers / social scrapers / LLM bots see
     * real meta, Open Graph, Twitter cards, and JSON-LD before hydration.
     */
    private function configureSeo(): void
    {
        $url = fn (string $path = '/') => rtrim((string) config('app.url'), '/').$path;

        // Baseline applied to every page (site_name + default description come
        // from config/fancy-seo.php). jsonLd accumulates onto each page.
        FancySeo::defaults([
            'type' => 'website',
            'jsonLd' => [
                JsonLd::website('Fancy Workflows', $url('/'), 'Build, automate, and visualize agentic AI workflows on a drag-and-drop canvas.'),
                JsonLd::softwareApplication('Fancy Workflows', $url('/'), [
                    'description' => 'A visual builder for agentic AI workflows.',
                    'applicationCategory' => 'BusinessApplication',
                    'operatingSystem' => 'Web',
                    'price' => '0',
                ]),
            ],
        ]);

        // Per-page meta for every Inertia page.
        FancySeo::route('home', [
            'title' => 'Fancy Workflows — Build & automate agentic AI workflows',
            'description' => 'Design, run, and visualize agentic AI workflows on a drag-and-drop canvas. No setup required.',
        ]);

        FancySeo::route('workflow', [
            'title' => 'Workflow Builder — Fancy Workflows',
            'description' => 'Compose agentic workflows node by node on an interactive canvas and watch each step reason in real time.',
        ]);

        FancySeo::route('about', [
            'title' => 'About — Fancy Workflows',
            'description' => 'Learn what Fancy Workflows is, how the agentic canvas works, and the ideas behind it.',
        ]);

        FancySeo::route('workflows.list', [
            'title' => 'Your Workflows — Fancy Workflows',
            'description' => 'Browse and manage your saved agentic AI workflows.',
        ]);

        FancySeo::route('settings', [
            'title' => 'Settings — Fancy Workflows',
        ]);

        FancySeo::route('analytics', [
            'title' => 'Analytics — Fancy Workflows',
        ]);

        // Internal / user-specific dashboards shouldn't be indexed.
        FancySeo::noindexRoutes(['settings', 'analytics', 'workflows.list']);

        // sitemap.xml — only the public, indexable pages.
        FancySeo::sitemap(function (SitemapBuilder $map) {
            $map->add('/', '1.0', 'weekly');
            $map->add('workflow', '0.9', 'weekly');
            $map->add('about', '0.6', 'monthly');
        });
    }
}
