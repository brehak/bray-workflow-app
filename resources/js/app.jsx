import '../css/app.css';
import '@particle-academy/react-fancy/styles.css';
import '@particle-academy/fancy-flow/styles.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence, motion } from 'framer-motion';
import { getInitialTheme, applyTheme } from './hooks/useTheme';
import NavigationProgress from './Components/NavigationProgress';
import AppUpdateAlert from './Components/AppUpdateAlert';

// Apply the stored (or system) theme before the app renders so there's no flash
// of the wrong theme on load or when navigating between pages.
applyTheme(getInitialTheme());

const pageVariants = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: -16 },
};

const pageTransition = {
    duration: 0.25,
    ease: 'easeInOut',
};

// Animates the current page in/out. We use Inertia's `App` render-prop so React
// owns the page's mount/unmount lifecycle and AnimatePresence has a real keyed
// child to track. Keying on Inertia's per-visit `key` is essential: it's what
// tells AnimatePresence a navigation happened so it can run exit→enter cleanly.
//
// (Do NOT wrap the whole <App> in <AnimatePresence> instead — Inertia swaps the
// page DOM out-of-band, and AnimatePresence's exit animation then runs against
// nodes that no longer exist, throwing insertBefore/removeChild NotFoundErrors
// that unmount the root and leave a blank screen.)
function AnimatedPage({ Component, props, pageKey }) {
    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={pageKey}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
            >
                <Component {...props} />
            </motion.div>
        </AnimatePresence>
    );
}

// Root — keeps the global navigation progress indicator mounted (so its router
// listeners persist) alongside the per-page transition.
function Root({ App, props }) {
    return (
        <>
            <NavigationProgress />
            <AppUpdateAlert />
            <App {...props}>
                {({ Component, props: pageProps, key }) => (
                    <AnimatedPage Component={Component} props={pageProps} pageKey={key} />
                )}
            </App>
        </>
    );
}

createInertiaApp({
    strictMode: true,
    // We render our own gradient progress bar (see NavigationProgress), so turn
    // off Inertia's built-in one to avoid a double indicator.
    progress: false,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        // This entry module also defines React components (Root, AnimatedPage),
        // so Vite's React Fast Refresh treats it as a hot-update boundary and can
        // re-execute it during dev. Calling createRoot() again on the same #app
        // would mount a SECOND React tree; the two roots then fight over the DOM
        // on the next navigation and blank the screen. Reusing the root makes the
        // mount idempotent — a re-exec just re-renders into the existing root.
        const root = (el._inertiaRoot ??= createRoot(el));
        root.render(createElement(Root, { App, props }));
    },
});