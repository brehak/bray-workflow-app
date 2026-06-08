import { Head, Link, router } from '@inertiajs/react';
import { Button, Heading, Text } from '@particle-academy/react-fancy';
import { motion } from 'framer-motion';
import ThemeToggle from '../Components/ThemeToggle';

const templates = [
    {
        id: 'onboarding',
        title: 'Employee Onboarding',
        description: 'Automate the full onboarding process for new hires — accounts, tools, training and more.',
        nodes: 8,
        edges: 8,
    },
    {
        id: 'order',
        title: 'Order Processing',
        description: 'Walk an order through the full fulfillment pipeline — payment, inventory, shipping and delivery.',
        nodes: 7,
        edges: 6,
    },
    {
        id: 'bugreport',
        title: 'Bug Report',
        description: 'Triage incoming bug reports, assign to the right developer, track fixes and close issues.',
        nodes: 7,
        edges: 7,
    },
];

export default function WorkflowList({ workflows }) {
    const deleteWorkflow = (id) => {
        if (!confirm('Are you sure you want to delete this workflow?')) return;
        fetch(`/workflows/${id}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            },
        }).then(() => router.reload());
    };

    return (
        <>
            <Head title="Saved Workflows" />

            <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
                <header className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
                    <div className="mx-auto flex max-w-5xl items-center justify-between">
                        <Heading as="h2" size="xl" weight="semibold">
                            Saved Workflows
                        </Heading>
                        <div className="flex items-center gap-3">
                            <ThemeToggle />
                            <Link href="/">
                                <Button variant="outline">Back home</Button>
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-6 mx-auto w-full max-w-5xl">

                    {/* Templates Section */}
                    <Heading as="h3" size="lg" weight="semibold" className="mb-3">
                        Templates
                    </Heading>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
                        {templates.map((template) => (
                            <motion.div
                                key={template.id}
                                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                                whileHover={{ y: -6, boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.25)' }}
                                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                            >
                                <Heading as="h3" size="lg" weight="semibold">
                                    {template.title}
                                </Heading>
                                <Text className="mt-2 text-sm text-gray-500">
                                    {template.description}
                                </Text>
                                <Text className="mt-3 text-xs text-gray-400">
                                    {template.nodes} nodes · {template.edges} edges
                                </Text>
                                <div className="mt-4">
                                    <Link href={`/workflow?type=${template.id}`}>
                                        <Button variant="primary">Launch</Button>
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Saved Workflows Section */}
                    <Heading as="h3" size="lg" weight="semibold" className="mb-3">
                        Your Saved Workflows
                    </Heading>
                    {workflows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                            <Text className="text-gray-500">No workflows saved yet.</Text>
                            <Text className="text-sm text-gray-400 mt-1">Launch a template and hit Save to get started.</Text>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {workflows.map((workflow) => (
                                <div
                                    key={workflow.id}
                                    className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                                >
                                    <Heading as="h3" size="lg" weight="semibold">
                                        {workflow.name}
                                    </Heading>
                                    {workflow.description && (
                                        <Text className="mt-1 text-sm text-gray-500">
                                            {workflow.description}
                                        </Text>
                                    )}
                                    <Text className="mt-2 text-xs text-gray-400">
                                        {workflow.nodes.length} nodes · {workflow.edges.length} edges
                                    </Text>
                                    <Text className="mt-1 text-xs text-gray-400">
                                        Saved {new Date(workflow.created_at).toLocaleDateString()}
                                    </Text>
                                    <div className="mt-4 flex gap-2">
                                        <Link href={`/workflow?id=${workflow.id}`}>
                                            <Button variant="primary" size="sm">Load</Button>
                                        </Link>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => deleteWorkflow(workflow.id)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </>
    );
} 