import { Head, Link } from '@inertiajs/react';
import { Button, Heading, Text } from '@particle-academy/react-fancy';
import { motion } from 'framer-motion';
import {
    Activity,
    ArrowRight,
    Bell,
    BrainCircuit,
    Copy,
    ExternalLink,
    FileJson,
    GraduationCap,
    History,
    Keyboard,
    LayoutTemplate,
    MessageSquare,
    MoonStar,
    Save,
    Search,
    Settings,
    Sparkles,
    Tags,
    Workflow,
} from 'lucide-react';
import FancyBadge from '../Components/FancyBadge';
import GradientDivider from '../Components/GradientDivider';
import Logo from '../Components/Logo';
import NavButton from '../Components/NavButton';
import ThemeToggle from '../Components/ThemeToggle';

// Shared entrance animation — children fade and rise into place (matches Welcome).
const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

// Wraps a section so its children stagger in the first time it scrolls into view.
function Section({ children, className = '' }) {
    return (
        <motion.section
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className={className}
        >
            {children}
        </motion.section>
    );
}

/* ------------------------------------------------------------------ *
 * Brand marks for the "Built With" grid. Each is a compact, single-
 * purpose SVG (or lucide icon) in the project's tile so the row reads
 * as a cohesive set across light/dark mode.
 * ------------------------------------------------------------------ */
function LaravelMark() {
    return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#FF2D20" aria-hidden="true">
            <path d="M23.642 5.43a.364.364 0 0 1 .014.1v5.149c0 .135-.073.26-.189.326l-4.323 2.49v4.934a.378.378 0 0 1-.188.326L9.93 23.949a.316.316 0 0 1-.066.027c-.008.002-.016.008-.024.01a.348.348 0 0 1-.192 0c-.011-.002-.02-.008-.03-.012-.02-.008-.042-.014-.062-.025L.533 18.755a.376.376 0 0 1-.189-.326V2.974c0-.033.005-.066.014-.098.003-.012.01-.02.014-.032a.369.369 0 0 1 .023-.058c.004-.013.015-.022.023-.033l.033-.045c.012-.01.025-.018.037-.027.014-.012.027-.024.041-.034h.001L5.043.05a.375.375 0 0 1 .375 0L9.93 2.647h.002c.015.01.027.021.04.033l.038.027c.013.014.02.03.033.045.008.011.02.021.025.033.01.02.017.038.024.058.003.011.01.021.013.032.01.031.014.064.014.098v9.652l3.76-2.164V5.527c0-.033.004-.066.013-.098.003-.01.01-.02.013-.032a.487.487 0 0 1 .024-.059c.007-.012.018-.02.025-.033.012-.015.021-.03.033-.043.012-.012.025-.02.037-.028.014-.01.026-.023.041-.032h.001l4.513-2.598a.375.375 0 0 1 .375 0l4.513 2.598c.016.01.027.021.042.031.012.01.025.018.036.028.013.014.022.03.034.044.008.012.019.021.024.033.011.02.018.04.024.06.006.01.012.021.015.032z" />
        </svg>
    );
}

function ReactMark() {
    return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
            <circle cx="12" cy="12" r="2.05" fill="#61DAFB" />
            <g fill="none" stroke="#61DAFB" strokeWidth="1">
                <ellipse cx="12" cy="12" rx="10" ry="4.4" />
                <ellipse cx="12" cy="12" rx="10" ry="4.4" transform="rotate(60 12 12)" />
                <ellipse cx="12" cy="12" rx="10" ry="4.4" transform="rotate(120 12 12)" />
            </g>
        </svg>
    );
}

function TailwindMark() {
    return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#38BDF8" aria-hidden="true">
            <path d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 14.99 11.96 17.6 11.96c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C15.935 6.142 14.611 4.8 12.001 4.8zM6.001 11.96c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624 1.177 1.194 2.501 2.536 5.111 2.536 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C9.935 13.302 8.611 11.96 6.001 11.96z" />
        </svg>
    );
}

function FramerMark() {
    return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#0055FF" aria-hidden="true">
            <path d="M4 0h16v8h-8zM4 8h8l8 8H4zM4 16h8v8z" />
        </svg>
    );
}

