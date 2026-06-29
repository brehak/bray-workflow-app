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
 * Token strategy (a proper prompt chain):
 *   1. A concise system prompt (the graph schema is appended ONLY for edits).
 *   2. The current workflow, compressed — never the full nodes/edges JSON.
 *   3. The last 10 turns of conversation history (older turns trimmed).
 *   4. The current user message.
 *
 * Model routing keeps cost down: simple analysis commands (/steps, /explain,
 * /roles, …) run on a fast, cheap model; reasoning-heavy work (/score, /optimize)
 * and any workflow building run on a stronger model.
 *
 * Resilience mirrors AgentNodeController: the endpoint must never break the app.
 * With no API key, or on any AI failure, it degrades to a friendly text-only
 * reply that makes no canvas changes.
 */
class WorkflowChatController extends Controller
{
    /**
     * Fast, cheap model for simple Q&A / analysis that doesn't need heavy
     * reasoning or the graph schema (/steps, /explain, /roles, …).
     */
    private const MODEL_FAST = 'claude-haiku-4-5';

    /**
     * Stronger model for reasoning-heavy analysis (/score, /optimize) and all
     * workflow building/editing.
     */
    private const MODEL_SMART = 'claude-sonnet-4-6';

    /** Simple analysis commands — fast model, no graph schema. */
    private const FAST_COMMANDS = [
        '/explain', '/steps', '/summarize', '/review',
        '/risks', '/time', '/roles', '/save', '/reset', '/intro',
    ];

    /** Reasoning-heavy analysis — smart model, but still no graph schema. */
    private const SMART_ANALYSIS_COMMANDS = ['/score', '/optimize'];

    /**
     * Max output tokens for a chat turn. Kept generous so longer replies (and
     * full graphs) have ample room to finish without being truncated.
     */
    private const MAX_TOKENS = 8000;

    /** How many recent conversation turns to send. Older turns are trimmed. */
    private const HISTORY_LIMIT = 10;

    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message'                  => ['required', 'string', 'max:8000'],
            'command'                  => ['nullable', 'string', 'max:50'],
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
        $command = isset($validated['command']) ? strtolower(trim($validated['command'])) : null;
        $workflow = [
            'nodes' => $validated['workflow']['nodes'] ?? [],
            'edges' => $validated['workflow']['edges'] ?? [],
        ];

        // Pick the model and decide whether this turn can change the graph (and
        // therefore needs the full schema + a position-preserving context).
        [$model, $includeSchema] = $this->route($command);

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
            // Building turns need a position-preserving listing so Claude can
            // return a complete graph with ids/positions intact; analysis turns
            // only need the cheap arrow-flow overview.
            $context = $includeSchema
                ? $this->compactWorkflow($workflow)
                : $this->flowWorkflow($workflow);

            $response = Prism::text()
                ->using(Provider::Anthropic, $model)
                ->withSystemPrompt($this->systemPrompt($responseLength, $includeSchema))
                ->withMessages($this->buildMessages($workflowName, $context, $validated['conversation_history'] ?? [], $validated['message']))
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
                'model'    => $model,
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
     * Route a turn to a model and decide whether it needs the graph schema.
     *
     * Simple analysis commands → fast model, no schema. Reasoning-heavy analysis
     * (/score, /optimize) → smart model, no schema. Everything else — explicit
     * build commands and free-text ("build me a…") — defaults to the smart model
     * WITH the schema, since it may change the canvas.
     *
     * @return array{0: string, 1: bool}  [model, includeSchema]
     */
    private function route(?string $command): array
    {
        if ($command !== null && in_array($command, self::FAST_COMMANDS, true)) {
            return [self::MODEL_FAST, false];
        }
        if ($command !== null && in_array($command, self::SMART_ANALYSIS_COMMANDS, true)) {
            return [self::MODEL_SMART, false];
        }

        return [self::MODEL_SMART, true];
    }

