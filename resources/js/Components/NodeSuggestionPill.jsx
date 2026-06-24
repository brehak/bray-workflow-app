import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

/**
 * NodeSuggestionPill — a subtle "+ Suggested: <label>" chip that floats just to
 * the right of a freshly dropped node, offering Claude's idea for the next step.
 * Clicking it adds that node (wired to the anchor) via `onAccept`.
 *
 * Like ConnectHint, the anchor node lives inside React Flow's canvas and moves
 * with pan/zoom, so we glue the pill to it: a requestAnimationFrame loop reads the
 * node element's box (relative to the editor container) and writes the wrapper's
 * transform directly — no per-frame React re-render. The outer wrapper owns
 * positioning; the inner motion.button owns its own entrance animation so the two
 * transforms never clash. The chip is interactive (`pointer-events-auto`).
 */
export default function NodeSuggestionPill({ containerRef, nodeId, label, onAccept }) {
    const wrapRef = useRef(null);

    useEffect(() => {
        let raf = 0;
        const place = () => {
            const container = containerRef.current;
            const wrap = wrapRef.current;
            if (container && wrap) {
                const node = container.querySelector(`.react-flow__node[data-id="${nodeId}"]`);
                if (node) {
                    const c = container.getBoundingClientRect();
                    const n = node.getBoundingClientRect();
                    // Anchor to the node's right edge, vertically centred on it.
                    const x = n.right - c.left;
                    const y = n.top + n.height / 2 - c.top;
                    wrap.style.transform = `translate(${x}px, ${y}px)`;
                    wrap.style.opacity = '1';
                } else {
                    // Node not painted yet (or removed) — keep the pill hidden.
                    wrap.style.opacity = '0';
                }
            }
            raf = requestAnimationFrame(place);
        };
        raf = requestAnimationFrame(place);
        return () => cancelAnimationFrame(raf);
    }, [containerRef, nodeId]);

    return (
        <div ref={wrapRef} className="absolute left-0 top-0 z-20" style={{ opacity: 0 }}>
            {/* Offset to the right of the node and vertically centred on it. */}
            <div className="ml-3 -translate-y-1/2">
                <motion.button
                    type="button"
                    onClick={onAccept}
                    initial={{ opacity: 0, scale: 0.9, x: -4 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    title="Add this suggested next step"
                    className="pointer-events-auto flex max-w-xs items-center gap-1.5 whitespace-nowrap rounded-full border border-indigo-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-indigo-600 shadow-md backdrop-blur transition-colors hover:bg-indigo-50 dark:border-indigo-500/30 dark:bg-gray-900/90 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                >
                    <Sparkles size={13} className="shrink-0 text-fuchsia-500 dark:text-fuchsia-400" aria-hidden="true" />
                    <span className="text-gray-400 dark:text-gray-500">+ Suggested:</span>
                    <span className="truncate">{label}</span>
                </motion.button>
            </div>
        </div>
    );
}
