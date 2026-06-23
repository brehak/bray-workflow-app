<?php

namespace App\Services;

use App\Models\Workflow;

/**
 * Converts a workflow graph (nodes + edges, as stored on the Workflow model)
 * into BPMN 2.0 XML suitable for import into BPMN tooling (bpmn.io, Camunda, …).
 *
 * Node type mapping:
 *   start  / trigger  -> bpmn:startEvent
 *   end    / output   -> bpmn:endEvent
 *   task   / action   -> bpmn:task
 *   decision / branch -> bpmn:exclusiveGateway
 *   (anything else)   -> bpmn:task   (safe fallback)
 */
class BpmnExporter
{
    private const NS = [
        'bpmn'   => 'http://www.omg.org/spec/BPMN/20100524/MODEL',
        'bpmndi' => 'http://www.omg.org/spec/BPMN/20100524/DI',
        'dc'     => 'http://www.omg.org/spec/DD/20100524/DC',
        'di'     => 'http://www.omg.org/spec/DD/20100524/DI',
        'xsi'    => 'http://www.w3.org/2001/XMLSchema-instance',
    ];

    /** Map of incoming JSON node type => BPMN element local name. */
    private const TYPE_MAP = [
        'start'    => 'startEvent',
        'trigger'  => 'startEvent',
        'end'      => 'endEvent',
        'output'   => 'endEvent',
        'task'     => 'task',
        'action'   => 'task',
        'decision' => 'exclusiveGateway',
        'branch'   => 'exclusiveGateway',
    ];

    /**
     * Build BPMN XML directly from a Workflow model.
     */
    public function export(Workflow $workflow): string
    {
        return $this->toBpmn(
            $workflow->nodes ?? [],
            $workflow->edges ?? [],
            [
                'id'   => $workflow->id,
                'name' => $workflow->name,
            ],
        );
    }

    /**
     * Build BPMN XML from raw node/edge arrays.
     *
     * @param  array<int,array<string,mixed>>  $nodes
     * @param  array<int,array<string,mixed>>  $edges
     * @param  array<string,mixed>  $meta  Optional: id, name.
     */
    public function toBpmn(array $nodes, array $edges, array $meta = []): string
    {
        // Build a stable, XML-safe id for every node and remember the mapping so
        // sequence flows can resolve their source/target references.
        $idMap = [];
        $used  = [];
        foreach ($nodes as $node) {
            $original = (string) ($node['id'] ?? '');
            $idMap[$original] = $this->safeId($original ?: 'node', $used);
        }

        // Pre-compute outgoing / incoming flow ids per node for clean BPMN.
        $outgoing = [];
        $incoming = [];
        $flows    = [];
        $flowUsed = [];
        foreach ($edges as $edge) {
            $sourceOrig = (string) ($edge['source'] ?? '');
            $targetOrig = (string) ($edge['target'] ?? '');
            // Skip dangling edges that reference unknown nodes.
            if (! isset($idMap[$sourceOrig]) || ! isset($idMap[$targetOrig])) {
                continue;
            }

            $flowId = $this->safeId('flow_' . ($edge['id'] ?? ($sourceOrig . '_' . $targetOrig)), $flowUsed);
            $flow = [
                'id'        => $flowId,
                'sourceRef' => $idMap[$sourceOrig],
                'targetRef' => $idMap[$targetOrig],
                'condition' => $this->conditionFor($edge),
            ];
            $flows[] = $flow;
            $outgoing[$idMap[$sourceOrig]][] = $flowId;
            $incoming[$idMap[$targetOrig]][] = $flowId;
        }

        // Already prefixed with "Process_", so a plain char-sanitize is enough
        // to keep it a valid NCName.
        $processId = 'Process_' . $this->sanitizeChars((string) ($meta['id'] ?? '1'));

        $xml  = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= $this->definitionsOpenTag($meta);
        $xml .= '  <bpmn:process id="' . $this->attr($processId) . '" isExecutable="false">' . "\n";

        foreach ($nodes as $node) {
            $xml .= $this->renderNode($node, $idMap, $incoming, $outgoing);
        }

        foreach ($flows as $flow) {
            $xml .= $this->renderFlow($flow);
        }

        $xml .= '  </bpmn:process>' . "\n";
        $xml .= $this->renderDiagram($processId, $nodes, $flows, $idMap);
        $xml .= '</bpmn:definitions>' . "\n";

        return $xml;
    }

    private function definitionsOpenTag(array $meta): string
    {
        $defId = 'Definitions_' . $this->sanitizeChars((string) ($meta['id'] ?? '1'));

        $tag  = '<bpmn:definitions';
        foreach (self::NS as $prefix => $uri) {
            $tag .= ' xmlns:' . $prefix . '="' . $this->attr($uri) . '"';
        }
        $tag .= ' id="' . $this->attr($defId) . '"';
        $tag .= ' targetNamespace="http://bpmn.io/schema/bpmn">' . "\n";

        return $tag;
    }

    private function renderNode(array $node, array $idMap, array $incoming, array $outgoing): string
    {
        $original = (string) ($node['id'] ?? '');
        $id       = $idMap[$original];
        $element  = $this->elementFor($node);
        $label    = $this->labelFor($node);

        $xml = '    <bpmn:' . $element . ' id="' . $this->attr($id) . '"';
        if ($label !== '') {
            $xml .= ' name="' . $this->attr($label) . '"';
        }

        $ins  = $incoming[$id] ?? [];
        $outs = $outgoing[$id] ?? [];

        if ($ins === [] && $outs === []) {
            return $xml . ' />' . "\n";
        }

        $xml .= '>' . "\n";
        foreach ($ins as $flowId) {
            $xml .= '      <bpmn:incoming>' . $this->text($flowId) . '</bpmn:incoming>' . "\n";
        }
        foreach ($outs as $flowId) {
            $xml .= '      <bpmn:outgoing>' . $this->text($flowId) . '</bpmn:outgoing>' . "\n";
        }
        $xml .= '    </bpmn:' . $element . '>' . "\n";

        return $xml;
    }

