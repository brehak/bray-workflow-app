import { Head, Link } from '@inertiajs/react';
import { Button, Heading, Text } from '@particle-academy/react-fancy';
import ThemeToggle from '../Components/ThemeToggle';

export default function Welcome() {
    return (
        <>
            <Head title="Welcome" />

            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 dark:bg-gray-950">
                <ThemeToggle className="fixed right-6 top-6 z-50" />
                <main className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-10 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <Heading as="h1" size="2xl" weight="semibold">
                        Fancy Workflows
                    </Heading>
                    <Text className="mt-4 text-gray-600 dark:text-gray-400">
                        A dynamic onboarding workflow app built with Laravel, Inertia, React, and Fancy UI.
                    </Text>

                    <div className="mt-8 flex gap-3">
                        <Link href="/workflow">
                            <Button variant="primary">New Workflow</Button>
                        </Link>
                        <Link href="/workflows-list">
                            <Button variant="outline">Saved Workflows</Button>
                        </Link>
                    </div>
                </main>
            </div>
        </>
    );
} 