function PrismMark() {
    // A literal prism — a triangle splitting light into a spectrum, nodding to
    // Prism PHP's role of routing prompts to the Claude models.
    return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
            <path d="M12 3 3 19h18z" fill="none" stroke="#A855F7" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M12 11 22 8M12 13 22 13M12 15 22 18" fill="none" stroke="#A855F7" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
    );
}

function InertiaMark() {
    // Forward chevrons — evokes Inertia's motion mark.
    return (
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-violet-600 dark:text-violet-400" fill="currentColor" aria-hidden="true">
            <path d="M3 4h4l6 8-6 8H3l6-8zM11 4h4l6 8-6 8h-4l6-8z" />
        </svg>
    );
}

const BUILT_WITH = [
    {
        name: 'react-fancy',
        by: 'Particle Academy',
        href: 'https://ui.particle.academy',
        icon: <Sparkles className="h-6 w-6 text-indigo-500" aria-hidden="true" />,
        blurb: 'The polished UI kit — buttons, headings, badges and more.',
    },
    {
        name: 'fancy-flow',
        by: 'Particle Academy',
        href: 'https://ui.particle.academy',
        icon: <Workflow className="h-6 w-6 text-purple-500" aria-hidden="true" />,
        blurb: 'The node-based canvas that powers the workflow builder.',
    },
    {
        name: 'Laravel',
        href: 'https://laravel.com',
        icon: <LaravelMark />,
        blurb: 'The PHP framework serving the app and its data.',
    },
    {
        name: 'Prism PHP',
        href: 'https://prismphp.com',
        icon: <PrismMark />,
        blurb: 'The elegant LLM toolkit that wires our nodes and chat to Claude.',
    },
    {
        name: 'Inertia.js',
        href: 'https://inertiajs.com',
        icon: <InertiaMark />,
        blurb: 'The bridge between Laravel and React — SPA, no API needed.',
    },
    {
        name: 'React',
        href: 'https://react.dev',
        icon: <ReactMark />,
        blurb: 'The component library behind every page and interaction.',
    },
    {
        name: 'Framer Motion',
        href: 'https://www.framer.com/motion/',
        icon: <FramerMark />,
        blurb: 'The animation engine for every fade, slide and spring.',
    },
    {
        name: 'Tailwind CSS',
        href: 'https://tailwindcss.com',
        icon: <TailwindMark />,
        blurb: 'The utility-first styling that keeps the design consistent.',
    },
];

const FEATURES = [
    {
        icon: Workflow,
        title: 'Visual Builder',
        body: 'Drag, drop and connect steps on an infinite canvas — no code required.',
    },
    {
        icon: MessageSquare,
        title: 'Claude AI Assistant',
        body: 'A built-in chat panel where Claude builds, edits and explains your workflow in plain English.',
    },
    {
        icon: BrainCircuit,
        title: 'Agentic AI Nodes',
        body: 'Flip a node into AI Mode and real Claude reasoning decides what happens at that step.',
    },
    {
        icon: LayoutTemplate,
        title: 'Ready-Made Templates',
        body: 'Start from one of 10 real-world workflows and tailor it to your needs.',
    },
    {
        icon: Activity,
        title: 'Live Simulation',
        body: 'Run a workflow and watch each step execute in a real-time run feed.',
    },
    {
        icon: Bell,
        title: 'Toast Notifications',
        body: 'Polished FlowRunnerUx toasts surface every run, save and error as it happens.',
    },
    {
        icon: History,
        title: 'Run History',
        body: 'Revisit past runs in a collapsible panel to see exactly what happened.',
    },
    {
        icon: Keyboard,
        title: 'Keyboard Shortcuts',
        body: 'Move fast with shortcuts for the actions you reach for most.',
    },
    {
        icon: GraduationCap,
        title: 'Guided Onboarding',
        body: 'A step-by-step beginner guide gets newcomers building in minutes.',
    },
    {
        icon: Save,
        title: 'Autosave',
        body: 'Your work is saved as you go, so you never lose a change.',
    },
    {
        icon: FileJson,
        title: 'Export & Import',
        body: 'Move any workflow in or out as portable JSON — back it up or share it.',
    },
    {
        icon: Copy,
        title: 'Duplicate Workflows',
        body: 'Clone an existing flow in one click and branch off in a new direction.',
    },
    {
        icon: Tags,
        title: 'Tags & Filtering',
        body: 'Organize workflows with tags, then filter your library down in seconds.',
    },
    {
        icon: Search,
        title: 'Instant Search',
        body: 'Find any workflow by name as you type, no matter how large your library grows.',
    },
    {
        icon: Settings,
        title: 'Settings',
        body: 'Tune display and editor preferences from a dedicated settings page.',
    },
    {
        icon: MoonStar,
        title: 'Dark & Light Mode',
        body: 'A theme that follows your system preference, or set it yourself.',
    },
];

