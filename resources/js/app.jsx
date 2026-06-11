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

function PageWrapper({ children }) {
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={window.location.pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
            >
                {children}
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
            <PageWrapper>{createElement(App, props)}</PageWrapper>
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
        createRoot(el).render(createElement(Root, { App, props }));
    },
});