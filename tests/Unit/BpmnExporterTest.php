<?php

namespace Tests\Unit;

use App\Services\BpmnExporter;
use PHPUnit\Framework\TestCase;

class BpmnExporterTest extends TestCase
{
    private function sampleNodes(): array
    {
        return [
            ['id' => 'trigger', 'type' => 'trigger', 'position' => ['x' => 0, 'y' => 160], 'data' => ['kind' => 'trigger', 'label' => 'Start']],
            ['id' => 'do-thing', 'type' => 'action', 'position' => ['x' => 260, 'y' => 160], 'data' => ['kind' => 'action', 'label' => 'Do Thing']],
            ['id' => 'check', 'type' => 'decision', 'position' => ['x' => 520, 'y' => 160], 'data' => ['kind' => 'decision', 'label' => 'Approved?']],
            ['id' => 'done', 'type' => 'output', 'position' => ['x' => 780, 'y' => 160], 'data' => ['kind' => 'output', 'label' => 'Done']],
        ];
    }

    private function sampleEdges(): array
    {
        return [
            ['id' => 'e1', 'source' => 'trigger', 'target' => 'do-thing'],
            ['id' => 'e2', 'source' => 'do-thing', 'target' => 'check'],
            ['id' => 'e3', 'source' => 'check', 'sourceHandle' => 'true', 'target' => 'done'],
        ];
    }

    public function test_it_declares_required_namespaces(): void
    {
        $xml = (new BpmnExporter)->toBpmn($this->sampleNodes(), $this->sampleEdges());

        $this->assertStringContainsString('xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"', $xml);
        $this->assertStringContainsString('xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"', $xml);
        $this->assertStringContainsString('xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"', $xml);
        $this->assertStringContainsString('xmlns:di="http://www.omg.org/spec/DD/20100524/DI"', $xml);
        $this->assertStringContainsString('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"', $xml);
    }

    public function test_it_emits_a_process_element(): void
    {
        $xml = (new BpmnExporter)->toBpmn($this->sampleNodes(), $this->sampleEdges(), ['id' => 7]);

        $this->assertStringContainsString('<bpmn:process id="Process_7" isExecutable="false">', $xml);
    }

    public function test_it_produces_well_formed_xml(): void
    {
        $xml = (new BpmnExporter)->toBpmn($this->sampleNodes(), $this->sampleEdges());

        $doc = new \DOMDocument;
        $this->assertTrue($doc->loadXML($xml), 'Exporter output should be parseable XML');
    }

    public function test_it_maps_node_types_to_bpmn_elements(): void
    {
        $xml = (new BpmnExporter)->toBpmn($this->sampleNodes(), $this->sampleEdges());

        $this->assertStringContainsString('<bpmn:startEvent id="trigger" name="Start"', $xml);
        $this->assertStringContainsString('<bpmn:task id="do-thing" name="Do Thing"', $xml);
        $this->assertStringContainsString('<bpmn:endEvent id="done" name="Done"', $xml);
    }

    public function test_it_maps_decision_to_exclusive_gateway(): void
    {
        $xml = (new BpmnExporter)->toBpmn($this->sampleNodes(), $this->sampleEdges());

        $this->assertStringContainsString('<bpmn:exclusiveGateway id="check" name="Approved?"', $xml);
    }

    public function test_it_emits_sequence_flows_with_source_and_target_refs(): void
    {
        $xml = (new BpmnExporter)->toBpmn($this->sampleNodes(), $this->sampleEdges());

        $this->assertStringContainsString('<bpmn:sequenceFlow id="flow_e1" sourceRef="trigger" targetRef="do-thing"', $xml);
        $this->assertStringContainsString('<bpmn:sequenceFlow id="flow_e2" sourceRef="do-thing" targetRef="check"', $xml);
    }

    public function test_it_emits_condition_expression_for_conditional_edges(): void
    {
        $xml = (new BpmnExporter)->toBpmn($this->sampleNodes(), $this->sampleEdges());

        $this->assertStringContainsString('<bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${true}</bpmn:conditionExpression>', $xml);
    }

    public function test_unknown_node_types_fall_back_to_task(): void
    {
        $nodes = [
            ['id' => 'weird', 'type' => 'something-unknown', 'data' => ['label' => 'Weird']],
        ];

        $xml = (new BpmnExporter)->toBpmn($nodes, []);

        $this->assertStringContainsString('<bpmn:task id="weird" name="Weird"', $xml);
    }

    public function test_it_produces_xml_safe_unique_ids(): void
    {
        $nodes = [
            // Leading digit + space -> sanitized and prefixed; label has XML specials.
            ['id' => '1 bad id', 'type' => 'trigger', 'data' => ['label' => 'A & B <c>']],
            // Two distinct raw ids that sanitize to the same value ("a_b") must
            // still produce unique BPMN ids.
            ['id' => 'a/b', 'type' => 'action', 'data' => ['label' => 'One']],
            ['id' => 'a b', 'type' => 'action', 'data' => ['label' => 'Two']],
        ];

        $xml = (new BpmnExporter)->toBpmn($nodes, []);

        // The raw id "1 bad id" is sanitized and prefixed to a valid NCName.
        $this->assertStringContainsString('id="id_1_bad_id"', $xml);
        // Colliding sanitized ids get disambiguated with a numeric suffix.
        $this->assertStringContainsString('id="a_b"', $xml);
        $this->assertStringContainsString('id="a_b_1"', $xml);
        // Special characters in labels are escaped.
        $this->assertStringContainsString('name="A &amp; B &lt;c&gt;"', $xml);
        // Output remains well-formed despite the hostile input.
        $doc = new \DOMDocument;
        $this->assertTrue($doc->loadXML($xml));
    }

    public function test_it_includes_diagram_interchange(): void
    {
        $xml = (new BpmnExporter)->toBpmn($this->sampleNodes(), $this->sampleEdges());

        $this->assertStringContainsString('<bpmndi:BPMNDiagram', $xml);
        $this->assertStringContainsString('<bpmndi:BPMNShape id="trigger_di" bpmnElement="trigger">', $xml);
        $this->assertStringContainsString('<dc:Bounds', $xml);
    }
}
