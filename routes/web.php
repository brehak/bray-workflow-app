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

Route::apiResource('workflows', WorkflowController::class); 