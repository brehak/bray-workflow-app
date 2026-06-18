<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\WorkflowController;
use App\Http\Controllers\AgentNodeController;
use App\Http\Controllers\WorkflowChatController;
use App\Http\Controllers\AnalyticsController;

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

// Workflow analytics dashboard — aggregates the saved workflows into charts.
Route::get('/analytics', [AnalyticsController::class, 'index']);

Route::apiResource('workflows', WorkflowController::class);

// Agentic AI node executor — reasons through a single workflow step via Prism/Claude.
Route::get('/api/agent/status', [AgentNodeController::class, 'status']);
Route::post('/api/agent/node', [AgentNodeController::class, 'run']);

// Claude workflow chat assistant — answers questions and proposes graph edits.
Route::post('/api/workflow/chat', [WorkflowChatController::class, 'chat']);
