import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

/**
 * ConnectHint — a small "Drag to connect" nudge shown next to the output port of
 * the single starter node, to teach that ports are draggable. Rendered only when
 * the canvas has exactly one node and no edges; the parent stops rendering it the
 * moment the first edge exists.
 *
 * The port lives inside React Flow's canvas and moves with pan/zoom, so we glue
 * the hint to it: a requestAnimationFrame loop reads the source handle's position
 * (relative to the editor box) and sets the wrapper's transform directly — no
 * per-frame React re-render. framer-motion animates the pill itself (fade-in +
 * gentle horizontal bob). The outer wrapper, the centering div, and the animated
 * pill are separate elements so their transforms never clash.
 */
export default function ConnectHint({ containerRef, active }) {
    const hintRef = useRef(null);

    useEffect(() => {
        if (!active) return;
        let raf = 0;
        const place = () => {
            const container = containerRef.current;
            const hint = hintRef.current;
            if (container && hint) {
                const handle = container.querySelector('.react-flow__node .react-flow__handle.source');
                if (handle) {
                    const c = container.getBoundingClientRect();
                    const h = handle.getBoundingClientRect();
                    const x = h.left + h.width / 2 - c.left;
                    const y = h.top + h.height / 2 - c.top;
                    hint.style.transform = `translate(${x}px, ${y}px)`;
                    hint.style.opacity = '1';
                } else {
                    // Node not painted yet (or mid-transition) — keep it hidden.
                    hint.style.opacity = '0';
                }
            }
            raf = requestAnimationFrame(place);
        };
        raf = requestAnimationFrame(place);
        return () => cancelAnimationFrame(raf);
    }, [active, containerRef]);

    if (!active) return null;

    return (
        <div ref={hintRef} className="pointer-events-none absolute left-0 top-0 z-20" style={{ opacity: 0 }}>
            {/* Offset to the right of the port and vertically centred on it. */}
            <div className="ml-3 -translate-y-1/2">
                <motion.div
                    className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-indigo-200 bg-white/90 px-2.5 py-1 text-xs font-medium text-indigo-600 shadow-sm backdrop-blur dark:border-indigo-500/30 dark:bg-gray-900/90 dark:text-indigo-300"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1, x: [0, 5, 0] }}
                    transition={{
                        opacity: { duration: 0.3, ease: 'easeOut' },
                        scale: { duration: 0.3, ease: 'easeOut' },
                        x: { duration: 1.3, repeat: Infinity, ease: 'easeInOut' },
                    }}
                >
                    <ArrowRight size={14} aria-hidden="true" />
                    Drag to connect
                </motion.div>
            </div>
        </div>
    );
}
