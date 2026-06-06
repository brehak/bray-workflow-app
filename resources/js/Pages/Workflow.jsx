import { Head, Link } from '@inertiajs/react';
import { FlowEditor } from '@particle-academy/fancy-flow';
import { Button, Heading, Text } from '@particle-academy/react-fancy';
import { useState, useEffect } from 'react';

const templates = {
    onboarding: {
        name: 'Employee Onboarding',
        description: 'Automates the full onboarding flow for new hires',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 0, y: 160 }, data: { kind: 'trigger', label: 'New Hire Submitted' } },
            { id: 'welcome-email', type: 'action', position: { x: 260, y: 160 }, data: { kind: 'action', label: 'Send Welcome Email' } },
            { id: 'create-accounts', type: 'action', position: { x: 520, y: 160 }, data: { kind: 'action', label: 'Create Accounts (GitHub, Slack, Email)' } },
            { id: 'department-check', type: 'decision', position: { x: 780, y: 160 }, data: { kind: 'decision', label: 'Which Department?' } },
            { id: 'setup-dev', type: 'action', position: { x: 1040, y: 60 }, data: { kind: 'action', label: 'Setup Dev Environment' } },
            { id: 'setup-design', type: 'action', position: { x: 1040, y: 260 }, data: { kind: 'action', label: 'Setup Design Tools' } },
            { id: 'assign-training', type: 'action', position: { x: 1300, y: 160 }, data: { kind: 'action', label: 'Assign Training' } },
            { id: 'complete', type: 'output', position: { x: 1560, y: 160 }, data: { kind: 'output', label: 'Onboarding Complete!' } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'welcome-email' },
            { id: 'e2', source: 'welcome-email', target: 'create-accounts' },
            { id: 'e3', source: 'create-accounts', target: 'department-check' },
            { id: 'e4', source: 'department-check', sourceHandle: 'true', target: 'setup-dev' },
            { id: 'e5', source: 'department-check', sourceHandle: 'false', target: 'setup-design' },
            { id: 'e6', source: 'setup-dev', target: 'assign-training' },
            { id: 'e7', source: 'setup-design', target: 'assign-training' },
            { id: 'e8', source: 'assign-training', target: 'complete' },
        ],
    },
    order: {
        name: 'Order Processing',
        description: 'Automates the full order fulfillment pipeline',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 0, y: 160 }, data: { kind: 'trigger', label: 'Order Placed' } },
            { id: 'payment', type: 'action', position: { x: 260, y: 160 }, data: { kind: 'action', label: 'Process Payment' } },
            { id: 'payment-check', type: 'decision', position: { x: 520, y: 160 }, data: { kind: 'decision', label: 'Payment Approved?' } },
            { id: 'inventory', type: 'action', position: { x: 780, y: 60 }, data: { kind: 'action', label: 'Check Inventory' } },
            { id: 'declined', type: 'output', position: { x: 780, y: 260 }, data: { kind: 'output', label: 'Order Declined' } },
            { id: 'ship', type: 'action', position: { x: 1040, y: 60 }, data: { kind: 'action', label: 'Ship Order' } },
            { id: 'complete', type: 'output', position: { x: 1300, y: 60 }, data: { kind: 'output', label: 'Order Complete!' } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'payment' },
            { id: 'e2', source: 'payment', target: 'payment-check' },
            { id: 'e3', source: 'payment-check', sourceHandle: 'true', target: 'inventory' },
            { id: 'e4', source: 'payment-check', sourceHandle: 'false', target: 'declined' },
            { id: 'e5', source: 'inventory', target: 'ship' },
            { id: 'e6', source: 'ship', target: 'complete' },
        ],
    },
    bugreport: {
        name: 'Bug Report',
        description: 'Triage and resolve incoming bug reports',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 0, y: 160 }, data: { kind: 'trigger', label: 'Bug Reported' } },
            { id: 'triage', type: 'action', position: { x: 260, y: 160 }, data: { kind: 'action', label: 'Triage Bug' } },
            { id: 'severity', type: 'decision', position: { x: 520, y: 160 }, data: { kind: 'decision', label: 'Critical?' } },
            { id: 'hotfix', type: 'action', position: { x: 780, y: 60 }, data: { kind: 'action', label: 'Assign Hotfix' } },
            { id: 'backlog', type: 'action', position: { x: 780, y: 260 }, data: { kind: 'action', label: 'Add to Backlog' } },
            { id: 'fix', type: 'action', position: { x: 1040, y: 160 }, data: { kind: 'action', label: 'Fix & Test' } },
            { id: 'close', type: 'output', position: { x: 1300, y: 160 }, data: { kind: 'output', label: 'Bug Closed' } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'triage' },
            { id: 'e2', source: 'triage', target: 'severity' },
            { id: 'e3', source: 'severity', sourceHandle: 'true', target: 'hotfix' },
            { id: 'e4', source: 'severity', sourceHandle: 'false', target: 'backlog' },
            { id: 'e5', source: 'hotfix', target: 'fix' },
            { id: 'e6', source: 'backlog', target: 'fix' },
            { id: 'e7', source: 'fix', target: 'close' },
        ],
    },
};

