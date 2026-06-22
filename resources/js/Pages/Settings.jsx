import { Head, Link, router } from '@inertiajs/react';
import { Button, Heading, Text, Switch, Select, RadioGroup, Input, MultiSwitch } from '@particle-academy/react-fancy';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Trash2, AlertTriangle, Check, Home, ArrowLeft } from 'lucide-react';
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
    DEFAULT_ZOOM_OPTIONS,
    TAG_OPTIONS,
    ANIMATION_SPEED_OPTIONS,
    TOAST_POSITION_OPTIONS,
    TOAST_DURATION_OPTIONS,
    CHAT_PANEL_DEFAULT_OPTIONS,
    CHAT_RESPONSE_LENGTH_OPTIONS,
    ANALYTICS_RANGE_OPTIONS,
    HEATMAP_COLOR_OPTIONS,
    ACTIVITY_FEED_LENGTH_OPTIONS,
    ANALYTICS_CHART_TOGGLES,
    getSettings,
    saveSettings,
    isGuideEnabled,
    setGuideEnabled,
    clearAllChatHistories,
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

// Solid swatch class per heatmap color scheme — for the Analytics color picker.
const HEATMAP_SWATCH = {
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
};

// Entrance animation — sections fade and rise in, staggered.
const container = { hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } };

