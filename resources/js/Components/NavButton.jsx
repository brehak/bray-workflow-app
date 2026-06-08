import { motion } from 'framer-motion';
import { Button } from '@particle-academy/react-fancy';

/**
 * Secondary / navigation button: a pill-shaped react-fancy outline Button with a
 * subtle semi-transparent background and smooth hover/press scale animations.
 * Kept visually distinct from the solid primary action buttons.
 *
 * The pill classes win over the Button's defaults because react-fancy composes
 * its class list with tailwind-merge and applies `className` last.
 */
const navPill =
    'rounded-full bg-gray-100/80 hover:bg-gray-200/80 dark:bg-gray-800/80 dark:hover:bg-gray-700/80';

export default function NavButton({ className = '', children, ...props }) {
    return (
        <motion.div className="inline-flex" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button variant="outline" className={`${navPill} ${className}`} {...props}>
                {children}
            </Button>
        </motion.div>
    );
}