const blankGraph = { nodes: [], edges: [] };

const executors = {
    trigger: () => ({ startedAt: Date.now() }),
    action: async ({ inputs }) => {
        await new Promise((r) => setTimeout(r, 600));
        return inputs.in ?? {};
    },
    decision: ({ inputs }) => ({ branch: 'true' }),
    output: ({ inputs }) => inputs.in,
};

export default function Workflow() {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const savedId = params.get('id');

    const template = type && templates[type] ? templates[type] : null;

    const [graph, setGraph] = useState(template ?? blankGraph);
    const [name, setName] = useState(template?.name ?? '');
    const [description, setDescription] = useState(template?.description ?? '');
    const [dbId, setDbId] = useState(null);
    const [status, setStatus] = useState(null);

    useEffect(() => {
        if (savedId) {
            fetch(`/workflows/${savedId}`)
                .then((r) => r.json())
                .then((data) => {
                    setGraph({ nodes: data.nodes, edges: data.edges });
                    setName(data.name);
                    setDescription(data.description ?? '');
                    setDbId(data.id);
                    setStatus('Loaded from database');
                });
        }
    }, []);

    const saveWorkflow = async () => {
        if (!name.trim()) {
            setStatus('Please enter a workflow name');
            return;
        }
        setStatus('Saving...');
        try {
            const payload = {
                name,
                description,
                nodes: graph.nodes,
                edges: graph.edges,
            };

            const url = dbId ? `/workflows/${dbId}` : '/workflows';
            const method = dbId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            setDbId(data.id);
            setStatus('Saved successfully!');
        } catch {
            setStatus('Save failed');
        }
    };

    return (
        <>
            <Head title={name || 'New Workflow'} />

            <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
                <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex flex-col gap-1">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Workflow name..."
                            className="text-xl font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 w-full min-w-96"                        />
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add a description..."
                            className="text-sm bg-transparent border-none outline-none text-gray-500 placeholder-gray-400"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        {status && (
                            <Text className="text-sm text-gray-500">{status}</Text>
                        )}
                        <Button onClick={saveWorkflow} variant="primary">
                            Save Workflow
                        </Button>
                        <Link href="/workflows-list">
                            <Button variant="outline">Saved Workflows</Button>
                        </Link>
                        <Link href="/">
                            <Button variant="outline">Back home</Button>
                        </Link>
                    </div>
                </header>

                <main className="flex-1 p-6">
                    <FlowEditor
                        initial={graph}
                        executors={executors}
                        height={720}
                        onChange={(g) => setGraph(g)}
                        metadata={{
                            name,
                            description,
                        }}
                    />
                </main>
            </div>
        </>
    );
} 