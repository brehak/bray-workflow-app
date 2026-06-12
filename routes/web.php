<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\WorkflowController;
use App\Http\Controllers\AgentNodeController;

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

// Agentic AI node executor — reasons through a single workflow step via Prism/Claude.
Route::get('/api/agent/status', [AgentNodeController::class, 'status']);
Route::post('/api/agent/node', [AgentNodeController::class, 'run']);
