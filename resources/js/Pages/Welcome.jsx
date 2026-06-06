import { Head, Link } from '@inertiajs/react';
import { Button, Heading, Text } from '@particle-academy/react-fancy';

export default function Welcome() {
    return (
        <>
            <Head title="Welcome" />

            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 dark:bg-gray-950">
                <main className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-10 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <Heading as="h1" size="2xl" weight="semibold">
                        Laravel + Inertia + React
                    </Heading>
                    <Text className="mt-4 text-gray-600 dark:text-gray-400">
                        Your application is ready. Start building pages in{' '}
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm dark:bg-gray-800">
                            resources/js/Pages
                        </code>
                        .
                    </Text>

                    <div className="mt-8">
                        <Link href="/workflow">
                            <Button>Open workflow demo</Button>
                        </Link>
                    </div>
                </main>
            </div>
        </>
    );
}
