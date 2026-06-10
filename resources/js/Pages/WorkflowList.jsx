import { Head, Link, router } from '@inertiajs/react';
import { Badge, Button, Heading, Text } from '@particle-academy/react-fancy';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, Search, X, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import GradientDivider from '../Components/GradientDivider';
import Logo from '../Components/Logo';
import MiniCanvas from '../Components/MiniCanvas';
import NavButton from '../Components/NavButton';
import ThemeToggle from '../Components/ThemeToggle';
import Tooltip from '../Components/Tooltip';
import '../../css/card-glow.css';

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
        // Two-tone colors for the rotating hover border (blue → indigo).
        glow: ['#3b82f6', '#6366f1'],
    },
    {
        id: 'order',
        title: 'Order Processing',
        description: 'Walk an order through the full fulfillment pipeline — payment, inventory, shipping and delivery.',
        nodes: 7,
        edges: 6,
        accent: 'from-green-500 to-emerald-400',
        glow: ['#22c55e', '#34d399'], // green → emerald
    },
    {
        id: 'bugreport',
        title: 'Bug Report',
        description: 'Triage incoming bug reports, assign to the right developer, track fixes and close issues.',
        nodes: 7,
        edges: 7,
        accent: 'from-red-600 to-red-400',
        glow: ['#dc2626', '#f87171'], // red
    },
    {
        id: 'jobapplication',
        title: 'Job Application Pipeline',
        description: 'Screen applicants, run phone and technical interviews, then route strong candidates to an offer.',
        nodes: 8,
        edges: 7,
        accent: 'from-fuchsia-500 to-purple-500',
        glow: ['#d946ef', '#a855f7'], // fuchsia → purple
    },
    {
        id: 'contentpublishing',
        title: 'Content Publishing',
        description: 'Take a draft through editorial review and SEO checks, then schedule and publish it.',
        nodes: 7,
        edges: 6,
        accent: 'from-teal-500 to-cyan-500',
        glow: ['#14b8a6', '#06b6d4'], // teal → cyan
    },
    {
        id: 'budgetapproval',
        title: 'Budget Approval',
        description: 'Validate a spend request, run department review, then route it to manager or executive approval.',
        nodes: 8,
        edges: 7,
        accent: 'from-amber-500 to-yellow-400',
        glow: ['#f59e0b', '#facc15'], // amber → yellow
    },
    {
        id: 'ptorequest',
        title: 'PTO Request',
        description: 'Check team coverage, get manager approval, update the calendar, and notify the team.',
        nodes: 8,
        edges: 7,
        accent: 'from-sky-500 to-cyan-400',
        glow: ['#0ea5e9', '#22d3ee'], // sky → cyan
    },
    {
        id: 'productrecall',
        title: 'Product Recall',
        description: 'Assess a product issue, notify regulators if needed, alert customers, and process returns.',
        nodes: 8,
        edges: 8,
        accent: 'from-orange-500 to-amber-400',
        glow: ['#f97316', '#fbbf24'], // orange → amber
    },
    {
        id: 'eventplanning',
        title: 'Event Planning',
        description: 'Book a venue, send invites, confirm arrangements once RSVPs clear, then run the day-of checklist and follow up.',
        nodes: 9,
        edges: 8,
        accent: 'from-pink-500 to-rose-500',
        glow: ['#ec4899', '#f43f5e'], // pink → rose
    },
    {
        id: 'returnrefund',
        title: 'Return & Refund',
        description: 'Verify a purchase, inspect the return, then process or deny the refund and close the case.',
        nodes: 8,
        edges: 7,
        accent: 'from-violet-500 to-purple-400',
        glow: ['#8b5cf6', '#c084fc'], // violet → purple
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
    const toggleTag = (tag) => setActiveTag((cur) => (cur === tag ? null : tag));

    // Free-text search over the saved workflows — case-insensitive, matching
    // against name, description, and tags. Combined with the tag filter above.
    const [query, setQuery] = useState('');
    const q = query.trim().toLowerCase();
    const matchesQuery = (w) => {
        if (!q) return true;
        const haystack = [w.name ?? '', w.description ?? '', ...(w.tags ?? [])].join(' ').toLowerCase();
        return haystack.includes(q);
    };
    const visibleWorkflows = workflows.filter(
        (w) => (!activeTag || (w.tags ?? []).includes(activeTag)) && matchesQuery(w),
    );

    return (
        <>
            <Head title="Saved Workflows" />

            <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
                <header className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/70 px-6 py-4 backdrop-blur-md transition-colors duration-300 dark:border-gray-800/60 dark:bg-gray-900/70">
                    <div className="mx-auto flex max-w-5xl items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <Logo className="text-indigo-600 dark:text-indigo-400" />
                            <div className="flex flex-col">
                                <Heading as="h2" size="xl" weight="semibold">
                                    Your workspace
                                </Heading>
                                <Text className="hidden text-xs text-gray-500 dark:text-gray-400 sm:block">
                                    Pick up where you left off, or start something new.
                                </Text>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link
                                href="/settings"
                                aria-label="Settings"
                                title="Settings"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-100/80 text-gray-700 transition-colors hover:bg-gray-200/80 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-gray-700/80"
                            >
                                <Settings size={18} aria-hidden="true" />
                            </Link>
                            <ThemeToggle />
                            <Link href="/">
                                <NavButton>Back home</NavButton>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Soft separator between the header and the page content */}
                <GradientDivider />

                <main className="flex-1 p-6 mx-auto w-full max-w-5xl">

                    {/* Templates Section */}
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Start with a template
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-8">
                        {templates.map((template) => (
                            <motion.div
                                key={template.id}
                                className="card-glow relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                                style={{ '--card-glow': template.glow[0], '--card-glow-2': template.glow[1] }}
                                whileHover={{ y: -6, boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.25)' }}
                                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                            >
                                {/* Accent gradient on the top edge */}
                                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${template.accent}`} />
                                <Heading as="h3" size="sm" weight="semibold" className="leading-snug">
                                    {template.title}
                                </Heading>
                                <Text className="mt-1.5 flex-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                    {template.description}
                                </Text>
                                <Text className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                                    {template.nodes} steps · {template.edges} connections
                                </Text>
                                <div className="mt-3">
                                    <Link href={`/workflow?type=${template.id}`} className="block">
                                        <Button variant="primary" size="sm" className="w-full">
                                            Launch
                                        </Button>
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Gradient divider between the Templates and Saved sections */}
                    <GradientDivider className="mb-8" />

                    {/* Saved Workflows Section */}
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Workflows you've built
                        </p>
                        {/* Search — filters the saved cards in real time. Hidden when
                            there's nothing saved yet. */}
                        {workflows.length > 0 && (
                            <div className="relative w-full sm:w-72">
                                <Search
                                    size={15}
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                                    aria-hidden="true"
                                />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search your workflows…"
                                    aria-label="Search your workflows"
                                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-500"
                                />
                                <AnimatePresence>
                                    {query && (
                                        <motion.button
                                            type="button"
                                            onClick={() => setQuery('')}
                                            aria-label="Clear search"
                                            initial={{ opacity: 0, scale: 0.6 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.6 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                                        >
                                            <X size={14} aria-hidden="true" />
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                    {workflows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                            <Text className="text-gray-500">Nothing here yet.</Text>
                            <Text className="text-sm text-gray-400 mt-1">Open a template, make it your own, and save it to see it here.</Text>
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
                                q ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                                        <Text className="text-gray-500">No workflows match your search.</Text>
                                        <Text className="mt-1 text-sm text-gray-400">
                                            Try a different term, or clear the search to see them all.
                                        </Text>
                                        <button
                                            type="button"
                                            onClick={() => setQuery('')}
                                            className="mt-2 text-sm text-blue-600 hover:underline dark:text-blue-400"
                                        >
                                            Clear search
                                        </button>
                                    </div>
                                ) : (
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
                                )
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    <AnimatePresence mode="popLayout">
                                        {visibleWorkflows.map((workflow) => (
                                            <motion.div
                                                key={workflow.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.92 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.92 }}
                                                transition={{ duration: 0.2, ease: 'easeOut' }}
                                                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                                            >
                                                {/* Mini graph preview — simplified dots + lines, not the editor. */}
                                                <MiniCanvas
                                                    nodes={workflow.nodes}
                                                    edges={workflow.edges}
                                                    className="mb-4"
                                                />
                                                <Heading as="h3" size="lg" weight="semibold">
                                                    {workflow.name}
                                                </Heading>
                                                {workflow.description && (
                                                    <Text className="mt-1 text-sm text-gray-500">
                                                        {workflow.description}
                                                    </Text>
                                                )}
                                                <Text className="mt-2 text-xs text-gray-400">
                                                    {workflow.nodes.length} steps · {workflow.edges.length} connections
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
                                                    <Tooltip label="Open this workflow in the editor">
                                                        <Link href={`/workflow?id=${workflow.id}`}>
                                                            <Button variant="primary" size="sm">Load</Button>
                                                        </Link>
                                                    </Tooltip>
                                                    <Tooltip label="Save a copy of this workflow">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => duplicateWorkflow(workflow)}
                                                        >
                                                            Duplicate
                                                        </Button>
                                                    </Tooltip>
                                                    <Tooltip label="Delete this workflow">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setPendingDelete(workflow)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </Tooltip>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
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