// The browsable workflow templates (kept in sync with WorkflowList.jsx).
const TEMPLATES = [
    { title: 'Employee Onboarding', description: 'Automate the full onboarding process for new hires — accounts, tools, training and more.', dot: 'from-blue-500 to-indigo-500' },
    { title: 'Order Processing', description: 'Walk an order through the full fulfillment pipeline — payment, inventory, shipping and delivery.', dot: 'from-green-500 to-emerald-400' },
    { title: 'Bug Report', description: 'Triage incoming bug reports, assign to the right developer, track fixes and close issues.', dot: 'from-red-600 to-red-400' },
    { title: 'Job Application Pipeline', description: 'Screen applicants, run phone and technical interviews, then route strong candidates to an offer.', dot: 'from-fuchsia-500 to-purple-500' },
    { title: 'Content Publishing', description: 'Take a draft through editorial review and SEO checks, then schedule and publish it.', dot: 'from-teal-500 to-cyan-500' },
    { title: 'Budget Approval', description: 'Validate a spend request, run department review, then route it to manager or executive approval.', dot: 'from-amber-500 to-yellow-400' },
    { title: 'PTO Request', description: 'Check team coverage, get manager approval, update the calendar, and notify the team.', dot: 'from-sky-500 to-cyan-400' },
    { title: 'Product Recall', description: 'Assess a product issue, notify regulators if needed, alert customers, and process returns.', dot: 'from-orange-500 to-amber-400' },
    { title: 'Event Planning', description: 'Book a venue, send invites, confirm arrangements once RSVPs clear, then run the day-of checklist and follow up.', dot: 'from-pink-500 to-rose-500' },
    { title: 'Return & Refund', description: 'Verify a purchase, inspect the return, then process or deny the refund and close the case.', dot: 'from-violet-500 to-purple-400' },
];

const GETTING_STARTED = [
    { comment: 'Clone the repo and step in', lines: ['git clone <your-repo-url> fancy-workflows', 'cd fancy-workflows'] },
    { comment: 'Install PHP and JS dependencies', lines: ['composer install', 'npm install'] },
    { comment: 'Set up the database', lines: ['cp .env.example .env', 'php artisan key:generate', 'php artisan migrate'] },
    { comment: 'Run it — in two terminals', lines: ['php artisan serve', 'npm run dev'] },
];

