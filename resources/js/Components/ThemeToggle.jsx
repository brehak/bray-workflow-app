import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';

/**
 * Theme toggle button — shows a sun in dark mode (click to go light) and a moon
 * in light mode (click to go dark). Backed by the shared useTheme hook so the
 * choice persists in localStorage across every page.
 */
export default function ThemeToggle({ className = '' }) {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

    return (
        <motion.button
            type="button"
            onClick={toggleTheme}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            aria-label={label}
            title={label}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-100/80 text-gray-700 transition-colors hover:bg-gray-200/80 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-gray-700/80 ${className}`}
        >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </motion.button>
    );
}
