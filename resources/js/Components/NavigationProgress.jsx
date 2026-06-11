import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/**
 * NavigationProgress — a global loading indicator wired to Inertia's router
 * events (`start` / `progress` / `finish`):
 *
 *   • A thin accent-gradient bar pinned to the very top of the page (YouTube /
 *     GitHub style). It eases in from the left, trickles toward ~90% while the
 *     request is in flight, snaps to 100% when it finishes, then fades out.
 *   • A subtle centered spinner overlay that only appears if a navigation takes
 *     longer than 500ms, so quick page changes never flash it.
 *
 * Mounted once at the app root (outside the per-page transition) so its
 * listeners persist across navigations. Animations use framer-motion.
 */
const SPINNER_DELAY = 500; // ms before the overlay spinner appears

export default function NavigationProgress() {
    const [visible, setVisible] = useState(false);
    const [progress, setProgress] = useState(0); // 0..1, drives the bar's scaleX
    const [showSpinner, setShowSpinner] = useState(false);

    const trickleRef = useRef(null);
    const spinnerTimerRef = useRef(null);
    const hideTimerRef = useRef(null);
    const resetTimerRef = useRef(null);

    useEffect(() => {
        const clearTrickle = () => {
            if (trickleRef.current) {
                clearInterval(trickleRef.current);
                trickleRef.current = null;
            }
        };

        const start = () => {
            // A new navigation started — cancel any pending fade-out/reset.
            clearTimeout(hideTimerRef.current);
            clearTimeout(resetTimerRef.current);
            clearTrickle();

            setVisible(true);
            setProgress(0.08);

            // Trickle toward 90%, slowing as it approaches (NProgress-style).
            trickleRef.current = setInterval(() => {
                setProgress((p) => (p >= 0.9 ? p : Math.min(0.9, p + (0.9 - p) * 0.12 + 0.004)));
            }, 300);

            // Only reveal the spinner if the load is genuinely slow.
            clearTimeout(spinnerTimerRef.current);
            spinnerTimerRef.current = setTimeout(() => setShowSpinner(true), SPINNER_DELAY);
        };

        // Real download progress (e.g. large responses / uploads), when available.
        const onProgress = (event) => {
            const pct = event?.detail?.progress?.percentage;
            if (typeof pct === 'number') {
                setProgress((p) => Math.max(p, Math.min(0.9, pct / 100)));
            }
        };

        const finish = () => {
            clearTrickle();
            clearTimeout(spinnerTimerRef.current);
            setShowSpinner(false);
            setProgress(1); // snap to full

            // Let the fill finish, fade the bar out, then reset width for next time.
            hideTimerRef.current = setTimeout(() => {
                setVisible(false);
                resetTimerRef.current = setTimeout(() => setProgress(0), 300);
            }, 250);
        };

        const offStart = router.on('start', start);
        const offProgress = router.on('progress', onProgress);
        const offFinish = router.on('finish', finish);

        return () => {
            offStart();
            offProgress();
            offFinish();
            clearTrickle();
            clearTimeout(spinnerTimerRef.current);
            clearTimeout(hideTimerRef.current);
            clearTimeout(resetTimerRef.current);
        };
    }, []);

    return (
        <>
            {/* Top progress bar — accent gradient (blue → indigo → purple). */}
            <AnimatePresence>
                {visible && (
                    <motion.div
                        aria-hidden="true"
                        className="fixed inset-x-0 top-0 z-[100] h-[3px] origin-left bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.55)]"
                        initial={{ opacity: 1, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: progress }}
                        exit={{ opacity: 0 }}
                        transition={{ scaleX: { duration: 0.3, ease: 'easeOut' }, opacity: { duration: 0.25 } }}
                    />
                )}
            </AnimatePresence>

            {/* Centered spinner overlay — only for loads slower than 500ms. */}
            <AnimatePresence>
                {showSpinner && (
                    <motion.div
                        className="fixed inset-0 z-[90] flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Subtle wash so the page reads as "busy" without a hard block. */}
                        <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px] dark:bg-gray-950/40" aria-hidden="true" />
                        <motion.div
                            role="status"
                            aria-label="Loading"
                            className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200/70 bg-white/85 shadow-lg backdrop-blur dark:border-gray-700/70 dark:bg-gray-900/85"
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.85, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                        >
                            <motion.span
                                className="text-indigo-600 dark:text-indigo-400"
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                            >
                                <Loader2 size={22} aria-hidden="true" />
                            </motion.span>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