export default function About() {
    return (
        <>
            <Head title="About — Fancy Workflows" />

            <div className="flex min-h-screen flex-col bg-gray-50 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(59,130,246,0.08),transparent_70%)] transition-colors duration-300 dark:bg-gray-950 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(99,102,241,0.15),transparent_70%)]">
                {/* Navigation — glassmorphism header, matches the rest of the app. */}
                <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200/60 bg-white/70 px-6 py-4 backdrop-blur-md transition-colors duration-300 dark:border-gray-800/60 dark:bg-gray-900/70 sm:px-10">
                    <Link href="/" className="flex items-center gap-2">
                        <Logo className="text-indigo-600 dark:text-indigo-400" />
                        <Heading as="h2" size="lg" weight="semibold">
                            Fancy Workflows
                        </Heading>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Link href="/">
                            <NavButton>Home</NavButton>
                        </Link>
                        <ThemeToggle />
                    </div>
                </nav>

                <main className="flex flex-1 flex-col">
                    {/* Hero */}
                    <div className="bg-gradient-to-b from-blue-100/50 to-transparent dark:from-blue-950/40 dark:via-purple-950/20 dark:to-transparent">
                        <section className="mx-auto w-full max-w-4xl px-6 pb-16 pt-20 text-center sm:pb-20 sm:pt-28">
                            <motion.div initial="hidden" animate="visible" variants={stagger}>
                                <motion.div variants={fadeUp}>
                                    <span className="inline-block rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                                        ✨ About the app
                                    </span>
                                </motion.div>

                                <motion.h1
                                    variants={fadeUp}
                                    className="mx-auto mt-6 max-w-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-4xl font-extrabold leading-[1.08] tracking-tight text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 sm:text-5xl md:text-6xl"
                                >
                                    Fancy Workflows
                                </motion.h1>

                                <motion.div variants={fadeUp}>
                                    <GradientDivider className="mx-auto mt-6 max-w-xs" />
                                </motion.div>

                                <motion.div variants={fadeUp}>
                                    <Text className="mx-auto mt-6 max-w-2xl text-lg font-medium text-gray-700 dark:text-gray-200">
                                        Less busywork, more flow.
                                    </Text>
                                </motion.div>

                                <motion.div variants={fadeUp}>
                                    <Text className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg">
                                        Fancy Workflows is a visual builder for mapping out how your work gets done — then
                                        watching it run. Drag steps onto a canvas, connect them into a flow, and simulate a
                                        run to see each stage play out live. Start from one of ten real-world templates or
                                        let the built-in Claude assistant build one for you. With agentic AI nodes powered by
                                        real Claude reasoning, it's a showcase of what a modern, no-code automation tool can
                                        feel like.
                                    </Text>
                                </motion.div>

                                <motion.div variants={fadeUp} className="mt-9">
                                    <Link href="/">
                                        <motion.div className="inline-flex" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                            <Button
                                                variant="primary"
                                                size="lg"
                                                className="rounded-full px-7 py-3.5 text-base font-semibold shadow-lg shadow-indigo-500/25"
                                            >
                                                <span className="inline-flex items-center gap-2">
                                                    Start Building
                                                    <ArrowRight size={18} aria-hidden="true" />
                                                </span>
                                            </Button>
                                        </motion.div>
                                    </Link>
                                </motion.div>
                            </motion.div>
                        </section>
                    </div>

                    <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-20">
                        {/* Built With */}
                        <Section className="scroll-mt-24">
                            <motion.div variants={fadeUp} className="text-center">
                                <Heading as="h2" size="2xl" weight="bold" className="text-gray-900 dark:text-white">
                                    Built With
                                </Heading>
                                <Text className="mx-auto mt-3 max-w-xl text-gray-600 dark:text-gray-400">
                                    Standing on the shoulders of some excellent open-source tools.
                                </Text>
                            </motion.div>

                            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {BUILT_WITH.map((tool) => (
                                    <motion.a
                                        key={tool.name}
                                        href={tool.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        variants={fadeUp}
                                        whileHover={{ y: -4 }}
                                        className="group flex items-start gap-4 rounded-2xl border border-gray-200/70 bg-white/70 p-5 shadow-sm backdrop-blur transition-colors hover:border-indigo-300/80 hover:shadow-md dark:border-gray-800/70 dark:bg-gray-900/60 dark:hover:border-indigo-700/70"
                                    >
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-950">
                                            {tool.icon}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-semibold text-gray-900 dark:text-white">{tool.name}</span>
                                                <ExternalLink
                                                    size={14}
                                                    className="text-gray-400 opacity-0 transition-opacity group-hover:opacity-100"
                                                    aria-hidden="true"
                                                />
                                            </div>
                                            {tool.by && (
                                                <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400">by {tool.by}</div>
                                            )}
                                            <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{tool.blurb}</p>
                                        </div>
                                    </motion.a>
                                ))}
                            </div>
                        </Section>

                        {/* Features */}
                        <Section className="mt-20">
                            <motion.div variants={fadeUp} className="text-center">
                                <Heading as="h2" size="2xl" weight="bold" className="text-gray-900 dark:text-white">
                                    Features
                                </Heading>
                                <Text className="mx-auto mt-3 max-w-xl text-gray-600 dark:text-gray-400">
                                    Everything you need to design, run and refine a workflow — and a few things you didn't
                                    expect.
                                </Text>
                            </motion.div>

                            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {FEATURES.map(({ icon: Icon, title, body }) => (
                                    <motion.div
                                        key={title}
                                        variants={fadeUp}
                                        className="rounded-2xl border border-gray-200/70 bg-white/70 p-5 shadow-sm backdrop-blur transition-colors hover:border-indigo-300/80 dark:border-gray-800/70 dark:bg-gray-900/60 dark:hover:border-indigo-700/70"
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 text-indigo-600 dark:text-indigo-400">
                                            <Icon size={20} aria-hidden="true" />
                                        </div>
                                        <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">{title}</h3>
                                        <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{body}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </Section>

                        {/* AI & Agentic */}
                        <Section className="mt-20">
                            <motion.div variants={fadeUp} className="text-center">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/70 bg-indigo-50/80 px-4 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-800/60 dark:bg-indigo-950/40 dark:text-indigo-300">
                                    <Sparkles size={14} aria-hidden="true" />
                                    Powered by Claude
                                </span>
                                <Heading as="h2" size="2xl" weight="bold" className="mt-4 text-gray-900 dark:text-white">
                                    Real AI, Built In
                                </Heading>
                                <Text className="mx-auto mt-3 max-w-2xl text-gray-600 dark:text-gray-400">
                                    This isn't a canned demo. Fancy Workflows talks to Anthropic's Claude through Prism PHP,
                                    so the assistant and your nodes are backed by genuine, state-of-the-art reasoning.
                                </Text>
                            </motion.div>

                            <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-2">
                                <motion.div
                                    variants={fadeUp}
                                    whileHover={{ y: -4 }}
                                    className="relative overflow-hidden rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/80 to-purple-50/50 p-6 shadow-sm backdrop-blur transition-colors dark:border-indigo-800/50 dark:from-indigo-950/40 dark:to-purple-950/20"
                                >
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/30">
                                        <MessageSquare size={22} aria-hidden="true" />
                                    </div>
                                    <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">Claude Chat Assistant</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                                        A conversational sidebar lives right inside the editor. Ask Claude to build a workflow
                                        from a sentence, add or remove steps, or explain what a flow does — it sees your live
                                        canvas, remembers the conversation, and applies its proposed changes straight to the
                                        graph. Slash commands like <code className="rounded bg-white/60 px-1 py-0.5 font-mono text-xs text-indigo-700 dark:bg-gray-900/60 dark:text-indigo-300">/build</code> and{' '}
                                        <code className="rounded bg-white/60 px-1 py-0.5 font-mono text-xs text-indigo-700 dark:bg-gray-900/60 dark:text-indigo-300">/run</code> make it effortless.
                                    </p>
                                </motion.div>

                                <motion.div
                                    variants={fadeUp}
                                    whileHover={{ y: -4 }}
                                    className="relative overflow-hidden rounded-2xl border border-purple-200/60 bg-gradient-to-br from-purple-50/80 to-fuchsia-50/50 p-6 shadow-sm backdrop-blur transition-colors dark:border-purple-800/50 dark:from-purple-950/40 dark:to-fuchsia-950/20"
                                >
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white shadow-md shadow-purple-500/30">
                                        <BrainCircuit size={22} aria-hidden="true" />
                                    </div>
                                    <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">Agentic AI Nodes</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                                        Switch any step into AI Mode and it stops being a static box. At runtime, Claude reasons
                                        through that node — interpreting its context and deciding the outcome — so a single
                                        workflow can blend scripted steps with live, intelligent decisions. Every call is routed
                                        through Prism PHP to Anthropic's most capable model.
                                    </p>
                                </motion.div>
                            </div>
                        </Section>

                        {/* Templates */}
                        <Section className="mt-20">
                            <motion.div variants={fadeUp} className="text-center">
                                <Heading as="h2" size="2xl" weight="bold" className="text-gray-900 dark:text-white">
                                    Workflow Templates
                                </Heading>
                                <Text className="mx-auto mt-3 max-w-xl text-gray-600 dark:text-gray-400">
                                    Ten ready-to-run flows covering common business processes.
                                </Text>
                            </motion.div>

                            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {TEMPLATES.map((template, i) => (
                                    <motion.div
                                        key={template.title}
                                        variants={fadeUp}
                                        className="flex items-start gap-4 rounded-xl border border-gray-200/70 bg-white/70 p-4 backdrop-blur transition-colors hover:border-indigo-300/80 dark:border-gray-800/70 dark:bg-gray-900/60 dark:hover:border-indigo-700/70"
                                    >
                                        <div className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${template.dot} text-xs font-bold text-white shadow-sm`}>
                                            {i + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">{template.title}</h3>
                                            <p className="mt-0.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{template.description}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <motion.div variants={fadeUp} className="mt-6 text-center">
                                <Link href="/workflows-list" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400">
                                    Browse all templates
                                    <ArrowRight size={15} aria-hidden="true" />
                                </Link>
                            </motion.div>
                        </Section>

                        {/* Getting Started */}
                        <Section className="mt-20">
                            <motion.div variants={fadeUp} className="text-center">
                                <Heading as="h2" size="2xl" weight="bold" className="text-gray-900 dark:text-white">
                                    Getting Started
                                </Heading>
                                <Text className="mx-auto mt-3 max-w-xl text-gray-600 dark:text-gray-400">
                                    Run Fancy Workflows locally in a few commands.
                                </Text>
                            </motion.div>

                            <motion.div
                                variants={fadeUp}
                                className="mx-auto mt-10 max-w-2xl overflow-hidden rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm backdrop-blur dark:border-gray-800/70 dark:bg-gray-900/70"
                            >
                                {/* Terminal chrome */}
                                <div className="flex items-center gap-1.5 border-b border-gray-200/70 bg-gray-50/80 px-4 py-3 dark:border-gray-800/70 dark:bg-gray-950/60">
                                    <span className="h-3 w-3 rounded-full bg-red-400" />
                                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                                    <span className="h-3 w-3 rounded-full bg-green-400" />
                                    <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">terminal</span>
                                </div>

                                <div className="space-y-4 p-5 font-mono text-sm">
                                    {GETTING_STARTED.map((step) => (
                                        <div key={step.comment}>
                                            <div className="text-gray-400 dark:text-gray-500"># {step.comment}</div>
                                            {step.lines.map((line) => (
                                                <div key={line} className="flex items-start gap-2 text-gray-800 dark:text-gray-200">
                                                    <span className="select-none text-indigo-500 dark:text-indigo-400">$</span>
                                                    <span className="break-all">{line}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            <motion.div variants={fadeUp}>
                                <Text className="mx-auto mt-4 max-w-2xl text-center text-sm text-gray-500 dark:text-gray-400">
                                    Keep <span className="font-semibold text-gray-700 dark:text-gray-300">php artisan serve</span> and{' '}
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">npm run dev</span> running in
                                    separate terminals, then open the served URL in your browser.
                                </Text>
                            </motion.div>
                        </Section>

                        {/* Closing CTA */}
                        <Section className="mt-20 text-center">
                            <motion.div variants={fadeUp}>
                                <Heading as="h2" size="2xl" weight="bold" className="text-gray-900 dark:text-white">
                                    Ready to build something?
                                </Heading>
                                <Text className="mx-auto mt-3 max-w-lg text-gray-600 dark:text-gray-400">
                                    Jump back to the home page and start mapping out your first workflow.
                                </Text>
                                <div className="mt-7">
                                    <Link href="/">
                                        <motion.div className="inline-flex" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                            <Button
                                                variant="primary"
                                                size="lg"
                                                className="rounded-full px-7 py-3.5 text-base font-semibold shadow-lg shadow-indigo-500/25"
                                            >
                                                <span className="inline-flex items-center gap-2">
                                                    Start Building
                                                    <ArrowRight size={18} aria-hidden="true" />
                                                </span>
                                            </Button>
                                        </motion.div>
                                    </Link>
                                </div>
                            </motion.div>
                        </Section>
                    </div>
                </main>

                {/* Footer */}
                <footer className="border-t border-gray-200 px-6 py-8 text-center dark:border-gray-800">
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                        Fancy Workflows — automate anything, visually. Built with Laravel, Inertia, React &amp; Claude.
                    </Text>
                    <div className="mt-4 flex justify-center">
                        <FancyBadge />
                    </div>
                </footer>
            </div>
        </>
    );
}
