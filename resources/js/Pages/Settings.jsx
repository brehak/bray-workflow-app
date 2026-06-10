import { Head, Link, router } from '@inertiajs/react';
import { Button, Heading, Text, Switch, Select, RadioGroup, Input } from '@particle-academy/react-fancy';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Trash2, AlertTriangle, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import GradientDivider from '../Components/GradientDivider';
import Logo from '../Components/Logo';
import NavButton from '../Components/NavButton';
import ThemeToggle from '../Components/ThemeToggle';
import { useTheme } from '../hooks/useTheme';
import {
    ACCENT_OPTIONS,
    AUTOSAVE_OPTIONS,
    CANVAS_BG_OPTIONS,
    TAG_OPTIONS,
    getSettings,
    saveSettings,
    isGuideEnabled,
    setGuideEnabled,
} from '../lib/settings';
import { createZip, slugify } from '../lib/zip';

// Solid swatch class per accent — for the color picker row.
const ACCENT_SWATCH = {
    indigo: 'bg-indigo-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    violet: 'bg-violet-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500',
    teal: 'bg-teal-500',
};

// Entrance animation — sections fade and rise in, staggered.
const container = { hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } };

// A settings card.
function Section({ title, description, children }) {
    return (
        <motion.section
            variants={item}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900"
        >
            <Heading as="h2" size="lg" weight="semibold">
                {title}
            </Heading>
            {description && <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</Text>}
            <div className="mt-5 space-y-5">{children}</div>
        </motion.section>
    );
}

// A label/hint on the left, a control on the right (stacks on small screens).
function Row({ label, hint, children }) {
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 sm:pt-1">
                <Text className="text-sm font-medium text-gray-800 dark:text-gray-100">{label}</Text>
                {hint && <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</Text>}
            </div>
            <div className="shrink-0 sm:min-w-[14rem] sm:text-right">{children}</div>
        </div>
    );
}

