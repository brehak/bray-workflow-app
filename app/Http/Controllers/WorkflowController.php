<?php

namespace App\Http\Controllers;

use App\Models\Workflow;
use Illuminate\Http\Request;

class WorkflowController extends Controller
{
    public function index()
    {
        return Workflow::latest()->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'nodes'       => 'required|array',
            'edges'       => 'required|array',
        ]);

        $workflow = Workflow::create($validated);

        return response()->json($workflow, 201);
    }

    public function show(Workflow $workflow)
    {
        return response()->json($workflow);
    }

    public function update(Request $request, Workflow $workflow)
    {
        $validated = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'nodes'       => 'sometimes|array',
            'edges'       => 'sometimes|array',
        ]);

        $workflow->update($validated);

        return response()->json($workflow);
    }

    public function destroy(Workflow $workflow)
    {
        $workflow->delete();

        return response()->json(['deleted' => true]);
    }
} 