    private function renderFlow(array $flow): string
    {
        $xml = '    <bpmn:sequenceFlow id="' . $this->attr($flow['id']) . '"'
            . ' sourceRef="' . $this->attr($flow['sourceRef']) . '"'
            . ' targetRef="' . $this->attr($flow['targetRef']) . '"';

        if ($flow['condition'] !== null && $flow['condition'] !== '') {
            $xml .= '>' . "\n";
            $xml .= '      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">'
                . $this->text($flow['condition'])
                . '</bpmn:conditionExpression>' . "\n";
            $xml .= '    </bpmn:sequenceFlow>' . "\n";

            return $xml;
        }

        return $xml . ' />' . "\n";
    }

    /**
     * Minimal BPMN DI so diagrams open with a layout in graphical editors.
     */
    private function renderDiagram(string $processId, array $nodes, array $flows, array $idMap): string
    {
        $xml  = '  <bpmndi:BPMNDiagram id="BPMNDiagram_1">' . "\n";
        $xml .= '    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="' . $this->attr($processId) . '">' . "\n";

        $bounds = [];
        foreach ($nodes as $node) {
            $original = (string) ($node['id'] ?? '');
            $id       = $idMap[$original];
            $element  = $this->elementFor($node);
            $x = (float) ($node['position']['x'] ?? 0);
            $y = (float) ($node['position']['y'] ?? 0);
            [$w, $h] = $this->shapeSize($element);
            $bounds[$id] = ['x' => $x, 'y' => $y, 'w' => $w, 'h' => $h];

            $xml .= '      <bpmndi:BPMNShape id="' . $this->attr($id . '_di') . '" bpmnElement="' . $this->attr($id) . '">' . "\n";
            $xml .= '        <dc:Bounds x="' . $this->num($x) . '" y="' . $this->num($y) . '" width="' . $this->num($w) . '" height="' . $this->num($h) . '" />' . "\n";
            $xml .= '      </bpmndi:BPMNShape>' . "\n";
        }

        foreach ($flows as $flow) {
            $src = $bounds[$flow['sourceRef']] ?? null;
            $tgt = $bounds[$flow['targetRef']] ?? null;
            $xml .= '      <bpmndi:BPMNEdge id="' . $this->attr($flow['id'] . '_di') . '" bpmnElement="' . $this->attr($flow['id']) . '">' . "\n";
            if ($src && $tgt) {
                $sx = $src['x'] + $src['w'];
                $sy = $src['y'] + $src['h'] / 2;
                $tx = $tgt['x'];
                $ty = $tgt['y'] + $tgt['h'] / 2;
                $xml .= '        <di:waypoint x="' . $this->num($sx) . '" y="' . $this->num($sy) . '" />' . "\n";
                $xml .= '        <di:waypoint x="' . $this->num($tx) . '" y="' . $this->num($ty) . '" />' . "\n";
            }
            $xml .= '      </bpmndi:BPMNEdge>' . "\n";
        }

        $xml .= '    </bpmndi:BPMNPlane>' . "\n";
        $xml .= '  </bpmndi:BPMNDiagram>' . "\n";

        return $xml;
    }

    /** Resolve the BPMN element local name for a node. */
    private function elementFor(array $node): string
    {
        $type = strtolower((string) ($node['type'] ?? $node['data']['kind'] ?? ''));

        return self::TYPE_MAP[$type] ?? 'task';
    }

    private function labelFor(array $node): string
    {
        return trim((string) ($node['data']['label'] ?? $node['label'] ?? ''));
    }

    /**
     * Derive a condition expression for an edge, if any. Conditional edges
     * carry either an explicit condition or a branch handle (e.g. true/false).
     */
    private function conditionFor(array $edge): ?string
    {
        $explicit = $edge['data']['condition'] ?? $edge['condition'] ?? null;
        if (is_string($explicit) && trim($explicit) !== '') {
            return trim($explicit);
        }

        $handle = $edge['sourceHandle'] ?? null;
        if (is_string($handle) && trim($handle) !== '') {
            return '${' . trim($handle) . '}';
        }

        return null;
    }

    /** @return array{0:int,1:int} width, height per BPMN element kind. */
    private function shapeSize(string $element): array
    {
        return match ($element) {
            'startEvent', 'endEvent' => [36, 36],
            'exclusiveGateway'       => [50, 50],
            default                  => [100, 80],
        };
    }

    /**
     * Produce an XML-safe, unique NCName-compatible id.
     *
     * @param  array<string,bool>  $used  Tracks already-issued ids (by reference).
     */
    private function safeId(string $raw, array &$used): string
    {
        $clean = $this->sanitizeChars($raw);
        // NCNames may not start with a digit, dot or hyphen.
        if ($clean === '' || ! preg_match('/^[A-Za-z_]/', $clean)) {
            $clean = 'id_' . $clean;
        }

        $candidate = $clean;
        $i = 1;
        while (isset($used[$candidate])) {
            $candidate = $clean . '_' . $i++;
        }
        $used[$candidate] = true;

        return $candidate;
    }

    /** Replace anything not valid in an NCName with an underscore. */
    private function sanitizeChars(string $raw): string
    {
        return preg_replace('/[^A-Za-z0-9_\-.]/', '_', $raw) ?? '';
    }

    private function attr(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }

    private function text(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }

    private function num(float $value): string
    {
        return rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.');
    }
}
