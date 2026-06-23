import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, ContentRenderer, Heading, Text } from '@particle-academy/react-fancy';
import {
    Sparkles,
    Blocks,
    MousePointerClick,
    Play,
    Save,
    MessageSquare,
    BrainCircuit,
    BarChart3,
    SlidersHorizontal,
    X,
    ArrowLeft,
    ArrowRight,
} from 'lucide-react';

// ── Page content ───────────────────────────────────────────────────────────
// Each page is a header icon + accent gradient + title and a body renderer.
// Kept declarative so the carousel below stays simple.

// One node-type row on the "Building Blocks" page.
const BlockRow = ({ dot, name, children }) => (
    <div className="flex items-start gap-3">
        <span
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${dot}`}
            aria-hidden="true"
        />
        <Text className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            <span className="font-semibold text-gray-900 dark:text-white">{name}</span> — {children}
        </Text>
    </div>
);

// One numbered step on the "How to Build" page.
const Step = ({ n, children }) => (
    <div className="flex items-start gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
            {n}
        </span>
        <Text className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{children}</Text>
    </div>
);

// Markdown body copy for the prose pages. Authored as Markdown (bold, lists,
// `code`) and rendered through react-fancy's ContentRenderer. Kept at the
// module margin so leading indentation is never mistaken for a code block.
const WELCOME_LEAD = `A workflow is a series of steps that happen automatically, one after another. Think of it like a recipe — each step leads to the next.`;

const WELCOME_NOTE = `This quick tour shows you how to build one. It only takes a minute, and you can reopen it anytime from the **Guide** button.`;

const RUN_BODY = `Press **Run** to watch your workflow play out, step by step. Each step lights up as it runs.

The **event feed** at the bottom is a live log — it shows exactly what each step did, in plain language.

**Toast notifications** pop up in the corner to highlight key moments — like an email sent or an approval granted.`;

const SAVE_BODY = `Click **Save** (or press ⌘S) to keep your workflow. It's stored safely, so you can come back to it anytime.

Not sure where to start? Open **Saved Workflows** to browse ready-made templates.

**Duplicate** any template to make a copy, then tweak the steps to fit your own process.`;

const CHAT_BODY = `Open the **chat panel** on the right to build and edit workflows just by describing them — Claude sees your live canvas and applies the changes for you.

Type **\`/\`** to pull up slash commands, including:

- \`/build\` — generate a workflow from a description
- \`/explain\` — explain what the workflow does
- \`/run\` — run the workflow
- \`/optimize\` — suggest ways to improve it

Click any step and the config panel shows an **Ask Claude about this step** section, with **Explain this step** and **Improve this step** buttons.`;

const AI_MODE_BODY = `Check the badge next to the workflow name at the top to see how your steps will run:

- **AI Mode** — action steps are powered by **real Claude AI**, reasoning through each one as it runs.
- **Demo Mode** — steps use built-in mock data, so you can explore everything without an API key.

In **AI Mode**, Claude decides what happens at each AI-enabled action step — the same reasoning that powers the chat assistant.`;

const ANALYTICS_BODY = `Curious how your workflows are shaping up? Open the **Analytics** page for the big picture.

It tracks things like:

- **Totals** — workflows saved, runs completed, and tags used
- **Charts** — workflows by template type and tag, plus creation activity over time
- **Recent activity** — a feed of what you've worked on lately

It's the easiest way to spot trends across everything you've built.`;

const SETTINGS_BODY = `Open the **Settings** page to tailor the editor to how you like to work.

Adjust things like the **theme** and accent color, **auto-save** interval, canvas background and zoom, run-feed behavior, Claude chat preferences, and more.

Set it once, and every workflow follows your preferences.`;

const PAGES = [
    {
        key: 'welcome',
        icon: Sparkles,
        accent: 'from-blue-500 to-indigo-500',
        title: 'Welcome to the Workflow Editor',
        body: () => (
            <div className="space-y-4">
                <ContentRenderer
                    format="markdown"
                    value={WELCOME_LEAD}
                    className="text-base leading-relaxed text-gray-600 dark:text-gray-300"
                />
                <ContentRenderer
                    format="markdown"
                    value={WELCOME_NOTE}
                    className="text-sm leading-relaxed text-gray-500 dark:text-gray-400"
                />
            </div>
        ),
    },
    {
        key: 'blocks',
        icon: Blocks,
        accent: 'from-violet-500 to-purple-500',
        title: 'Building Blocks',
        body: () => (
            <div className="space-y-3.5">
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                    Every workflow is made from a few simple pieces:
                </Text>
                <BlockRow dot="bg-green-100 dark:bg-green-500/20" name="🟢 Start">
                    every workflow needs a starting point.
                </BlockRow>
                <BlockRow dot="bg-blue-100 dark:bg-blue-500/20" name="🔵 Action">
                    something that happens, like sending an email or checking a value.
                </BlockRow>
                <BlockRow dot="bg-orange-100 dark:bg-orange-500/20" name="🟠 Decision (Yes/No)">
                    a fork in the road based on a condition.
                </BlockRow>
                <BlockRow dot="bg-purple-100 dark:bg-purple-500/20" name="🟣 Output">
                    the end result of your workflow.
                </BlockRow>
            </div>
        ),
    },
    {
        key: 'build',
        icon: MousePointerClick,
        accent: 'from-emerald-500 to-teal-500',
        title: 'How to Build',
        body: () => (
            <div className="space-y-3.5">
                <Step n={1}>
                    Drag a <span className="font-semibold text-gray-900 dark:text-white">Start</span> node from the left
                    panel onto the canvas.
                </Step>
                <Step n={2}>
                    Drag an <span className="font-semibold text-gray-900 dark:text-white">Action</span> node, then
                    connect it to Start by dragging from the little dot on the node's right edge.
                </Step>
                <Step n={3}>
                    Add a <span className="font-semibold text-gray-900 dark:text-white">Decision</span> node to create
                    branching paths — one route for “yes,” another for “no.”
                </Step>
                <Step n={4}>
                    Finish with an <span className="font-semibold text-gray-900 dark:text-white">Output</span> node to
                    mark the end result.
                </Step>
            </div>
        ),
    },
    {
        key: 'run',
        icon: Play,
        accent: 'from-amber-500 to-orange-500',
        title: 'Running Your Workflow',
        body: () => (
            <ContentRenderer
                format="markdown"
                value={RUN_BODY}
                className="space-y-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300"
            />
        ),
    },
    {
        key: 'save',
        icon: Save,
        accent: 'from-pink-500 to-rose-500',
        title: 'Saving & Templates',
        body: () => (
            <ContentRenderer
                format="markdown"
                value={SAVE_BODY}
                className="space-y-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300"
            />
        ),
    },
    {
        key: 'chat',
        icon: MessageSquare,
        accent: 'from-indigo-500 to-purple-500',
        title: 'Claude AI Chat Assistant',
        body: () => (
            <ContentRenderer
                format="markdown"
                value={CHAT_BODY}
                className="space-y-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300"
            />
        ),
    },
    {
        key: 'ai-mode',
        icon: BrainCircuit,
        accent: 'from-fuchsia-500 to-purple-500',
        title: 'AI Mode vs Demo Mode',
        body: () => (
            <ContentRenderer
                format="markdown"
                value={AI_MODE_BODY}
                className="space-y-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300"
            />
        ),
    },
    {
        key: 'analytics',
        icon: BarChart3,
        accent: 'from-cyan-500 to-blue-500',
        title: 'Insights & Analytics',
        body: () => (
            <ContentRenderer
                format="markdown"
                value={ANALYTICS_BODY}
                className="space-y-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300"
            />
        ),
    },
    {
        key: 'settings',
        icon: SlidersHorizontal,
        accent: 'from-slate-500 to-gray-600',
        title: 'Make It Yours',
        body: () => (
            <ContentRenderer
                format="markdown"
                value={SETTINGS_BODY}
                className="space-y-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300"
            />
        ),
    },
];

// Direction-aware slide for the page carousel.
const pageVariants = {
    enter: (dir) => ({ x: dir >= 0 ? 48 : -48, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir >= 0 ? -48 : 48, opacity: 0 }),
};

/**
 * BeginnerGuide — a friendly, multi-page onboarding tour for the workflow
 * editor, in the style of Notion / Figma's first-run guides. Click through 5
 * pages with Next / Back; framer-motion handles the page transitions. A
 * "Don't show this again" checkbox is surfaced; its value is handed back through
 * `onClose(dontShowAgain)` so the host can persist the preference.
 */
export default function BeginnerGuide({ open, onClose }) {
    const [[page, direction], setPage] = useState([0, 0]);
    const [dontShowAgain, setDontShowAgain] = useState(true);

    // Restart at the first page each time the guide is opened.
    useEffect(() => {
        if (open) setPage([0, 0]);
    }, [open]);

    const isLast = page === PAGES.length - 1;
    const isFirst = page === 0;
    const current = PAGES[page];
    const Icon = current.icon;

    const go = (delta) => setPage(([p]) => [Math.min(PAGES.length - 1, Math.max(0, p + delta)), delta]);
    const close = () => onClose?.(dontShowAgain);

    // Escape closes; ←/→ flip pages (only while open).
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === 'Escape') close();
            else if (e.key === 'ArrowRight' && !isLast) go(1);
            else if (e.key === 'ArrowLeft' && !isFirst) go(-1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, isLast, isFirst, dontShowAgain]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* Backdrop — click to dismiss. */}
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={close} aria-hidden="true" />

                    {/* Card */}
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="guide-title"
                        className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/50 bg-white shadow-2xl dark:border-white/10 dark:bg-gray-900"
                        initial={{ opacity: 0, scale: 0.96, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 16 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                    >
                        {/* Accent gradient strip + close button */}
                        <div className={`h-1.5 w-full bg-gradient-to-r ${current.accent} transition-colors duration-300`} />
                        <button
                            type="button"
                            onClick={close}
                            aria-label="Close guide"
                            className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                        >
                            <X size={18} aria-hidden="true" />
                        </button>

                        <div className="px-7 pb-6 pt-7">
                            {/* Step counter */}
                            <Text className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                Step {page + 1} of {PAGES.length}
                            </Text>

                            {/* Animated page body. Fixed min-height so the footer doesn't
                                jump as pages of different lengths slide through. */}
                            <div className="relative min-h-[268px]">
                                <AnimatePresence mode="wait" custom={direction}>
                                    <motion.div
                                        key={current.key}
                                        custom={direction}
                                        variants={pageVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                                    >
                                        {/* Header icon */}
                                        <div
                                            className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${current.accent}`}
                                        >
                                            <Icon size={26} aria-hidden="true" />
                                        </div>

                                        <Heading as="h2" id="guide-title" size="xl" weight="bold" className="mb-3">
                                            {current.title}
                                        </Heading>

                                        {current.body()}
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Progress dots */}
                            <div className="mt-6 flex items-center justify-center gap-2">
                                {PAGES.map((p, i) => (
                                    <button
                                        key={p.key}
                                        type="button"
                                        onClick={() => setPage([i, i > page ? 1 : -1])}
                                        aria-label={`Go to step ${i + 1}`}
                                        aria-current={i === page}
                                        className={`h-2 rounded-full transition-all duration-300 ${
                                            i === page
                                                ? 'w-6 bg-indigo-600 dark:bg-indigo-400'
                                                : 'w-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Footer: don't-show-again + Back / Next */}
                        <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/80 px-7 py-4 dark:border-gray-800 dark:bg-gray-900/60">
                            <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <input
                                    type="checkbox"
                                    checked={dontShowAgain}
                                    onChange={(e) => setDontShowAgain(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800"
                                />
                                Don't show this again
                            </label>

                            <div className="flex items-center gap-2">
                                {!isFirst && (
                                    <Button variant="outline" color="gray" size="sm" onClick={() => go(-1)}>
                                        <span className="inline-flex items-center gap-1.5">
                                            <ArrowLeft size={15} aria-hidden="true" />
                                            Back
                                        </span>
                                    </Button>
                                )}
                                {isLast ? (
                                    <Button variant="primary" size="sm" onClick={close}>
                                        Get started
                                    </Button>
                                ) : (
                                    <Button variant="primary" size="sm" onClick={() => go(1)}>
                                        <span className="inline-flex items-center gap-1.5">
                                            Next
                                            <ArrowRight size={15} aria-hidden="true" />
                                        </span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
