<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\WorkflowController;

Route::get('/', function () {
    return Inertia::render('Welcome');
});

Route::get('/workflow', function () {
    return Inertia::render('Workflow');
});

Route::get('/about', function () {
    return Inertia::render('About');
});

Route::get('/workflows-list', function () {
    $workflows = \App\Models\Workflow::latest()->get();
    return Inertia::render('WorkflowList', ['workflows' => $workflows]);
});

Route::get('/settings', function () {
    $workflows = \App\Models\Workflow::latest()->get();
    return Inertia::render('Settings', ['workflows' => $workflows]);
});

Route::apiResource('workflows', WorkflowController::class);
