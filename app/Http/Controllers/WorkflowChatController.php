<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Prism\Prism\Enums\Provider;
use Prism\Prism\Facades\Prism;
use Prism\Prism\ValueObjects\Messages\AssistantMessage;
use Prism\Prism\ValueObjects\Messages\UserMessage;
use Throwable;

/**
 * Claude-powered workflow chat assistant.
 *
 * Backs the "Claude Assistant" panel in the workflow editor. The assistant can
 * answer questions about the current workflow AND propose concrete changes to it
 * (adding, modifying, or removing steps and connections). When it proposes
 * changes, it returns the complete new graph so the editor can apply it to the
 * canvas in one shot — mirroring how the controlled FlowEditor already swaps its
 * whole `{ nodes, edges }` value.
 *
 * Resilience mirrors AgentNodeController: the endpoint must never break the app.
 * With no API key, or on any AI failure, it degrades to a friendly text-only
 * reply that makes no canvas changes.
 */
class WorkflowChatController extends Controller
{
    /**
     * The Claude model used to reason about and edit workflows.
     *
     * Defaults to Anthropic's most capable model. Swap in 'claude-haiku-4-5'
     * to trade some quality for lower cost/latency.
     */
    private const MODEL = 'claude-opus-4-8';

    /**
     * Max output tokens for a chat turn. Kept generous so longer replies have
     * ample room to finish without being truncated mid-response.
     */
    private const MAX_TOKENS = 8000;

    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message'                  => ['required', 'string', 'max:8000'],
            'workflow_name'            => ['nullable', 'string', 'max:255'],
            'workflow'                 => ['nullable', 'array'],
            'workflow.nodes'           => ['nullable', 'array'],
            'workflow.edges'           => ['nullable', 'array'],
            'conversation_history'     => ['nullable', 'array'],
            'conversation_history.*.role'    => ['required_with:conversation_history', 'string', 'in:user,assistant'],
            'conversation_history.*.content' => ['required_with:conversation_history', 'string'],
            'response_length'          => ['nullable', 'string', 'in:short,medium,detailed'],
        ]);

        $workflowName = $validated['workflow_name'] ?? 'Workflow';
        $responseLength = $validated['response_length'] ?? 'medium';
        $workflow = [
            'nodes' => $validated['workflow']['nodes'] ?? [],
            'edges' => $validated['workflow']['edges'] ?? [],
        ];

        // Never call the API without a key — degrade to a friendly, change-free
        // reply so the chat still works out of the box and the app never breaks.
        if (blank(config('prism.providers.anthropic.api_key'))) {
            return response()->json([
                'success'  => true,
                'source'   => 'mock',
                'reply'    => "I'm not connected to Claude yet — set ANTHROPIC_API_KEY in your .env to enable live AI assistance. "
                    .'Once that\'s set, I can help you build and modify this workflow.',
                'workflow' => null,
                'run'      => false,
            ]);
        }

        try {
            $response = Prism::text()
                ->using(Provider::Anthropic, self::MODEL)
                ->withSystemPrompt($this->systemPrompt($workflowName, $workflow, $responseLength))
                ->withMessages($this->buildMessages($validated['conversation_history'] ?? [], $validated['message']))
                ->withMaxTokens(self::MAX_TOKENS)
                ->withClientOptions(['timeout' => 60]) // bound the request so it can't hang
                ->asText();

            $parsed = $this->extractJson($response->text);

            $reply = (is_array($parsed) && isset($parsed['reply']) && is_string($parsed['reply']))
                ? $parsed['reply']
                : trim($response->text);

            // Only surface a workflow if it's a well-formed { nodes, edges } graph.
            // Anything malformed is dropped — the chat reply still goes through,
            // the canvas is simply left untouched.
            $newWorkflow = $this->sanitizeWorkflow($parsed['workflow'] ?? null);

            // Whether Claude wants the canvas to actually run the workflow.
            $run = is_array($parsed) && ($parsed['run'] ?? false) === true;

            return response()->json([
                'success'  => true,
                'source'   => 'ai',
                'model'    => self::MODEL,
                'reply'    => $reply !== '' ? $reply : 'Done.',
                'workflow' => $newWorkflow,
                'run'      => $run,
            ]);
        } catch (Throwable $e) {
            // Rate limit, network blip, bad key, overload — never surface a 500
            // to the chat panel. Log it and return a usable, change-free reply.
            Log::warning('WorkflowChat AI call failed', [
                'workflow' => $workflowName,
                'error'    => $e->getMessage(),
            ]);

            return response()->json([
                'success'  => true,
                'source'   => 'error',
                'reply'    => "Sorry — I couldn't reach Claude just now. Please try again in a moment.",
                'workflow' => null,
                'run'      => false,
            ]);
        }
    }

    /**
     * System prompt: defines the assistant's role and, critically, the exact
     * graph schema it must produce so changes apply cleanly to the canvas.
     *
     * @param  array{nodes: array<mixed>, edges: array<mixed>}  $workflow
     * @param  string  $responseLength  'short' | 'medium' | 'detailed' — controls reply verbosity.
     */
    private function systemPrompt(string $workflowName, array $workflow, string $responseLength = 'medium'): string
    {
        $current = json_encode($workflow, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        $lengthGuidance = $this->responseLengthGuidance($responseLength);

        return <<<PROMPT
You are Claude, a friendly workflow-building assistant embedded in a visual workflow editor. You help users design, understand, and modify automation workflows on a node-and-edge canvas.

The workflow the user is currently editing is named "{$workflowName}". Its current graph is:

{$current}

# Graph schema

A workflow is a JSON object with two arrays, "nodes" and "edges".

A node is:
{
  "id": "kebab-case-unique-id",
  "type": "trigger" | "action" | "decision" | "output",
  "position": { "x": <number>, "y": <number> },
  "data": { "kind": <same as type>, "label": "Human Friendly Step Name", "description": "optional short description" }
}

Rules for nodes:
- "data.kind" MUST equal "type".
- "trigger" = how the workflow starts (use exactly one, usually at the far left).
- "action" = a step that does work.
- "decision" = a branch point with a yes/no question; it has a "true" and a "false" outgoing path.
- "output" = a terminal/end step.
- Lay nodes out left to right: increase x by ~260 per step, keep the main line at y≈160. For decision branches, fan out to y≈60 (true) and y≈260 (false).
- Reuse existing node ids when modifying an existing step; create new descriptive ids for new steps.

An edge is:
{ "id": "unique-edge-id", "source": "<node id>", "target": "<node id>", "sourceHandle": "true" | "false" (decision nodes ONLY; omit entirely otherwise) }

Rules for edges:
- Every non-trigger node should be reachable from the trigger.
- "sourceHandle" belongs ONLY on edges whose "source" is a "decision" node. For an edge leaving a decision node, set "sourceHandle" to "true" or "false".
- ALL other edges MUST NOT include a "sourceHandle" property at all — omit the key entirely (do not set it to null, "", or any other value). This applies to edges leaving "trigger", "action", and "output" nodes. For example, an edge from "escalate-to-manager" (an action node) to the next step within that same branch must have NO "sourceHandle" — only the decision node carries "true"/"false". A stray "sourceHandle" on a non-decision edge stops the executor from following it, so the branch halts early.
- Every "decision" node MUST have BOTH a "true" edge and a "false" edge — always emit two edges from a decision, one with "sourceHandle": "true" and one with "sourceHandle": "false". Never leave a branch unconnected.
- No dangling nodes: every branch path must end at its own "output" node. A branch that stops at an action node with no outgoing edge is invalid.
- Every non-"output" node MUST have at least one outgoing edge. "trigger", "action", and "decision" nodes always continue somewhere; only "output" nodes are allowed to have no outgoing edge.
- The graph must be complete: every path starting from the trigger must eventually reach an "output" node. There are no loose ends.

CRITICAL — fancy-flow does NOT support merging branches. After a decision node splits into two paths, each path MUST be completely independent and end with its OWN output node. NEVER connect two separate branch paths back into a single shared node — doing so causes the workflow to stop early. Every branch must have its own complete path: its own action nodes AND its own output node at the end. No two branches may share a target node. This means a node can never have incoming edges from two different branches.

Example of WRONG structure (a shared node is reused by both branches — never do this):
  Decision --true--> Path A --> Shared Node --> Output
  Decision --false--> Path B --> Shared Node --> Output

Example of CORRECT structure (each branch is fully independent with its own output):
  Decision --true--> Path A --> Output A
  Decision --false--> Path B --> Output B

Apply this rule to every workflow you generate. No exceptions.

Before returning the graph, validate it against these rules: confirm every decision node has both a "true" and "false" edge, confirm that NO edge leaving a non-decision node has a "sourceHandle" property, confirm no node receives incoming edges from two different branch paths (no shared/merge nodes), confirm every non-output node has at least one outgoing edge, and confirm every branch path from the trigger reaches its own output node. Fix any violations (give each branch its own action and output nodes, and strip any "sourceHandle" from non-decision edges) before responding.

# Available commands

The user can invoke these slash commands (the app expands each into a fuller instruction before you see it):
- /build, /add, /modify, /remove, /connect, /branch, /expand — create or change the workflow; return the COMPLETE updated graph in "workflow".
- /explain, /steps, /summarize, /review, /optimize, /suggest, /example — analyze or answer; set "workflow" to null.
- /steps — list every step in the workflow as a simple numbered list in plain English a non-technical person could follow, using simple action verbs, with a one sentence description for each step; put the list in "reply" and set "workflow" to null.
- /score — score the workflow's health out of 100 across completeness, clarity, efficiency, error handling, and best practices; return a markdown-formatted report in "reply" and set "workflow" to null.
- /run, /save, /clear, /reset — run, save, or reset the workflow (handled by the app).

# How to respond

Always respond with ONLY a single JSON object — no markdown, no code fences, no commentary outside the JSON. The object has:
{
  "reply": "A short, friendly, plain-English message to show in the chat. Explain what you did or answer the question.",
  "workflow": null | { "nodes": [...], "edges": [...] },
  "run": true | false
}

- {$lengthGuidance}
- When you have multiple options or suggestions, ALWAYS format them as a numbered list with each item on its own line starting with a number and period (1. 2. 3.). The UI will automatically render these as clickable buttons for the user. Never tell the user you cannot render buttons — you can, through numbered lists.
- When the user asks you to build, add, modify, remove, connect, or branch steps, set "workflow" to the COMPLETE updated graph (all nodes and all edges, not just the changes). Preserve unrelated existing nodes/edges, ids, and positions. Then describe what changed in "reply".
- When the user only asks to explain, summarize, review, or optimize — or just chats — set "workflow" to null and put your answer in "reply".
- When asked to briefly introduce this workflow (e.g. on load), give a concise, friendly 2-3 sentence introduction in "reply" — what type of process it is, what business problem it solves, and one key thing to know — set "workflow" to null and "run" to false, and don't begin the reply with the word "I".
- Never set "workflow" unless you intend to change the canvas. Returning the same graph unchanged is fine if no change is needed, but prefer null when nothing changed.
- Set "run" to true ONLY when the user asks to run, execute, start, or test the workflow (e.g. "run it", "run the workflow", "execute this", "give it a test run"). This triggers the actual workflow run on the canvas — do not describe a simulated run yourself; the canvas handles it and shows results in the run feed. You may set both "workflow" and "run" when the user asks to build/modify the workflow and then run it. In all other cases set "run" to false.
PROMPT;
    }

    /**
     * One sentence of guidance for the "reply" field's verbosity, driven by the
     * user's "Chat response length" preference. Only shapes the prose reply — the
     * workflow JSON it returns is unaffected.
     */
    private function responseLengthGuidance(string $responseLength): string
    {
        return match ($responseLength) {
            'short'    => 'Keep the "reply" very concise — one or two short sentences at most. Skip preamble and lists; just say what you did or answer directly.',
            'detailed' => 'Make the "reply" thorough and explanatory — walk through your reasoning, call out relevant steps, and use short lists where they help. Still plain English, no JSON outside the object.',
            default    => 'Keep the "reply" a balanced, moderate length — a few clear sentences. Enough to explain what you did without over-explaining.',
        };
    }

    /**
     * Build the Prism message list from prior turns plus the new user message.
     *
     * @param  array<int, array{role: string, content: string}>  $history
     * @return array<int, \Prism\Prism\Contracts\Message>
     */
    private function buildMessages(array $history, string $message): array
    {
        $messages = [];

        foreach ($history as $turn) {
            $role = $turn['role'] ?? null;
            $content = (string) ($turn['content'] ?? '');
            if ($content === '') {
                continue;
            }
            $messages[] = $role === 'assistant'
                ? new AssistantMessage($content)
                : new UserMessage($content);
        }

        $messages[] = new UserMessage($message);

        return $messages;
    }

    /**
     * Validate and normalize a workflow graph proposed by Claude. Returns a
     * clean { nodes, edges } array, or null if it isn't a usable graph.
     *
     * @return array{nodes: array<int, mixed>, edges: array<int, mixed>}|null
     */
    private function sanitizeWorkflow(mixed $workflow): ?array
    {
        if (! is_array($workflow) || ! isset($workflow['nodes']) || ! is_array($workflow['nodes'])) {
            return null;
        }

        $validTypes = ['trigger', 'action', 'decision', 'output'];
        $nodes = [];

        foreach ($workflow['nodes'] as $node) {
            if (! is_array($node) || ! isset($node['id'], $node['type'])) {
                continue;
            }
            $type = is_string($node['type']) ? $node['type'] : null;
            if (! in_array($type, $validTypes, true)) {
                continue;
            }

            $position = (isset($node['position']) && is_array($node['position']))
                ? [
                    'x' => (float) ($node['position']['x'] ?? 0),
                    'y' => (float) ($node['position']['y'] ?? 0),
                ]
                : ['x' => 0, 'y' => 0];

            $data = (isset($node['data']) && is_array($node['data'])) ? $node['data'] : [];
            $data['kind'] = $type; // enforce kind === type
            $data['label'] = isset($data['label']) && is_string($data['label']) && $data['label'] !== ''
                ? $data['label']
                : ucfirst($type);

            $nodes[] = [
                'id'       => (string) $node['id'],
                'type'     => $type,
                'position' => $position,
                'data'     => $data,
            ];
        }

        if ($nodes === []) {
            return null;
        }

        $nodeIds = array_column($nodes, 'id');
        $edges = [];
        $rawEdges = (isset($workflow['edges']) && is_array($workflow['edges'])) ? $workflow['edges'] : [];

        foreach ($rawEdges as $i => $edge) {
            if (! is_array($edge) || ! isset($edge['source'], $edge['target'])) {
                continue;
            }
            $source = (string) $edge['source'];
            $target = (string) $edge['target'];
            // Drop edges that reference nodes we didn't keep.
            if (! in_array($source, $nodeIds, true) || ! in_array($target, $nodeIds, true)) {
                continue;
            }

            $clean = [
                'id'     => isset($edge['id']) && is_string($edge['id']) && $edge['id'] !== ''
                    ? $edge['id']
                    : "e{$source}-{$target}-{$i}",
                'source' => $source,
                'target' => $target,
            ];
            if (isset($edge['sourceHandle']) && in_array($edge['sourceHandle'], ['true', 'false'], true)) {
                $clean['sourceHandle'] = $edge['sourceHandle'];
            }
            $edges[] = $clean;
        }

        return ['nodes' => $nodes, 'edges' => $edges];
    }

    /**
     * Safely extract a JSON object from Claude's text. Tolerant of code fences
     * or stray prose around the JSON. Returns null if nothing parses.
     *
     * @return array<mixed>|null
     */
    private function extractJson(string $text): ?array
    {
        $text = trim($text);

        // 1) Try the raw text first. A clean JSON object needs no unwrapping, and
        //    parsing as-is avoids any fence regex mangling a long reply that
        //    happens to contain backticks.
        $decoded = json_decode($text, true);
        if (is_array($decoded)) {
            return $decoded;
        }

        // 2) If the whole response is wrapped in a ```json … ``` (or plain ``` … ```)
        //    fence, peel ONLY the opening and closing fences. A lazy inner match
        //    (`(.+?)`) would stop at the first inner ``` — so any code fence inside
        //    the reply would truncate the JSON. Stripping just the outer fences
        //    keeps the inner content (backticks and all) intact.
        if (str_starts_with($text, '```')) {
            $unfenced = preg_replace('/^```(?:json)?[ \t]*\r?\n?/i', '', $text);
            $unfenced = preg_replace('/\r?\n?```\s*$/', '', $unfenced);
            $unfenced = trim($unfenced);

            $decoded = json_decode($unfenced, true);
            if (is_array($decoded)) {
                return $decoded;
            }

            $text = $unfenced; // fall through with the unfenced text
        }

        // 3) Last resort: grab the outermost { … } span (greedy, so it spans the
        //    entire object even when the reply contains braces) and decode that.
        if (preg_match('/\{.*\}/s', $text, $m)) {
            $decoded = json_decode($m[0], true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return null;
    }
}
