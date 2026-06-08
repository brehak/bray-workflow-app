import { Head, Link } from '@inertiajs/react';
import { Button, Card, Heading, Text } from '@particle-academy/react-fancy';
import { motion } from 'framer-motion';
import Logo from '../Components/Logo';
import NavButton from '../Components/NavButton';
import ThemeToggle from '../Components/ThemeToggle';

const features = [
    {
        id: 'onboarding',
        emoji: '🚀',
        title: 'Employee Onboarding',
        description: 'Provision accounts, set up tools, and assign training automatically the moment a new hire is submitted.',
    },
    {
        id: 'order',
        emoji: '📦',
        title: 'Order Processing',
        description: 'Take every order from payment through inventory, shipping, and delivery without lifting a finger.',
    },
    {
        id: 'bugreport',
        emoji: '🐛',
        title: 'Bug Report',
        description: 'Triage incoming bugs, route them to the right developer, and track each fix through to close.',
    },
];

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
            <Head title="Fancy Workflows" />

            <div className="flex min-h-screen flex-col bg-gray-50 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(59,130,246,0.08),transparent_70%)] transition-colors duration-300 dark:bg-gray-950 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(99,102,241,0.15),transparent_70%)]">
                {/* Navigation */}
                <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200/60 bg-white/70 px-6 py-4 backdrop-blur-md transition-colors duration-300 dark:border-gray-800/60 dark:bg-gray-900/70 sm:px-10">
                    <div className="flex items-center gap-2">
                        <Logo className="text-indigo-600 dark:text-indigo-400" />
                        <Heading as="h2" size="lg" weight="semibold">
                            Fancy Workflows
                        </Heading>
                    </div>
                    <ThemeToggle />
                </nav>

                <main className="flex flex-1 flex-col">
                    {/* Hero */}
                    <div className="bg-gradient-to-b from-blue-100/50 to-transparent dark:from-blue-950/40 dark:via-purple-950/20 dark:to-transparent">
                        <section className="mx-auto w-full max-w-5xl px-6 pb-20 pt-20 text-center sm:pb-28 sm:pt-28 lg:pb-32 lg:pt-40">
                        <motion.div initial="hidden" animate="visible" variants={stagger}>
                            <motion.div variants={fadeUp}>
                                <span className="inline-block rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                                    ✨ Visual workflow automation
                                </span>
                            </motion.div>

                            <motion.h1
                                variants={fadeUp}
                                className="mx-auto mt-6 max-w-4xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-5xl font-extrabold leading-[1.05] tracking-tight text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 sm:mt-8 sm:text-6xl md:text-7xl lg:text-8xl"
                            >
                                Automate anything.{' '}
                                <span className="relative inline-block">
                                    Visually.
                                    <motion.span
                                        aria-hidden="true"
                                        className="absolute -bottom-1 left-0 right-0 h-1 origin-left rounded-full bg-gradient-to-r from-blue-500 to-purple-500 sm:-bottom-2 sm:h-1.5"
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        transition={{ delay: 0.55, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                    />
                                </span>
                            </motion.h1>

                            <motion.div variants={fadeUp}>
                                <Text className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 dark:text-gray-300 sm:mt-8 sm:text-xl">
                                    Design, run, and watch your processes come to life on an interactive canvas — from
                                    employee onboarding to order fulfillment and bug triage. No code required.
                                </Text>
                            </motion.div>

                            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:mt-12">
                                {/* Both actions are equally-sized pills with matching hover/tap
                                    motion; the filled vs. outline treatment carries the hierarchy. */}
                                <Link href="/workflow">
                                    <motion.div className="inline-flex" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                        <Button variant="primary" size="lg" className="rounded-full">
                                            New Workflow
                                        </Button>
                                    </motion.div>
                                </Link>
                                <Link href="/workflows-list">
                                    <NavButton size="lg">Saved Workflows</NavButton>
                                </Link>
                            </motion.div>
                        </motion.div>
                    </section>
                    </div>

                    {/* Feature templates */}
                    <section className="mx-auto w-full max-w-5xl px-6 pb-24 lg:pb-32">
                        <motion.div
                            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.2 }}
                            variants={stagger}
                        >
                            {features.map((feature) => (
                                <motion.div
                                    key={feature.id}
                                    variants={fadeUp}
                                    whileHover={{ y: -6 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                                    className="h-full"
                                >
                                    <Card
                                        variant="elevated"
                                        padding="lg"
                                        className="flex h-full flex-col rounded-2xl transition-shadow duration-300 hover:shadow-xl hover:shadow-indigo-500/5 dark:hover:shadow-indigo-400/10"
                                    >
                                        {/* Emoji in a tinted, ringed tile so the card reads as a product icon. */}
                                        <span
                                            className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-2xl shadow-inner ring-1 ring-black/5 dark:from-gray-800 dark:to-gray-900 dark:ring-white/10"
                                            aria-hidden="true"
                                        >
                                            {feature.emoji}
                                        </span>
                                        <Heading
                                            as="h3"
                                            size="lg"
                                            weight="bold"
                                            className="mt-5 tracking-tight text-gray-900 dark:text-white"
                                        >
                                            {feature.title}
                                        </Heading>
                                        <Text className="mt-2 flex-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                                            {feature.description}
                                        </Text>
                                        <div className="mt-6 border-t border-gray-100 pt-5 dark:border-gray-800">
                                            <Link href={`/workflow?type=${feature.id}`}>
                                                <Button variant="primary" className="rounded-full">
                                                    Launch
                                                </Button>
                                            </Link>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    </section>
                </main>

                {/* Footer */}
                <footer className="border-t border-gray-200 px-6 py-8 text-center dark:border-gray-800">
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                        Fancy Workflows — automate anything, visually. Built with Laravel, Inertia &amp; React.
                    </Text>
                </footer>
            </div>
        </>
    );
}
