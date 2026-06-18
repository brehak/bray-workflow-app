import { Sparkles } from 'lucide-react';

/**
 * FancyBadge — a small "Powered by Fancy UI" pill that links out to the
 * Particle Academy UI site. Styled like the "Built with X" badges you see on
 * open-source projects: a rounded pill with the Fancy UI purple/blue gradient
 * accent and a subtle lift-and-glow on hover. Works in both light and dark mode.
 */
export default function FancyBadge({ className = '' }) {
    return (
        <a
            href="https://ui.particle.academy"
            target="_blank"
            rel="noopener noreferrer"
            className={`group inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-300/80 hover:text-gray-900 hover:shadow-md hover:shadow-purple-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-purple-600/70 dark:hover:text-white ${className}`}
        >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-sm">
                <Sparkles size={10} aria-hidden="true" />
            </span>
            <span>
                Powered by{' '}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text font-semibold text-transparent dark:from-blue-400 dark:to-purple-400">
                    Fancy UI
                </span>
            </span>
        </a>
    );
}
