import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@particle-academy/react-fancy';
import { AppUpdateAlert as AppUpdateAlertBase } from '@particle-academy/fancy-app-update';

/**
 * AppUpdateAlert — notifies the user when a new build has been deployed while
 * their page is open, so they can refresh and pick up the latest JS/CSS instead
 * of running a stale bundle against the new backend.
 *
 * Detection: zero-config ETag polling, but pointed at the static Vite manifest
 * rather than the page URL. The package's default polls `location.href`, which
 * on Laravel + Inertia is a *dynamically* rendered Blade response with no
 * `ETag` / `Last-Modified` header — so the default would never fire. The built
 * `public/build/manifest.json` is a static file the web server serves WITH
 * validators, and its hashed contents change on every deploy, so polling it is
 * reliable with no backend code.
 *
 * UI: the package ships a hard-coded white inline-styled card with no dark-mode
 * support, so we replace it entirely via the `render` prop with a react-fancy
 * styled, framer-motion prompt that matches the rest of the app. It's portaled
 * to <body> and pinned bottom-center so it floats above (and clear of) the
 * workflow editor.
 */
export default function AppUpdateAlert() {
    return (
        <AppUpdateAlertBase
            pingUrl="/build/manifest.json"
            interval={60_000}
            render={({ refresh, dismiss }) =>
                createPortal(
                    <motion.div
                        role="status"
                        aria-live="polite"
                        className="fixed inset-x-0 bottom-4 z-[2147483000] mx-auto flex w-[min(92vw,26rem)] items-start gap-3 rounded-2xl border border-white/40 bg-white/70 p-4 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/70"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                    >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 text-white shadow-sm">
                            <Sparkles size={18} aria-hidden="true" />
                        </span>

                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                A new version is available
                            </p>
                            <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                                Refresh to get the latest features and fixes.
                            </p>

                            <div className="mt-3 flex items-center gap-2">
                                <Button variant="primary" size="sm" onClick={refresh}>
                                    Refresh
                                </Button>
                                <Button variant="outline" color="gray" size="sm" onClick={dismiss}>
                                    Later
                                </Button>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={dismiss}
                            aria-label="Dismiss"
                            className="-mr-1 -mt-1 shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300"
                        >
                            <X size={16} aria-hidden="true" />
                        </button>
                    </motion.div>,
                    document.body,
                )
            }
        />
    );
}