    /**
     * Concise system prompt. The graph schema (everything needed to emit a valid,
     * applyable graph) is appended ONLY when the turn can change the canvas — so
     * analysis turns stay cheap and stay well under ~200 words.
     */
    private function systemPrompt(string $responseLength, bool $includeSchema): string
    {
        $lengthGuidance = $this->responseLengthGuidance($responseLength);

        $base = <<<PROMPT
You are Claude, a friendly assistant embedded in a visual workflow editor. You help users understand, analyze, and modify node-and-edge automation workflows.

Respond with ONLY a single JSON object — no markdown, no code fences, no text outside it:
{"reply": "...", "workflow": null | {"nodes": [...], "edges": [...]}, "run": true | false}

- "reply": a short, friendly, plain-English message. {$lengthGuidance}
- Set "workflow" to null unless you are actually changing the canvas.
- When you offer options or suggestions, format them as a numbered list (1. 2. 3.), each on its own line — the UI renders these as clickable buttons. Never say you can't render buttons; you can, through numbered lists.
- Set "run" to true ONLY when the user asks to run, execute, start, or test the workflow; the canvas performs the run and shows results. Otherwise set it false.
- When asked to introduce this workflow, give a concise, friendly 2-3 sentence intro (what it does, the problem it solves, one key thing to know); set "workflow" to null, "run" to false, and don't begin with the word "I".
PROMPT;

        if (! $includeSchema) {
            return $base;
        }

        $schema = <<<PROMPT


# Editing the workflow
When the user asks to build, add, modify, remove, connect, or branch steps, return the COMPLETE updated graph in "workflow" (every node and edge, not just the change), then describe what changed in "reply".

Node: {"id": "kebab-id", "type": "trigger|action|decision|output", "position": {"x": <number>, "y": <number>}, "data": {"kind": <same as type>, "label": "Step Name", "description": "optional"}}
Edge: {"id": "edge-id", "source": "<node id>", "target": "<node id>", "sourceHandle": "true|false"}

Rules:
- "data.kind" MUST equal "type". Use exactly one "trigger"; "output" nodes are terminal.
- "sourceHandle" appears ONLY on edges leaving a "decision" node ("true" or "false"). On every trigger/action/output edge, omit the key entirely (not null, not "").
- Every "decision" has BOTH a "true" and a "false" edge. Every non-output node has at least one outgoing edge. Every path ends at its own "output" node.
- Branches NEVER merge: after a decision, each branch is fully independent with its own action and output nodes — no two edges may target the same node. (Merging makes the run stop early.)
- Lay out left to right: +260 x per step, main line y≈160, decision branches y≈60 (true) / y≈260 (false).
- When modifying existing steps, REUSE their ids AND positions; create new descriptive ids for new steps; preserve unrelated nodes/edges unchanged.

Validate against these rules before responding and fix any violation.
PROMPT;

        return $base.$schema;
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
     * Build the Prism message chain:
     *   1. the current workflow, compressed (so every turn is grounded in the
     *      live canvas without resending the full JSON),
     *   2. a short assistant acknowledgement (keeps roles alternating),
     *   3. the last {@see HISTORY_LIMIT} turns of history (older turns trimmed),
     *   4. the current user message.
     *
     * @param  array<int, array{role: string, content: string}>  $history
     * @return array<int, \Prism\Prism\Contracts\Message>
     */
    private function buildMessages(string $workflowName, string $context, array $history, string $message): array
    {
        $messages = [
            new UserMessage("Current workflow \"{$workflowName}\":\n{$context}"),
            new AssistantMessage('Got it — I have the current workflow in mind.'),
        ];

        foreach (array_slice($history, -self::HISTORY_LIMIT) as $turn) {
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
     * Compressed, position-preserving listing of the workflow for BUILDING turns.
     * Far smaller than the full pretty-printed JSON, but still carries every id,
     * type, position, label, and description so Claude can return a complete graph
     * that preserves existing ids and canvas positions.
     *
     * @param  array{nodes: array<mixed>, edges: array<mixed>}  $workflow
     */
    private function compactWorkflow(array $workflow): string
    {
        $nodes = is_array($workflow['nodes'] ?? null) ? $workflow['nodes'] : [];
        $edges = is_array($workflow['edges'] ?? null) ? $workflow['edges'] : [];

        if ($nodes === []) {
            return '(empty — no steps yet)';
        }

        $lines = ['NODES (id | type | x,y | label | description):'];
        foreach ($nodes as $n) {
            if (! is_array($n) || ! isset($n['id'])) {
                continue;
            }
            $id = (string) $n['id'];
            $type = (string) ($n['type'] ?? ($n['data']['kind'] ?? 'action'));
            $x = $n['position']['x'] ?? 0;
            $y = $n['position']['y'] ?? 0;
            $label = (string) ($n['data']['label'] ?? '');
            $line = "{$id} | {$type} | {$x},{$y} | {$label}";
            $desc = isset($n['data']['description']) ? trim((string) $n['data']['description']) : '';
            if ($desc !== '') {
                $line .= " | {$desc}";
            }
            $lines[] = $line;
        }

        $lines[] = 'EDGES (source -> target [handle]):';
        foreach ($edges as $e) {
            if (! is_array($e) || ! isset($e['source'], $e['target'])) {
                continue;
            }
            $handle = (isset($e['sourceHandle']) && in_array($e['sourceHandle'], ['true', 'false'], true))
                ? " [{$e['sourceHandle']}]"
                : '';
            $lines[] = ((string) $e['source']).' -> '.((string) $e['target']).$handle;
        }

        return implode("\n", $lines);
    }

    /**
     * Ultra-compressed arrow-flow overview for ANALYSIS turns, e.g.
     *   [Trigger: Start] -> [Action: Step 1] -> [Decision: Check?] -> true: [Output: Done] / false: [Output: Failed]
     * Labels and structure only — no ids or positions, since these turns never
     * return a graph.
     *
     * @param  array{nodes: array<mixed>, edges: array<mixed>}  $workflow
     */
    private function flowWorkflow(array $workflow): string
    {
        $nodes = is_array($workflow['nodes'] ?? null) ? $workflow['nodes'] : [];
        $edges = is_array($workflow['edges'] ?? null) ? $workflow['edges'] : [];

        if ($nodes === []) {
            return '(empty — no steps yet)';
        }

        // Index nodes by id and capture outgoing edges (with their handle).
        $byId = [];
        foreach ($nodes as $n) {
            if (is_array($n) && isset($n['id'])) {
                $byId[(string) $n['id']] = $n;
            }
        }

        $out = [];
        $targets = [];
        foreach ($edges as $e) {
            if (! is_array($e) || ! isset($e['source'], $e['target'])) {
                continue;
            }
            $out[(string) $e['source']][] = [
                'target' => (string) $e['target'],
                'handle' => $e['sourceHandle'] ?? null,
            ];
            $targets[(string) $e['target']] = true;
        }

        $label = function (string $id) use ($byId): string {
            $n = $byId[$id] ?? null;
            $type = is_array($n) ? ($n['type'] ?? ($n['data']['kind'] ?? 'step')) : 'step';
            $text = is_array($n) ? ($n['data']['label'] ?? $id) : $id;

            return '['.ucfirst((string) $type).': '.$text.']';
        };

        $visited = [];
        $render = function (string $id) use (&$render, &$visited, $out, $label): string {
            if (isset($visited[$id])) {
                return $label($id).' (…)'; // already drawn — avoid looping
            }
            $visited[$id] = true;

            $next = $out[$id] ?? [];
            if ($next === []) {
                return $label($id);
            }

            // Single, unlabelled continuation → linear arrow.
            if (count($next) === 1 && ($next[0]['handle'] === null || $next[0]['handle'] === '')) {
                return $label($id).' -> '.$render($next[0]['target']);
            }

            // Branching (decision) → labelled paths joined by " / ".
            $branches = [];
            foreach ($next as $edge) {
                $tag = ($edge['handle'] === 'true' || $edge['handle'] === 'false') ? $edge['handle'].': ' : '';
                $branches[] = $tag.$render($edge['target']);
            }

            return $label($id).' -> '.implode(' / ', $branches);
        };

        // Start at trigger nodes; fall back to nodes with no incoming edge; then
        // to the first node, so something always renders.
        $starts = [];
        foreach ($byId as $id => $n) {
            $type = is_array($n) ? ($n['type'] ?? ($n['data']['kind'] ?? null)) : null;
            if ($type === 'trigger') {
                $starts[] = (string) $id;
            }
        }
        if ($starts === []) {
            foreach ($byId as $id => $n) {
                if (! isset($targets[$id])) {
                    $starts[] = (string) $id;
                }
            }
        }
        if ($starts === []) {
            $starts = array_slice(array_keys($byId), 0, 1);
        }

        $lines = [];
        foreach ($starts as $start) {
            $lines[] = $render((string) $start);
        }

        // Surface anything the traversal never reached so nothing is silently dropped.
        $orphans = [];
        foreach ($byId as $id => $n) {
            if (! isset($visited[$id])) {
                $orphans[] = $label((string) $id);
            }
        }
        $flow = implode("\n", $lines);
        if ($orphans !== []) {
            $flow .= "\n(unconnected: ".implode(', ', $orphans).')';
        }

        return $flow;
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
