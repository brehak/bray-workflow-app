/**
 * Fancy Workflows mark — a minimal flow diagram: two nodes on the left merging
 * into one on the right. Drawn entirely with `currentColor`, so it inherits the
 * surrounding text color and works in both light and dark mode. Set a color via
 * a `text-*` class (e.g. `className="text-indigo-600 dark:text-indigo-400"`).
 */
export default function Logo({ size = 32, className = '', ...props }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            role="img"
            aria-label="Fancy Workflows logo"
            className={className}
            {...props}
        >
            {/* connectors: both left nodes route into the right node */}
            <path d="M8 6h4v6h4" />
            <path d="M8 18h4v-6" />
            {/* nodes */}
            <rect x="2" y="3" width="6" height="6" rx="1.5" />
            <rect x="2" y="15" width="6" height="6" rx="1.5" />
            <rect x="16" y="9" width="6" height="6" rx="1.5" />
        </svg>
    );
}
