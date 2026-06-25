<?php

namespace App\Http\Controllers;

use App\Models\Workflow;
use App\Services\BpmnExporter;
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
            'description' => 'nullable|string|max:10000',
            'nodes'       => 'required|array|max:500',
            // `present` (not `required`) so a workflow with nodes but no edges
            // yet — e.g. a single starter node being auto-saved — can be saved.
            'edges'       => 'present|array|max:1000',
            'tags'        => 'nullable|array|max:20',
            'tags.*'      => 'string',
            'folder'      => 'nullable|string|max:255',
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
            'description' => 'nullable|string|max:10000',
            'nodes'       => 'sometimes|array|max:500',
            'edges'       => 'sometimes|array|max:1000',
            'tags'        => 'nullable|array|max:20',
            'tags.*'      => 'string',
            'folder'      => 'nullable|string|max:255',
        ]);

        $workflow->update($validated);

        return response()->json($workflow);
    }

    public function destroy(Workflow $workflow)
    {
        $workflow->delete();

        return response()->json(['deleted' => true]);
    }

    /**
     * Toggle (or explicitly set) a workflow's pinned state.
     */
    public function pin(Request $request, Workflow $workflow)
    {
        $validated = $request->validate([
            'pinned' => 'nullable|boolean',
        ]);

        $workflow->update([
            'pinned' => $validated['pinned'] ?? ! $workflow->pinned,
        ]);

        return response()->json($workflow);
    }

    /**
     * Export a workflow's graph as a downloadable BPMN 2.0 file.
     */
    public function exportBpmn(Workflow $workflow, BpmnExporter $exporter)
    {
        $xml = $exporter->export($workflow);

        return response($xml, 200, [
            'Content-Type'        => 'application/bpmn+xml',
            'Content-Disposition' => 'attachment; filename="workflow-' . $workflow->id . '.bpmn"',
        ]);
    }
} 