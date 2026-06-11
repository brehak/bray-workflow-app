{{--
    Shared error layout — boots the Inertia "Error" React page from a plain
    server-rendered error response (no Inertia request context is available when
    Laravel renders an error view, so we hand-build the page object and drop it
    into the same #app root the SPA mounts on). The `$status` passed in by each
    errors/{code}.blade.php becomes the page's prop.
--}}
@php
    $page = [
        'component' => 'Error',
        'props' => ['status' => (int) $status],
        'url' => request()->getRequestUri(),
        'version' => '',
    ];
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        {{-- Favicon (Fancy Workflows mark) --}}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg">
        <link rel="apple-touch-icon" href="/favicon.svg">

        <title>{{ $status }} &mdash; {{ config('app.name', 'Fancy Workflows') }}</title>

        {{-- Inter font (Google Fonts) --}}
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    </head>
    <body class="font-sans antialiased">
        {{-- Inertia (v1+) reads the initial page from this JSON <script>, not from
             a div attribute. Mirror the @inertia directive's output exactly so the
             SPA boots the Error page from a plain server-rendered error response. --}}
        <div id="app"></div>
        <script data-page="app" type="application/json">{!! json_encode($page, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) !!}</script>
    </body>
</html>