// A settings group: the title + subtitle act as a label ABOVE the card, and the
// card itself holds only the controls.
function Section({ title, description, children }) {
    return (
        <motion.section variants={item}>
            <div className="mb-3 px-1">
                <Heading as="h2" size="lg" weight="semibold">
                    {title}
                </Heading>
                {description && <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</Text>}
            </div>
            <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
                {children}
            </div>
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
    const [pendingClearChats, setPendingClearChats] = useState(false);
    const [status, setStatus] = useState(null); // { type: 'success' | 'error', text }

    // Persist a patch and reflect it in local state.
    const update = (patch) => setSettings(saveSettings(patch));

    // Settings already persist on every change; this re-saves the full set to be
    // safe, then heads home.
    const saveAndGoHome = () => {
        saveSettings(settings);
        router.visit('/');
    };

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

    // Wipe every persisted Claude chat history (after inline confirmation).
    const clearChatHistories = () => {
        const count = clearAllChatHistories();
        setPendingClearChats(false);
        setStatus({
            type: 'success',
            text: count > 0 ? `Cleared ${count} chat histor${count === 1 ? 'y' : 'ies'}.` : 'No chat histories to clear.',
        });
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
            <Head title="Settings — Fancy Workflows" />

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

                            <Row label="Default zoom level" hint="The zoom the canvas opens at.">
                                <MultiSwitch
                                    list={DEFAULT_ZOOM_OPTIONS}
                                    value={settings.defaultZoom}
                                    onValueChange={(v) => update({ defaultZoom: v })}
                                    aria-label="Default zoom level"
                                />
                            </Row>

                            <Row label="Show step descriptions" hint="Show the description under each step's name on the canvas.">
                                <Switch
                                    checked={settings.showStepDescriptions}
                                    onCheckedChange={(c) => update({ showStepDescriptions: c })}
                                    aria-label="Show step descriptions"
                                />
                            </Row>

                            <Row label="Highlight active path" hint="Glow the steps a run successfully passed through when it completes.">
                                <Switch
                                    checked={settings.highlightActivePath}
                                    onCheckedChange={(c) => update({ highlightActivePath: c })}
                                    aria-label="Highlight active path"
                                />
                            </Row>

                            <Row label="Show run completion toast" hint="Show a notification when a workflow finishes running.">
                                <Switch
                                    checked={settings.showRunCompletionToast}
                                    onCheckedChange={(c) => update({ showRunCompletionToast: c })}
                                    aria-label="Show run completion toast"
                                />
                            </Row>

                            <Row label="Run feed auto-expand" hint="Automatically open the run feed when you click Run.">
                                <Switch
                                    checked={settings.runFeedAutoExpand}
                                    onCheckedChange={(c) => update({ runFeedAutoExpand: c })}
                                    aria-label="Run feed auto-expand"
                                />
                            </Row>
                        </Section>

                        {/* ── Editor & Canvas ──────────────────────────────────── */}
                        <Section title="Editor & Canvas" description="How the canvas behaves while you build and run.">
                            <Row label="Animation speed" hint="How fast node execution animations play when you run a workflow.">
                                <MultiSwitch
                                    list={ANIMATION_SPEED_OPTIONS}
                                    value={settings.animationSpeed}
                                    onValueChange={(v) => update({ animationSpeed: v })}
                                    aria-label="Animation speed"
                                />
                            </Row>

                            <Row label="Confirm before deleting nodes" hint="Ask for confirmation before a step is removed from the canvas.">
                                <Switch
                                    checked={settings.confirmNodeDelete}
                                    onCheckedChange={(c) => update({ confirmNodeDelete: c })}
                                    aria-label="Confirm before deleting nodes"
                                />
                            </Row>
                        </Section>

                        {/* ── Notifications ────────────────────────────────────── */}
                        <Section title="Notifications" description="Where and how long toast notifications appear when a workflow runs.">
                            <Row label="Toast position" hint="Which corner notifications appear in.">
                                <Select
                                    list={TOAST_POSITION_OPTIONS}
                                    value={settings.toastPosition}
                                    onValueChange={(v) => update({ toastPosition: v })}
                                    aria-label="Toast position"
                                />
                            </Row>

                            <Row label="Toast duration" hint="How long each notification stays on screen.">
                                <MultiSwitch
                                    list={TOAST_DURATION_OPTIONS}
                                    value={settings.toastDuration}
                                    onValueChange={(v) => update({ toastDuration: v })}
                                    aria-label="Toast duration"
                                />
                            </Row>
                        </Section>

                        {/* ── Display ──────────────────────────────────────────── */}
                        <Section title="Display" description="How workflows are presented around the app.">
                            <Row label="Show step counts on cards" hint="Show the “X steps · Y connections” line on workflow cards.">
                                <Switch
                                    checked={settings.showStepCounts}
                                    onCheckedChange={(c) => update({ showStepCounts: c })}
                                    aria-label="Show step counts on cards"
                                />
                            </Row>
                        </Section>

                        {/* ── Analytics ────────────────────────────────────────── */}
                        <Section title="Analytics" description="What the analytics dashboard shows and how it looks.">
                            <Row label="Default date range" hint="The range selected when you open the Analytics page.">
                                <MultiSwitch
                                    list={ANALYTICS_RANGE_OPTIONS}
                                    value={settings.analyticsDefaultRange}
                                    onValueChange={(v) => update({ analyticsDefaultRange: v })}
                                    aria-label="Default analytics date range"
                                />
                            </Row>

                            <Row label="Heatmap color scheme" hint="Color used for the activity heatmap squares.">
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    {HEATMAP_COLOR_OPTIONS.map((opt) => {
                                        const selected = settings.heatmapColor === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => update({ heatmapColor: opt.value })}
                                                title={opt.label}
                                                aria-label={opt.label}
                                                aria-pressed={selected}
                                                className={`h-7 w-7 rounded-full ${HEATMAP_SWATCH[opt.value]} ring-2 ring-offset-2 ring-offset-white transition-all hover:scale-110 dark:ring-offset-gray-900 ${
                                                    selected ? 'ring-gray-900 dark:ring-white' : 'ring-transparent'
                                                }`}
                                            />
                                        );
                                    })}
                                </div>
                            </Row>

                            {/* Per-chart visibility — one toggle per Analytics section. */}
                            {ANALYTICS_CHART_TOGGLES.map((chart) => (
                                <Row key={chart.key} label={chart.label}>
                                    <Switch
                                        checked={settings[chart.key]}
                                        onCheckedChange={(c) => update({ [chart.key]: c })}
                                        aria-label={chart.label}
                                    />
                                </Row>
                            ))}

                            <Row label="Activity feed length" hint="How many items the recent activity feed shows.">
                                <MultiSwitch
                                    list={ACTIVITY_FEED_LENGTH_OPTIONS}
                                    value={settings.activityFeedLength}
                                    onValueChange={(v) => update({ activityFeedLength: v })}
                                    aria-label="Activity feed length"
                                />
                            </Row>
                        </Section>

                        {/* ── Claude AI Settings ───────────────────────────────── */}
                        <Section title="Claude AI Settings" description="How the built-in Claude assistant looks and behaves.">
                            <Row
                                label="Chat panel default state"
                                hint="Whether the Claude chat panel is open when the workflow editor first loads."
                            >
                                <div className="flex items-center justify-end gap-2">
                                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                                        {settings.chatPanelDefault === 'closed' ? 'Stays closed' : 'Opens automatically'}
                                    </Text>
                                    <Switch
                                        checked={settings.chatPanelDefault !== 'closed'}
                                        onCheckedChange={(c) => update({ chatPanelDefault: c ? 'auto' : 'closed' })}
                                        aria-label="Chat panel default state"
                                    />
                                </div>
                            </Row>

                            <Row label="Chat response length" hint="How detailed Claude's replies in the chat panel should be.">
                                <MultiSwitch
                                    list={CHAT_RESPONSE_LENGTH_OPTIONS}
                                    value={settings.chatResponseLength}
                                    onValueChange={(v) => update({ chatResponseLength: v })}
                                    aria-label="Chat response length"
                                />
                            </Row>

                            <Row
                                label="Force Demo Mode"
                                hint="Always use built-in mock data, even when an Anthropic API key is configured."
                            >
                                <Switch
                                    checked={settings.forceDemo}
                                    onCheckedChange={(c) => update({ forceDemo: c })}
                                    aria-label="Force Demo Mode"
                                />
                            </Row>

                            <Row
                                label="Show AI reasoning in run feed"
                                hint="Show Claude's 🤖 step-by-step narration lines in the run feed when a workflow runs."
                            >
                                <Switch
                                    checked={settings.showAiReasoning}
                                    onCheckedChange={(c) => update({ showAiReasoning: c })}
                                    aria-label="Show AI reasoning in run feed"
                                />
                            </Row>

                            <Row
                                label="Clear all chat histories"
                                hint="Permanently delete every saved Claude conversation across all workflows."
                            >
                                <AnimatePresence mode="wait" initial={false}>
                                    {pendingClearChats ? (
                                        <motion.div
                                            key="confirm-chats"
                                            initial={{ opacity: 0, x: 8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 8 }}
                                            transition={{ duration: 0.15 }}
                                            className="flex items-center justify-end gap-2"
                                        >
                                            <Text className="text-xs text-gray-500 dark:text-gray-400">Clear all chats?</Text>
                                            <Button variant="primary" color="red" size="sm" onClick={clearChatHistories}>
                                                Clear
                                            </Button>
                                            <Button
                                                variant="outline"
                                                color="gray"
                                                size="sm"
                                                onClick={() => setPendingClearChats(false)}
                                            >
                                                Cancel
                                            </Button>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="clear-chats"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            <Button variant="outline" color="gray" onClick={() => setPendingClearChats(true)}>
                                                <span className="inline-flex items-center gap-2">
                                                    <Trash2 size={16} aria-hidden="true" />
                                                    Clear histories
                                                </span>
                                            </Button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Row>
                        </Section>

                        {/* ── Workflow Defaults ────────────────────────────────── */}
                        <Section title="Workflow Defaults" description="Applied to brand-new workflows you start.">
                            {/* Tags get a full-width block (label above, chips wrapping
                                below) rather than Row's narrow right column, so the long
                                list wraps cleanly instead of overflowing the card. */}
                            <div>
                                <Text className="text-sm font-medium text-gray-800 dark:text-gray-100">Default tags</Text>
                                <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                    Automatically added to new workflows.
                                </Text>
                                <div className="mt-3 flex flex-wrap gap-2">
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
                            </div>

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

                        {/* Footer actions — save everything and head home, or just go back. */}
                        <motion.div variants={item} className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-end">
                            <Button variant="outline" color="gray" onClick={() => window.history.back()}>
                                <span className="inline-flex items-center gap-2">
                                    <ArrowLeft size={16} aria-hidden="true" />
                                    Back
                                </span>
                            </Button>
                            <Button variant="primary" size="lg" onClick={saveAndGoHome}>
                                <span className="inline-flex items-center gap-2">
                                    <Home size={18} aria-hidden="true" />
                                    Save &amp; Go Home
                                </span>
                            </Button>
                        </motion.div>
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
