import { Head, Link } from '@inertiajs/react';
import { Button, Heading, Text } from '@particle-academy/react-fancy';
import { motion } from 'framer-motion';
import { Home, LayoutTemplate } from 'lucide-react';
import GradientDivider from '../Components/GradientDivider';
import Logo from '../Components/Logo';
import NavButton from '../Components/NavButton';
import ThemeToggle from '../Components/ThemeToggle';

// Per-status copy. Anything unmapped falls back to a friendly generic message.
const MESSAGES = {
    404: {
        badge: 'Error 404',
        title: 'Looks like this page got lost in the workflow',
        subtitle: "The page you're looking for doesn't exist or has been moved.",
    },
    500: {
        badge: 'Error 500',
        title: 'Something went wrong in the workflow',
        subtitle: 'An unexpected error broke the flow on our end. Give it a moment and try again.',
    },
    503: {
        badge: 'Error 503',
        title: "We're tuning up the workflow",
        subtitle: 'The app is down for a little maintenance. Please check back shortly.',
    },
    403: {
        badge: 'Error 403',
        title: 'This part of the workflow is off-limits',
        subtitle: "You don't have permission to view this page.",
    },
    419: {
        badge: 'Error 419',
        title: 'Your session took a coffee break',
        subtitle: 'The page expired. Refresh and give it another go.',
    },
};

// Shared entrance animation — children fade and rise into place (matches Welcome).
const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};
const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

/**
 * BrokenWorkflow — an on-brand SVG illustration: two connected steps on the
 * left, and a third step that's come disconnected and drifts on the right with a
 * frayed, severed wire. framer-motion gives the loose node a gentle float and
 * the break point a soft pulse. Drawn with a brand indigo→purple gradient so it
 * reads well in both light and dark mode.
 */
function BrokenWorkflow() {
    return (
        <motion.svg
            viewBox="0 0 360 200"
            className="mx-auto h-auto w-full max-w-md"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            role="img"
            aria-label="A workflow with a disconnected step"
        >
            <defs>
                <linearGradient id="wf-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
            </defs>

            {/* Connected pair (left) */}
            <g stroke="url(#wf-grad)" strokeWidth="2.5" fill="none">
                {/* solid connection between A and B */}
                <path d="M96 100 H132" strokeLinecap="round" />
                <rect x="24" y="76" width="72" height="48" rx="14" fill="url(#wf-grad)" fillOpacity="0.12" />
                <rect x="132" y="76" width="72" height="48" rx="14" fill="url(#wf-grad)" fillOpacity="0.12" />
            </g>
            {/* ports on the connected pair */}
            <circle cx="96" cy="100" r="3.5" fill="url(#wf-grad)" />
            <circle cx="132" cy="100" r="3.5" fill="url(#wf-grad)" />

            {/* Severed wire stub coming out of node B */}
            <path d="M204 100 H236" stroke="url(#wf-grad)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 7" opacity="0.7" />
            <circle cx="236" cy="100" r="3" fill="#a855f7" />

            {/* Break pulse — a soft spark at the gap */}
            <motion.circle
                cx="248"
                cy="100"
                r="5"
                fill="#f59e0b"
                animate={{ opacity: [0.25, 0.9, 0.25], scale: [0.85, 1.25, 0.85] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: '248px 100px' }}
            />

            {/* Disconnected node (right) — floats and tilts gently */}
            <motion.g
                animate={{ y: [0, -9, 0], rotate: [-3, 3, -3] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: '304px 96px' }}
            >
                {/* dangling frayed wire on its left side */}
                <path d="M268 96 H258" stroke="url(#wf-grad)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 7" opacity="0.7" />
                <circle cx="258" cy="96" r="3" fill="#a855f7" />
                <rect
                    x="268"
                    y="72"
                    width="72"
                    height="48"
                    rx="14"
                    fill="url(#wf-grad)"
                    fillOpacity="0.12"
                    stroke="url(#wf-grad)"
                    strokeWidth="2.5"
                />
                {/* a little "?" inside the lost node */}
                <text x="304" y="102" textAnchor="middle" fontSize="22" fontWeight="700" fill="url(#wf-grad)">
                    ?
                </text>
            </motion.g>
        </motion.svg>
    );
}

// Concise, human-readable browser-tab titles per status (the on-page MESSAGES
// titles are full sentences, too long for a tab).
const TAB_TITLES = {
    404: 'Page Not Found',
    500: 'Server Error',
    503: 'Under Maintenance',
    403: 'Access Denied',
    419: 'Page Expired',
};

export default function Error({ status = 404 }) {
    const info = MESSAGES[status] ?? {
        badge: `Error ${status}`,
        title: 'Something went wrong',
        subtitle: 'An unexpected error occurred. Please try again.',
    };
    const tabTitle = TAB_TITLES[status] ?? `Error ${status}`;

    return (
        <>
            <Head title={`${tabTitle} — Fancy Workflows`} />

            <div className="flex min-h-screen flex-col bg-gray-50 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(59,130,246,0.08),transparent_70%)] transition-colors duration-300 dark:bg-gray-950 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(99,102,241,0.15),transparent_70%)]">
                {/* Navigation — matches the rest of the app (glassmorphism + brand + theme). */}
                <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200/60 bg-white/70 px-6 py-4 backdrop-blur-md transition-colors duration-300 dark:border-gray-800/60 dark:bg-gray-900/70 sm:px-10">
                    <Link href="/" className="flex items-center gap-2">
                        <Logo className="text-indigo-600 dark:text-indigo-400" />
                        <Heading as="h2" size="lg" weight="semibold">
                            Fancy Workflows
                        </Heading>
                    </Link>
                    <ThemeToggle />
                </nav>

                <GradientDivider />

                <main className="flex flex-1 items-center justify-center px-6 py-16">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={stagger}
                        className="mx-auto w-full max-w-2xl text-center"
                    >
                        {/* Illustration */}
                        <motion.div variants={fadeUp} className="mb-8">
                            <BrokenWorkflow />
                        </motion.div>

                        {/* Status badge */}
                        <motion.div variants={fadeUp}>
                            <span className="inline-block rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                                {info.badge}
                            </span>
                        </motion.div>

                        {/* Headline */}
                        <motion.h1
                            variants={fadeUp}
                            className="mx-auto mt-6 max-w-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-3xl font-extrabold leading-tight tracking-tight text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 sm:text-4xl md:text-5xl"
                        >
                            {info.title}
                        </motion.h1>

                        {/* Subtitle */}
                        <motion.div variants={fadeUp}>
                            <Text className="mx-auto mt-5 max-w-md text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg">
                                {info.subtitle}
                            </Text>
                        </motion.div>

                        {/* Actions */}
                        <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center justify-center gap-3">
                            <Link href="/">
                                <motion.div className="inline-flex" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        className="rounded-full px-7 py-3.5 text-base font-semibold shadow-lg shadow-indigo-500/25"
                                    >
                                        <span className="inline-flex items-center gap-2">
                                            <Home size={18} aria-hidden="true" />
                                            Back to Home
                                        </span>
                                    </Button>
                                </motion.div>
                            </Link>
                            <Link href="/workflows-list">
                                <NavButton>
                                    <span className="inline-flex items-center gap-2">
                                        <LayoutTemplate size={18} aria-hidden="true" />
                                        Browse Templates
                                    </span>
                                </NavButton>
                            </Link>
                        </motion.div>
                    </motion.div>
                </main>
            </div>
        </>
    );
}
