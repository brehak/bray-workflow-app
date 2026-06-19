<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Site defaults
    |--------------------------------------------------------------------------
    | The baseline applied to every page. Per-route resolvers + a controller's
    | `FancySeo::for([...])` override these. `url` falls back to config('app.url').
    */
    'site_name' => env('FANCY_SEO_SITE_NAME', 'Fancy Workflows'),
    'url' => env('FANCY_SEO_URL', config('app.url')),
    'title' => null,            // default <title>; null → site_name
    'description' => 'Build, automate, and visualize agentic AI workflows on a drag-and-drop canvas.',      // default meta description
    'image' => '/og-image.png',           // default og/twitter image (absolute or root-relative)
    'image_alt' => 'Fancy Workflows — Build, automate, and visualize agentic AI workflows',        // og:image:alt / twitter:image:alt (accessible card text)
    'image_width' => 1200,      // og:image:width (px) — set when the default card has fixed dims
    'image_height' => 630,     // og:image:height (px)
    'locale' => 'en_US',
    'type' => 'website',        // default og:type
    'twitter_site' => null,     // @handle for twitter:site
    'theme_color' => '#8b5cf6',      // <meta name="theme-color">

    /*
    |--------------------------------------------------------------------------
    | Indexing
    |--------------------------------------------------------------------------
    | `robots` is the default <meta name="robots"> for indexable pages.
    | `noindex_routes` are route-name patterns ('admin.*') always set noindex.
    */
    'robots' => 'index, follow, max-image-preview:large',
    'noindex_robots' => 'noindex, nofollow',
    'noindex_routes' => [],

    /*
    |--------------------------------------------------------------------------
    | Content Security Policy
    |--------------------------------------------------------------------------
    | Optional nonce applied to the inline JSON-LD <script> tags so a strict
    | `script-src 'nonce-…'` CSP doesn't drop your structured data. Leave null
    | when you don't run a CSP. For a per-request nonce, pass it to the head
    | component instead: <x-fancy-seo::head :nonce="$cspNonce" />.
    */
    'csp_nonce' => null,

    /*
    |--------------------------------------------------------------------------
    | Routes
    |--------------------------------------------------------------------------
    | Auto-register the discovery routes (sitemap.xml, robots.txt, llms.txt,
    | llms-full.txt, .well-known/security.txt, humans.txt). Disable any you
    | serve yourself. `markdown` enables the per-page `{path}.md` route.
    */
    'routes' => [
        'enabled' => true,
        'sitemap' => true,
        'robots' => true,
        'llms' => true,
        'security' => true,
        'humans' => true,
        'markdown' => false,
    ],

    /*
    |--------------------------------------------------------------------------
    | robots.txt
    |--------------------------------------------------------------------------
    | Paths every user-agent (incl. the welcomed AI bots) must not crawl, and
    | the AI/LLM crawler user-agents explicitly allowed (we WANT to be ingested).
    */
    'robots_txt' => [
        'disallow' => ['/admin', '/login', '/logout'],
        'ai_bots' => [
            'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web',
            'anthropic-ai', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended',
            'CCBot', 'Amazonbot', 'Meta-ExternalAgent', 'cohere-ai',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | well-known
    |--------------------------------------------------------------------------
    */
    'security_txt' => [
        'contact' => env('FANCY_SEO_SECURITY_CONTACT'),   // e.g. mailto:security@example.com
        'languages' => 'en',
    ],
];
