import '../css/app.css';
import '@particle-academy/react-fancy/styles.css';
import '@particle-academy/fancy-flow/styles.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence, motion } from 'framer-motion';

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

createInertiaApp({
    strictMode: true,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        createRoot(el).render(
            createElement(PageWrapper, null, createElement(App, props)),
        );
    },
});