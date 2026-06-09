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
            // `present` (not `required`) so a workflow with nodes but no edges
            // yet — e.g. a single starter node being auto-saved — can be saved.
            'edges'       => 'present|array',
            'tags'        => 'nullable|array',
            'tags.*'      => 'string',
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
            'tags'        => 'nullable|array',
            'tags.*'      => 'string',
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