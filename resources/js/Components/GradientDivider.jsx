import { motion } from 'framer-motion';

/**
 * GradientDivider — a thin horizontal rule that fades from transparent to a
 * muted gray and back to transparent, with a gentle framer-motion fade + grow.
 * Light gray in light mode, dark gray in dark mode. Purely decorative, so it's
 * hidden from assistive tech.
 *
 * Animates the first time it scrolls into view (header dividers sit in view on
 * load, so they fade in immediately).
 */
export default function GradientDivider({ className = '' }) {
    return (
        <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, scaleX: 0.85 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`h-px w-full bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-700 ${className}`}
        />
    );
}