export default function Settings({ workflows = [] }) {
    const { theme, setTheme } = useTheme();
    const [settings, setSettings] = useState(() => getSettings());
    const [guideOn, setGuideOn] = useState(() => isGuideEnabled());
    const [pendingClear, setPendingClear] = useState(false);
    const [status, setStatus] = useState(null); // { type: 'success' | 'error', text }

    // Persist a patch and reflect it in local state.
    const update = (patch) => setSettings(saveSettings(patch));

    const toggleTag = (tag) => {
        const has = settings.defaultTags.includes(tag);
        update({ defaultTags: has ? settings.defaultTags.filter((t) => t !== tag) : [...settings.defaultTags, tag] });
    };

    // Transient status banner, auto-dismissed.
    useEffect(() => {
        if (!status) return;
        const t = setTimeout(() => setStatus(null), 3000);
        return () => clearTimeout(t);
    }, [status]);

    // Close the clear-all modal on Escape.
    useEffect(() => {
        if (!pendingClear) return;
        const onKey = (e) => e.key === 'Escape' && setPendingClear(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [pendingClear]);

    // Bundle every saved workflow into a ZIP of JSON files and download it.
    const exportAll = () => {
        if (!workflows.length) {
            setStatus({ type: 'error', text: 'You have no saved workflows to export yet.' });
            return;
        }
        const files = workflows.map((w) => ({
            name: `${slugify(w.name)}-${w.id}.json`,
            content: JSON.stringify(
                { name: w.name, description: w.description ?? '', nodes: w.nodes, edges: w.edges, tags: w.tags ?? [] },
                null,
                2,
            ),
        }));
        const blob = createZip(files);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'workflows.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setStatus({ type: 'success', text: `Exported ${files.length} workflow${files.length === 1 ? '' : 's'} as a ZIP.` });
    };

    // Delete every saved workflow (after confirmation), then refresh.
    const clearAll = async () => {
        setPendingClear(false);
        const token = document.querySelector('meta[name="csrf-token"]').content;
        try {
            await Promise.all(
                workflows.map((w) => fetch(`/workflows/${w.id}`, { method: 'DELETE', headers: { 'X-CSRF-TOKEN': token } })),
            );
            setStatus({ type: 'success', text: 'All saved workflows have been deleted.' });
            router.reload();
        } catch {
            setStatus({ type: 'error', text: 'Something went wrong while deleting. Please try again.' });
        }
    };

    return (
        <>
            <Head title="Settings" />

            <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
                {/* Glassmorphism header — matches the rest of the app. */}
                <header className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/70 px-6 py-4 backdrop-blur-md transition-colors duration-300 dark:border-gray-800/60 dark:bg-gray-900/70">
                    <div className="mx-auto flex max-w-3xl items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <Logo className="text-indigo-600 dark:text-indigo-400" />
                            <div className="flex flex-col">
                                <Heading as="h2" size="xl" weight="semibold">
                                    Settings
                                </Heading>
                                <Text className="hidden text-xs text-gray-500 dark:text-gray-400 sm:block">
                                    Make the editor feel like yours.
                                </Text>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <ThemeToggle />
                            <Link href="/workflows-list">
                                <NavButton>Saved Workflows</NavButton>
                            </Link>
                            <Link href="/">
                                <NavButton>Back home</NavButton>
                            </Link>
                        </div>
                    </div>
                </header>

                <GradientDivider />

                <main className="mx-auto w-full max-w-3xl flex-1 p-6">
                    <motion.div variants={container} initial="hidden" animate="visible" className="space-y-6">
                        {/* ── Appearance ───────────────────────────────────────── */}
                        <Section title="Appearance" description="How the app looks.">
                            <Row label="Theme" hint="Switch between light and dark mode.">
                                <div className="flex items-center justify-end gap-2">
                                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                                        {theme === 'dark' ? 'Dark' : 'Light'}
                                    </Text>
                                    <Switch
                                        checked={theme === 'dark'}
                                        onCheckedChange={(c) => setTheme(c ? 'dark' : 'light')}
                                        aria-label="Toggle dark mode"
                                    />
                                </div>
                            </Row>

                            <Row label="Accent color" hint="Used for new workflows you create.">
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    {ACCENT_OPTIONS.map((opt) => {
                                        const selected = settings.accent === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => update({ accent: opt.value })}
                                                title={opt.label}
                                                aria-label={opt.label}
                                                aria-pressed={selected}
                                                className={`h-7 w-7 rounded-full ${ACCENT_SWATCH[opt.value]} ring-2 ring-offset-2 ring-offset-white transition-all hover:scale-110 dark:ring-offset-gray-900 ${
                                                    selected ? 'ring-gray-900 dark:ring-white' : 'ring-transparent'
                                                }`}
                                            />
                                        );
                                    })}
                                </div>
                            </Row>
                        </Section>

                        {/* ── Editor Preferences ───────────────────────────────── */}
                        <Section title="Editor Preferences" description="Defaults for the workflow editor.">
                            <Row label="Auto-save interval" hint="How often unsaved changes are saved automatically.">
                                <Select
                                    list={AUTOSAVE_OPTIONS}
                                    value={settings.autoSaveInterval}
                                    onValueChange={(v) => update({ autoSaveInterval: v })}
                                    aria-label="Auto-save interval"
                                />
                            </Row>

                            <Row label="Show beginner guide" hint="Show the tour automatically on a new blank workflow.">
                                <Switch
                                    checked={guideOn}
                                    onCheckedChange={(c) => {
                                        setGuideEnabled(c);
                                        setGuideOn(c);
                                    }}
                                    aria-label="Show beginner guide on new workflows"
                                />
                            </Row>

                            <Row label="Default canvas background" hint="The texture behind your workflow.">
                                <RadioGroup
                                    list={CANVAS_BG_OPTIONS}
                                    value={settings.canvasBackground}
                                    onValueChange={(v) => update({ canvasBackground: v })}
                                    orientation="vertical"
                                />
                            </Row>
                        </Section>

                        {/* ── Workflow Defaults ────────────────────────────────── */}
                        <Section title="Workflow Defaults" description="Applied to brand-new workflows you start.">
                            <Row label="Default tags" hint="Automatically added to new workflows.">
                                <div className="flex flex-wrap gap-2 sm:justify-end">
                                    {TAG_OPTIONS.map((tag) => {
                                        const on = settings.defaultTags.includes(tag);
                                        return (
                                            <Button
                                                key={tag}
                                                size="sm"
                                                variant={on ? 'primary' : 'outline'}
                                                color={on ? 'indigo' : 'gray'}
                                                onClick={() => toggleTag(tag)}
                                            >
                                                {tag}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </Row>

                            <Row label="Name prefix" hint="Prefilled at the start of a new workflow's name.">
                                <Input
                                    value={settings.defaultNamePrefix}
                                    onValueChange={(v) => update({ defaultNamePrefix: v })}
                                    placeholder="e.g. My "
                                    aria-label="Default workflow name prefix"
                                />
                            </Row>
                        </Section>

                        {/* ── Data ─────────────────────────────────────────────── */}
                        <Section
                            title="Data"
                            description={`You have ${workflows.length} saved workflow${workflows.length === 1 ? '' : 's'}.`}
                        >
                            <Row label="Export workflows" hint="Download every saved workflow as a ZIP of JSON files.">
                                <Button variant="outline" color="gray" onClick={exportAll} disabled={workflows.length === 0}>
                                    <span className="inline-flex items-center gap-2">
                                        <Download size={16} aria-hidden="true" />
                                        Export all
                                    </span>
                                </Button>
                            </Row>

                            <Row label="Clear saved workflows" hint="Permanently delete every saved workflow. This can't be undone.">
                                <Button
                                    variant="primary"
                                    color="red"
                                    onClick={() => setPendingClear(true)}
                                    disabled={workflows.length === 0}
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <Trash2 size={16} aria-hidden="true" />
                                        Clear all
                                    </span>
                                </Button>
                            </Row>
                        </Section>
                    </motion.div>
                </main>
            </div>

            {/* Transient status banner */}
            <AnimatePresence>
                {status && (
                    <motion.div
                        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border bg-white px-4 py-3 shadow-lg dark:bg-gray-900 ${
                            status.type === 'error'
                                ? 'border-red-200 dark:border-red-500/30'
                                : 'border-green-200 dark:border-green-500/30'
                        }`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        transition={{ duration: 0.2 }}
                    >
                        <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full ${
                                status.type === 'error'
                                    ? 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400'
                                    : 'bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400'
                            }`}
                        >
                            {status.type === 'error' ? <AlertTriangle size={14} /> : <Check size={14} />}
                        </span>
                        <Text className="text-sm text-gray-700 dark:text-gray-200">{status.text}</Text>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Clear-all confirmation modal */}
            <AnimatePresence>
                {pendingClear && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setPendingClear(false)}
                            aria-hidden="true"
                        />
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="clear-modal-title"
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
                                    <Heading as="h2" id="clear-modal-title" size="lg" weight="semibold">
                                        Clear all workflows?
                                    </Heading>
                                    <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        This permanently deletes all {workflows.length} saved workflow
                                        {workflows.length === 1 ? '' : 's'}. This action cannot be undone.
                                    </Text>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <Button variant="outline" color="gray" onClick={() => setPendingClear(false)}>
                                    Cancel
                                </Button>
                                <Button variant="primary" color="red" onClick={clearAll}>
                                    Delete all
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
