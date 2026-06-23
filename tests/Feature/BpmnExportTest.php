<?php

namespace Tests\Feature;

use App\Models\Workflow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BpmnExportTest extends TestCase
{
    use RefreshDatabase;

    private function makeWorkflow(): Workflow
    {
        return Workflow::create([
            'name'        => 'My Flow',
            'description' => 'A test flow',
            'nodes'       => [
                ['id' => 'trigger', 'type' => 'trigger', 'position' => ['x' => 0, 'y' => 0], 'data' => ['label' => 'Start']],
                ['id' => 'act', 'type' => 'action', 'position' => ['x' => 200, 'y' => 0], 'data' => ['label' => 'Work']],
                ['id' => 'end', 'type' => 'output', 'position' => ['x' => 400, 'y' => 0], 'data' => ['label' => 'Finish']],
            ],
            'edges'       => [
                ['id' => 'e1', 'source' => 'trigger', 'target' => 'act'],
                ['id' => 'e2', 'source' => 'act', 'target' => 'end'],
            ],
        ]);
    }

    public function test_it_downloads_a_bpmn_file(): void
    {
        $workflow = $this->makeWorkflow();

        $response = $this->post("/workflows/{$workflow->id}/export/bpmn");

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/bpmn+xml');
        $response->assertHeader('Content-Disposition', "attachment; filename=\"workflow-{$workflow->id}.bpmn\"");
    }

    public function test_the_downloaded_content_is_valid_bpmn(): void
    {
        $workflow = $this->makeWorkflow();

        $xml = $this->post("/workflows/{$workflow->id}/export/bpmn")->getContent();

        $this->assertStringContainsString('<bpmn:process', $xml);
        $this->assertStringContainsString('<bpmn:startEvent id="trigger"', $xml);
        $this->assertStringContainsString('<bpmn:task id="act"', $xml);
        $this->assertStringContainsString('<bpmn:endEvent id="end"', $xml);
        $this->assertStringContainsString('<bpmn:sequenceFlow id="flow_e1" sourceRef="trigger" targetRef="act"', $xml);

        $doc = new \DOMDocument;
        $this->assertTrue($doc->loadXML($xml));
    }

    public function test_it_404s_for_an_unknown_workflow(): void
    {
        $this->post('/workflows/99999/export/bpmn')->assertNotFound();
    }
}
