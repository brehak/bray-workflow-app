<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\WorkflowController;
use App\Http\Controllers\AgentNodeController;
use App\Http\Controllers\WorkflowChatController;
use App\Http\Controllers\AnalyticsController;

Route::get('/', function () {
    return Inertia::render('Welcome');
})->name('home');

Route::get('/workflow', function () {
    return Inertia::render('Workflow');
})->name('workflow');

Route::get('/about', function () {
    return Inertia::render('About');
})->name('about');

Route::get('/workflows-list', function () {
    $workflows = \App\Models\Workflow::latest()->get();
    return Inertia::render('WorkflowList', ['workflows' => $workflows]);
})->name('workflows.list');

Route::get('/settings', function () {
    $workflows = \App\Models\Workflow::latest()->get();
    return Inertia::render('Settings', ['workflows' => $workflows]);
})->name('settings');

// Workflow analytics dashboard — aggregates the saved workflows into charts.
Route::get('/analytics', [AnalyticsController::class, 'index'])->name('analytics');

// Download a workflow's graph as a BPMN 2.0 XML file. Declared before the
// apiResource so the nested `export/bpmn` segment resolves to this action.
Route::post('/workflows/{workflow}/export/bpmn', [WorkflowController::class, 'exportBpmn'])
    ->name('workflows.export.bpmn');

Route::apiResource('workflows', WorkflowController::class);

// Agentic AI node executor — reasons through a single workflow step via Prism/Claude.
Route::get('/api/agent/status', [AgentNodeController::class, 'status']);
Route::post('/api/agent/node', [AgentNodeController::class, 'run']);

// Claude workflow chat assistant — answers questions and proposes graph edits.
Route::post('/api/workflow/chat', [WorkflowChatController::class, 'chat']);
