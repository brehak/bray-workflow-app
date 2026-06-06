import { Head, Link } from '@inertiajs/react';
import { FlowEditor } from '@particle-academy/fancy-flow';
import { Button, Heading, Text } from '@particle-academy/react-fancy';
import { useState, useEffect } from 'react';

const defaultGraph = {
    nodes: [
        {
            id: 'trigger',
            type: 'trigger',
            position: { x: 0, y: 160 },
            data: { kind: 'trigger', label: 'New Hire Submitted' },
        },
        {
            id: 'welcome-email',
            type: 'action',
            position: { x: 260, y: 160 },
            data: { kind: 'action', label: 'Send Welcome Email' },
        },
        {
            id: 'create-accounts',
            type: 'action',
            position: { x: 520, y: 160 },
            data: { kind: 'action', label: 'Create Accounts (GitHub, Slack, Email)' },
        },
        {
            id: 'department-check',
            type: 'decision',
            position: { x: 780, y: 160 },
            data: { kind: 'decision', label: 'Which Department?' },
        },
        {
            id: 'setup-dev',
            type: 'action',
            position: { x: 1040, y: 60 },
            data: { kind: 'action', label: 'Setup Dev Environment' },
        },
        {
            id: 'setup-design',
            type: 'action',
            position: { x: 1040, y: 260 },
            data: { kind: 'action', label: 'Setup Design Tools' },
        },
        {
            id: 'assign-training',
            type: 'action',
            position: { x: 1300, y: 160 },
            data: { kind: 'action', label: 'Assign Training' },
        },
        {
            id: 'complete',
            type: 'output',
            position: { x: 1560, y: 160 },
            data: { kind: 'output', label: 'Onboarding Complete!' },
        },
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
};

const executors = {
    trigger: () => ({ startedAt: Date.now(), hire: { name: 'Jordan', department: 'Engineering' } }),
    action: async ({ inputs, node }) => {
        await new Promise((r) => setTimeout(r, 600));
        if (node.data.label.includes('Welcome Email')) return { emailSent: true, to: inputs.in?.hire?.name };
        if (node.data.label.includes('Create Accounts')) return { github: true, slack: true, email: true };
        if (node.data.label.includes('Dev Environment')) return { repoAccess: true, ciSetup: true };
        if (node.data.label.includes('Design Tools')) return { figmaAccess: true, assetLibrary: true };
        if (node.data.label.includes('Training')) return { modulesAssigned: 4, dueDate: '2026-06-30' };
        return inputs.in;
    },
    decision: ({ inputs }) => ({
        branch: inputs.in?.hire?.department === 'Engineering' ? 'true' : 'false',
    }),
    output: ({ inputs }) => inputs.in,
};

export default function Workflow() {
    const [graph, setGraph] = useState(defaultGraph);
    const [savedId, setSavedId] = useState(null);
    const [status, setStatus] = useState(null);

    useEffect(() => {
        fetch('/workflows')
            .then((r) => r.json())
            .then((data) => {
                if (data.length > 0) {
                    const latest = data[0];
                    setGraph({ nodes: latest.nodes, edges: latest.edges });
                    setSavedId(latest.id);
                    setStatus('Loaded from database');
                }
            })
            .catch(() => setStatus('Could not load from database'));
    }, []);

    const saveWorkflow = async () => {
        setStatus('Saving...');
        try {
            const payload = {
                name: 'Employee Onboarding',
                description: 'Automates the full onboarding flow for new hires',
                nodes: graph.nodes,
                edges: graph.edges,
            };

            const url = savedId ? `/workflows/${savedId}` : '/workflows';
            const method = savedId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            setSavedId(data.id);
            setStatus('Saved successfully!');
        } catch {
            setStatus('Save failed');
        }
    };

    return (
        <>
            <Head title="Employee Onboarding" />

            <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
                <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
                    <div>
                        <Heading as="h2" size="2xl" weight="semibold">
                            Employee Onboarding
                        </Heading>
                        <Text className="mt-1 text-gray-600 dark:text-gray-400">
                            Automate your onboarding workflow — hit Run to walk a new hire through the process.
                        </Text>
                    </div>

                    <div className="flex items-center gap-3">
                        {status && (
                            <Text className="text-sm text-gray-500">{status}</Text>
                        )}
                        <Button onClick={saveWorkflow} variant="primary">
                            Save Workflow
                        </Button>
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
                            name: 'Employee Onboarding',
                            description: 'Automates the full onboarding flow for new hires',
                        }}
                    />
                </main>
            </div>
        </>
    );
} 