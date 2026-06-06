import { Head, Link } from '@inertiajs/react';
import { FlowEditor } from '@particle-academy/fancy-flow';
import { Button, Heading, Text } from '@particle-academy/react-fancy';

const sampleGraph = {
    nodes: [
        {
            id: 'trigger',
            type: 'trigger',
            position: { x: 0, y: 80 },
            data: { kind: 'trigger', label: 'Manual start' },
        },
        {
            id: 'fetch-user',
            type: 'action',
            position: { x: 260, y: 80 },
            data: { kind: 'action', label: 'Fetch user' },
        },
        {
            id: 'check-active',
            type: 'decision',
            position: { x: 520, y: 80 },
            data: { kind: 'decision', label: 'User active?' },
        },
        {
            id: 'allow',
            type: 'output',
            position: { x: 780, y: 0 },
            data: { kind: 'output', label: 'Allow access' },
        },
        {
            id: 'deny',
            type: 'output',
            position: { x: 780, y: 160 },
            data: { kind: 'output', label: 'Deny access' },
        },
        {
            id: 'note',
            type: 'note',
            position: { x: 260, y: 220 },
            data: {
                kind: 'note',
                label: 'Demo note',
                body: 'Drag nodes from the palette, connect ports, then click Run.',
            },
        },
    ],
    edges: [
        { id: 'e1', source: 'trigger', target: 'fetch-user' },
        { id: 'e2', source: 'fetch-user', target: 'check-active' },
        { id: 'e3', source: 'check-active', sourceHandle: 'true', target: 'allow' },
        { id: 'e4', source: 'check-active', sourceHandle: 'false', target: 'deny' },
    ],
};

const executors = {
    trigger: () => ({ startedAt: Date.now() }),
    action: async () => ({ id: 1, name: 'Alex', active: true }),
    decision: ({ inputs }) => ({
        branch: inputs.in?.active ? 'true' : 'false',
    }),
    output: ({ inputs }) => inputs.in,
};

export default function Workflow() {
    return (
        <>
            <Head title="Workflow Demo" />

            <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
                <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
                    <div>
                        <Heading as="h2" size="2xl" weight="semibold">
                            Workflow demo
                        </Heading>
                        <Text className="mt-1 text-gray-600 dark:text-gray-400">
                            Edit the graph, then run it to see per-node status and the event feed.
                        </Text>
                    </div>

                    <Link href="/">
                        <Button variant="outline">Back home</Button>
                    </Link>
                </header>

                <main className="flex-1 p-6">
                    <FlowEditor
                        initial={sampleGraph}
                        executors={executors}
                        height={720}
                        metadata={{
                            name: 'Access check',
                            description: 'Sample workflow powered by fancy-flow',
                        }}
                    />
                </main>
            </div>
        </>
    );
}
