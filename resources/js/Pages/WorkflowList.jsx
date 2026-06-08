import { Head, Link, router } from '@inertiajs/react';
import { Badge, Button, Heading, Text } from '@particle-academy/react-fancy';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import Logo from '../Components/Logo';
import ThemeToggle from '../Components/ThemeToggle';

const templates = [
    {
        id: 'onboarding',
        title: 'Employee Onboarding',
        description: 'Automate the full onboarding process for new hires — accounts, tools, training and more.',
        nodes: 8,
        edges: 8,
        // Accent gradient for the card's top edge (full literal classes so
        // Tailwind's scanner picks them up).
        accent: 'from-blue-500 to-indigo-500',
    },
    {
        id: 'order',
        title: 'Order Processing',
        description: 'Walk an order through the full fulfillment pipeline — payment, inventory, shipping and delivery.',
        nodes: 7,
        edges: 6,
        accent: 'from-green-500 to-emerald-400',
    },
    {
        id: 'bugreport',
        title: 'Bug Report',
        description: 'Triage incoming bug reports, assign to the right developer, track fixes and close issues.',
        nodes: 7,
        edges: 7,
        accent: 'from-red-500 to-orange-400',
    },
];

export default function WorkflowList({ workflows }) {
    // The workflow awaiting delete confirmation (null = modal closed).
    const [pendingDelete, setPendingDelete] = useState(null);

    const confirmDelete = () => {
        const id = pendingDelete.id;
        setPendingDelete(null);
        fetch(`/workflows/${id}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            },
        }).then(() => router.reload());
    };

    // Close the confirmation modal on Escape.
    useEffect(() => {
        if (!pendingDelete) return;
        const onKey = (e) => {
            if (e.key === 'Escape') setPendingDelete(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [pendingDelete]);

    // Transient success message, auto-dismissed after a moment.
    const [status, setStatus] = useState(null);
    useEffect(() => {
        if (!status) return;
        const t = setTimeout(() => setStatus(null), 2800);
        return () => clearTimeout(t);
    }, [status]);

    // Duplicate a saved workflow: POST a copy (same nodes/edges/description,
    // name prefixed with "Copy of ") then reload so it appears immediately.
    // Mirrors the fetch pattern used for DELETE.
    const duplicateWorkflow = (workflow) => {
        fetch('/workflows', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            },
            body: JSON.stringify({
                name: `Copy of ${workflow.name}`,
                description: workflow.description ?? '',
                nodes: workflow.nodes,
                edges: workflow.edges,
                tags: workflow.tags ?? [],
            }),
        }).then(() => {
            setStatus(`Duplicated “${workflow.name}”`);
            router.reload();
        });
    };

    // Tag filtering. `activeTag === null` means "All". Every tag used across the
    // saved workflows becomes a filter chip.
    const [activeTag, setActiveTag] = useState(null);
    const allTags = [...new Set(workflows.flatMap((w) => w.tags ?? []))].sort();
    const visibleWorkflows = activeTag
        ? workflows.filter((w) => (w.tags ?? []).includes(activeTag))
        : workflows;
    const toggleTag = (tag) => setActiveTag((cur) => (cur === tag ? null : tag));

    return (
        <>
            <Head title="Saved Workflows" />

            <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
                <header className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/70 px-6 py-4 backdrop-blur-md transition-colors duration-300 dark:border-gray-800/60 dark:bg-gray-900/70">
                    <div className="mx-auto flex max-w-5xl items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Logo className="text-indigo-600 dark:text-indigo-400" />
                            <Heading as="h2" size="xl" weight="semibold">
                                Saved Workflows
                            </Heading>
                        </div>
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
                                className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                                whileHover={{ y: -6, boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.25)' }}
                                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                            >
                                {/* Accent gradient on the top edge */}
                                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${template.accent}`} />
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
                        <>
                            {/* Tag filter bar */}
                            {allTags.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                    className="mb-4 flex flex-wrap items-center gap-2"
                                >
                                    <Button
                                        size="sm"
                                        variant={activeTag === null ? 'primary' : 'outline'}
                                        onClick={() => setActiveTag(null)}
                                    >
                                        All
                                    </Button>
                                    {allTags.map((tag) => (
                                        <motion.div
                                            key={tag}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="inline-flex"
                                        >
                                            <Button
                                                size="sm"
                                                variant={activeTag === tag ? 'primary' : 'outline'}
                                                onClick={() => toggleTag(tag)}
                                            >
                                                {tag}
                                            </Button>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}

                            {visibleWorkflows.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                                    <Text className="text-gray-500">No workflows tagged “{activeTag}”.</Text>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTag(null)}
                                        className="mt-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
                                    >
                                        Clear filter
                                    </button>
                                </div>
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {visibleWorkflows.map((workflow) => (
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
                                            {(workflow.tags?.length ?? 0) > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    {workflow.tags.map((tag) => (
                                                        <Badge key={tag} variant="soft" size="sm" color="blue">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="mt-4 flex gap-2">
                                                <Link href={`/workflow?id=${workflow.id}`}>
                                                    <Button variant="primary" size="sm">Load</Button>
                                                </Link>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => duplicateWorkflow(workflow)}
                                                >
                                                    Duplicate
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setPendingDelete(workflow)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>

            {/* Transient success toast */}
            <AnimatePresence>
                {status && (
                    <motion.div
                        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-green-200 bg-white px-4 py-3 shadow-lg dark:border-green-500/30 dark:bg-gray-900"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        transition={{ duration: 0.2 }}
                    >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400">
                            <Check size={14} aria-hidden="true" />
                        </span>
                        <Text className="text-sm text-gray-700 dark:text-gray-200">{status}</Text>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete confirmation modal */}
            <AnimatePresence>
                {pendingDelete && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Backdrop — click outside to dismiss */}
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setPendingDelete(null)}
                            aria-hidden="true"
                        />

                        {/* Dialog */}
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="delete-modal-title"
                            className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900"
                            initial={{ opacity: 0, scale: 0.95, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 12 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                        >
                            <div className="flex items-start gap-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                                    <AlertTriangle size={22} aria-hidden="true" />
                                </div>
                                <div className="flex-1">
                                    <Heading as="h2" id="delete-modal-title" size="lg" weight="semibold">
                                        Delete Workflow?
                                    </Heading>
                                    <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        This action cannot be undone. Are you sure you want to delete this workflow?
                                    </Text>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <Button variant="outline" color="gray" onClick={() => setPendingDelete(null)}>
                                    Cancel
                                </Button>
                                <Button variant="primary" color="red" onClick={confirmDelete}>
                                    Delete
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
} 