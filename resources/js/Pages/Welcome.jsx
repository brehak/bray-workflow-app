import { Head, Link } from '@inertiajs/react';
import { Button, Card, Heading, Text } from '@particle-academy/react-fancy';
import { motion } from 'framer-motion';
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

            <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
                {/* Navigation */}
                <nav className="flex items-center justify-between px-6 py-4 sm:px-10">
                    <div className="flex items-center gap-2">
                        <span className="text-xl" aria-hidden="true">
                            ⚡
                        </span>
                        <Heading as="h2" size="lg" weight="semibold">
                            Fancy Workflows
                        </Heading>
                    </div>
                    <ThemeToggle />
                </nav>

                <main className="flex flex-1 flex-col">
                    {/* Hero */}
                    <section className="mx-auto w-full max-w-5xl px-6 pb-16 pt-16 text-center sm:pt-24">
                        <motion.div initial="hidden" animate="visible" variants={stagger}>
                            <motion.div variants={fadeUp}>
                                <span className="inline-block rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                                    ✨ Visual workflow automation
                                </span>
                            </motion.div>

                            <motion.h1
                                variants={fadeUp}
                                className="mt-6 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl"
                            >
                                Automate anything.{' '}
                                <span className="text-indigo-600 dark:text-indigo-400">Visually.</span>
                            </motion.h1>

                            <motion.div variants={fadeUp}>
                                <Text className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
                                    Design, run, and watch your processes come to life on an interactive canvas — from
                                    employee onboarding to order fulfillment and bug triage. No code required.
                                </Text>
                            </motion.div>

                            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-3">
                                <Link href="/workflow">
                                    <Button variant="primary" size="lg">
                                        New Workflow
                                    </Button>
                                </Link>
                                <Link href="/workflows-list">
                                    <Button variant="outline" size="lg">
                                        Saved Workflows
                                    </Button>
                                </Link>
                            </motion.div>
                        </motion.div>
                    </section>

                    {/* Feature templates */}
                    <section className="mx-auto w-full max-w-5xl px-6 pb-20">
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
                                    <Card variant="elevated" padding="lg" className="flex h-full flex-col">
                                        <span className="text-3xl" aria-hidden="true">
                                            {feature.emoji}
                                        </span>
                                        <Heading as="h3" size="lg" weight="semibold" className="mt-4">
                                            {feature.title}
                                        </Heading>
                                        <Text className="mt-2 flex-1 text-sm text-gray-500 dark:text-gray-400">
                                            {feature.description}
                                        </Text>
                                        <div className="mt-6">
                                            <Link href={`/workflow?type=${feature.id}`}>
                                                <Button variant="primary">Launch</Button>
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
