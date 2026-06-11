import { Head, Link } from '@inertiajs/react';
import { Button, Heading, Text } from '@particle-academy/react-fancy';
import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import GradientDivider from '../Components/GradientDivider';
import Logo from '../Components/Logo';
import NavButton from '../Components/NavButton';
import ThemeToggle from '../Components/ThemeToggle';

// Shared entrance animation — children fade and rise into place.
const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
};

export default function Welcome() {
    return (
        <>
            <Head title="Fancy Workflows — Build it once." />

            <div className="flex min-h-screen flex-col bg-gray-50 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(59,130,246,0.08),transparent_70%)] transition-colors duration-300 dark:bg-gray-950 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(99,102,241,0.15),transparent_70%)]">
                {/* Navigation */}
                <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200/60 bg-white/70 px-6 py-4 backdrop-blur-md transition-colors duration-300 dark:border-gray-800/60 dark:bg-gray-900/70 sm:px-10">
                    <div className="flex items-center gap-2">
                        <Logo className="text-indigo-600 dark:text-indigo-400" />
                        <Heading as="h2" size="lg" weight="semibold">
                            Fancy Workflows
                        </Heading>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href="/about"
                            className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/80 dark:hover:text-white sm:inline-flex"
                        >
                            About
                        </Link>
                        <Link
                            href="/settings"
                            aria-label="Settings"
                            title="Settings"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-100/80 text-gray-700 transition-colors hover:bg-gray-200/80 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-gray-700/80"
                        >
                            <Settings size={18} aria-hidden="true" />
                        </Link>
                        <ThemeToggle />
                    </div>
                </nav>

                <main className="flex flex-1 flex-col">
                    {/* Hero */}
                    <div className="bg-gradient-to-b from-blue-100/50 to-transparent dark:from-blue-950/40 dark:via-purple-950/20 dark:to-transparent">
                        <section className="mx-auto w-full max-w-5xl px-6 pb-20 pt-20 text-center sm:pb-28 sm:pt-28 lg:pb-32 lg:pt-40">
                        <motion.div initial="hidden" animate="visible" variants={stagger}>
                            <motion.div variants={fadeUp}>
                                <span className="inline-block rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                                    ✨ Less busywork, more flow
                                </span>
                            </motion.div>

                            <motion.h1
                                variants={fadeUp}
                                className="mx-auto mt-6 max-w-4xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-5xl font-extrabold leading-[1.05] tracking-tight text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 sm:mt-8 sm:text-6xl md:text-7xl lg:text-8xl"
                            >
                                Build it once.{' '}
                                <span className="relative inline-block">
                                    Run it forever.
                                    <motion.span
                                        aria-hidden="true"
                                        className="absolute -bottom-1 left-0 right-0 h-1 origin-left rounded-full bg-gradient-to-r from-blue-500 to-purple-500 sm:-bottom-2 sm:h-1.5"
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        transition={{ delay: 0.55, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                    />
                                </span>
                            </motion.h1>

                            {/* Soft gradient divider sitting just beneath the headline */}
                            <motion.div variants={fadeUp}>
                                <GradientDivider className="mx-auto mt-6 max-w-sm sm:mt-8" />
                            </motion.div>

                            <motion.div variants={fadeUp}>
                                <Text className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 dark:text-gray-300 sm:mt-8 sm:text-xl">
                                    Map out how your work gets done, then let it run itself. Start from a template or
                                    build your own — you'll be up and running in minutes.
                                </Text>
                            </motion.div>

                            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:mt-12">
                                {/* Primary CTA — guide users to the templates / workflows browser.
                                    Larger, filled, and badged so it clearly outranks the secondary
                                    "New Workflow" outline button. */}
                                <Link href="/workflows-list">
                                    <motion.div className="inline-flex" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                        <Button
                                            variant="primary"
                                            size="lg"
                                            className="rounded-full px-7 py-3.5 text-base font-semibold shadow-lg shadow-indigo-500/25"
                                        >
                                            <span className="inline-flex items-center gap-2.5">
                                                Browse Templates &amp; Workflows
                                                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold leading-none text-white">
                                                    11 templates
                                                </span>
                                            </span>
                                        </Button>
                                    </motion.div>
                                </Link>
                                {/* Secondary — build from scratch. */}
                                <Link href="/workflow">
                                    <NavButton>New Workflow</NavButton>
                                </Link>
                            </motion.div>

                            {/* Subtle hint nudging toward templates. */}
                            <motion.div variants={fadeUp}>
                                <Text className="mt-5 text-sm text-gray-500 dark:text-gray-400">
                                    New here? A template's the fastest way to get going.
                                </Text>
                            </motion.div>
                        </motion.div>
                    </section>
                    </div>
                </main>

                {/* Footer */}
                <footer className="border-t border-gray-200 px-6 py-8 text-center dark:border-gray-800">
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                        Fancy Workflows — automate anything, visually. Built with Laravel, Inertia &amp; React.
                    </Text>
                    <Link
                        href="/about"
                        className="mt-3 inline-flex text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400"
                    >
                        About this app
                    </Link>
                </footer>
            </div>
        </>
    );
}
