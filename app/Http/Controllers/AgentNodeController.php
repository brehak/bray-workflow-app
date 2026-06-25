<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Prism\Prism\Enums\Provider;
use Prism\Prism\Facades\Prism;
use Throwable;

/**
 * Agentic node executor.
 *
 * Given a single workflow step (node), asks Claude to reason through what would
 * realistically happen at that step and to return the step's output data. Used
 * by the workflow simulator to produce believable, step-by-step run results.
 *
 * Resilience is a hard requirement: the endpoint must never break the app. If
 * no API key is configured, or the AI call fails for any reason, it degrades to
 * a deterministic mock response with the same shape.
 */
class AgentNodeController extends Controller
{
    /**
     * The Claude model used to reason through a node.
     *
     * Defaults to Anthropic's most capable model. To trade some quality for
     * lower cost/latency on this high-frequency endpoint, swap in a smaller
     * model, e.g. 'claude-haiku-4-5'.
     */
    private const MODEL = 'claude-opus-4-8';

    /**
     * Report whether live AI reasoning is available (i.e. an Anthropic API key
     * is configured). Drives the editor's "AI Mode" vs "Demo Mode" indicator.
     */
    public function status(): JsonResponse
    {
        return response()->json([
            'ai_enabled' => filled(config('prism.providers.anthropic.api_key')),
        ]);
    }

    public function run(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'node_type'     => ['required', 'string', 'max:255'],
            'node_label'    => ['required', 'string', 'max:255'],
            'workflow_name' => ['required', 'string', 'max:255'],
            'input_data'    => ['nullable'], // string or JSON object/array
            'context'       => ['nullable'], // string or JSON object/array
        ]);

        // Never call the API without a key — degrade to a deterministic mock so
        // the simulator works out of the box and the app never breaks.
        if (blank(config('prism.providers.anthropic.api_key'))) {
            return response()->json(
                $this->mockResponse($validated, 'ANTHROPIC_API_KEY is not set')
            );
        }

        try {
            $response = Prism::text()
                ->using(Provider::Anthropic, self::MODEL)
                ->withSystemPrompt($this->systemPrompt())
                ->withPrompt($this->buildPrompt($validated))
                ->withMaxTokens(1024)
                ->withClientOptions(['timeout' => 30]) // bound the request so it can't hang
                ->asText();

            $parsed = $this->extractJson($response->text);

            // Claude is asked for {"decision": ..., "output": {...}}, but be
            // tolerant: accept a flat object (treat it all as output data), or
            // fall back to the raw text if nothing parses.
            $decision = (is_array($parsed) && isset($parsed['decision']) && is_string($parsed['decision']))
                ? $parsed['decision']
                : null;

            $outputData = match (true) {
                is_array($parsed) && array_key_exists('output', $parsed) => $parsed['output'],
                is_array($parsed)                                        => $parsed,
                default                                                  => ['raw' => trim($response->text)],
            };

            return response()->json([
                'success'     => true,
                'source'      => 'ai',
                'model'       => self::MODEL,
                'decision'    => $decision ?? "Processed the \"{$validated['node_label']}\" step.",
                'output_data' => $outputData,
            ]);
        } catch (Throwable $e) {
            // Rate limit, network blip, bad key, overload — never surface a 500
            // to the simulator. Log it and return a usable mock so the run can
            // continue.
            Log::warning('AgentNode AI call failed', [
                'node'  => $validated['node_label'],
                'error' => $e->getMessage(),
            ]);

            // Return a generic reason to the client — the real error is logged
            // above; surfacing $e->getMessage() could leak internal details.
            return response()->json(
                $this->mockResponse($validated, 'AI request failed. Please try again.')
            );
        }
    }

    private function systemPrompt(): string
    {
        return 'You simulate individual steps of business workflows. Reason about what would '
            .'realistically happen at the given step, then respond with ONLY a single JSON object — '
            .'no markdown, no code fences, no commentary. The object must have exactly two keys: '
            .'"decision" (a one-sentence, plain-English summary of what happened at this step) and '
            .'"output" (an object holding the realistic output data this step would produce).';
    }

    /**
     * Build the user prompt from the incoming node payload.
     *
     * @param  array<string, mixed>  $v
     */
    private function buildPrompt(array $v): string
    {
        $input   = $this->stringify($v['input_data'] ?? null);
        $context = $this->stringify($v['context'] ?? null);

        return "You are processing a step in a {$v['workflow_name']} workflow. "
            ."The current step is {$v['node_label']} (type: {$v['node_type']}). "
            ."Given this input: {$input}, what would realistically happen at this step? "
            .($context !== 'null' ? "Additional context: {$context}. " : '')
            .'Respond with a JSON object containing the output data for this step.';
    }

    /**
     * Deterministic, safe fallback that mirrors the AI response shape.
     *
     * @param  array<string, mixed>  $v
     * @return array<string, mixed>
     */
    private function mockResponse(array $v, string $reason): array
    {
        return [
            'success'     => true,
            'source'      => 'mock',
            'model'       => null,
            'decision'    => "Simulated the \"{$v['node_label']}\" ({$v['node_type']}) step.",
            'output_data' => [
                'status'         => 'completed',
                'node'           => $v['node_label'],
                'type'           => $v['node_type'],
                'workflow'       => $v['workflow_name'],
                'received_input' => $v['input_data'] ?? null,
            ],
            'note' => "Mock response — {$reason}. Set ANTHROPIC_API_KEY in .env to enable live AI reasoning.",
        ];
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

        // Strip ```json … ``` (or plain ``` … ```) fences if present.
        if (preg_match('/```(?:json)?\s*(.+?)\s*```/is', $text, $m)) {
            $text = trim($m[1]);
        }

        $decoded = json_decode($text, true);
        if (is_array($decoded)) {
            return $decoded;
        }

        // Last resort: grab the first {...} span and try to decode that.
        if (preg_match('/\{.*\}/s', $text, $m)) {
            $decoded = json_decode($m[0], true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return null;
    }

    /**
     * Render a value (string, array, or object) for interpolation into the prompt.
     */
    private function stringify(mixed $value): string
    {
        if ($value === null) {
            return 'null';
        }

        if (is_string($value)) {
            return $value;
        }

        return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: (string) $value;
    }
}
