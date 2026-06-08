import { useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Tooltip — a small dark popup label shown on hover/focus of its child (usually
 * an icon button). Wrap any trigger:
 *
 *     <Tooltip label="Save Workflow"><button>…</button></Tooltip>
 *
 * Positioning: the label is centered over the trigger and placed on the
 * requested side (`placement`, default "top"). If there isn't room on that side
 * it flips to the opposite side, and it's clamped horizontally so it never spills
 * past the viewport edges. Animated with a subtle framer-motion fade + scale.
 *
 * The centering transform lives on a static outer wrapper while framer-motion
 * animates a separate inner element — keeping the two transforms from clobbering
 * each other (both would otherwise fight over the same `transform`).
 */

// Keep this much breathing room from the viewport edge when clamping.
const EDGE_MARGIN = 8;

export default function Tooltip({ label, placement = 'top', className = '', children }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ placement, shiftX: 0 });
    const wrapRef = useRef(null);
    const tipRef = useRef(null);

    // Measure once the tooltip is in the DOM, then pick a side + horizontal nudge.
    useLayoutEffect(() => {
        if (!open || !wrapRef.current || !tipRef.current) return;

        const trigger = wrapRef.current.getBoundingClientRect();
        const tip = tipRef.current.getBoundingClientRect();
        const needed = tip.height + 10; // label height + gap

        // Vertical: keep the requested side unless it would clip and the other
        // side has room — then flip.
        let nextPlacement = placement;
        const spaceAbove = trigger.top;
        const spaceBelow = window.innerHeight - trigger.bottom;
        if (placement === 'top' && spaceAbove < needed && spaceBelow >= needed) nextPlacement = 'bottom';
        if (placement === 'bottom' && spaceBelow < needed && spaceAbove >= needed) nextPlacement = 'top';

        // Horizontal: the label is centered over the trigger; shift it back inside
        // the viewport if either edge would be cut off.
        const center = trigger.left + trigger.width / 2;
        const left = center - tip.width / 2;
        let shiftX = 0;
        if (left < EDGE_MARGIN) shiftX = EDGE_MARGIN - left;
        else if (left + tip.width > window.innerWidth - EDGE_MARGIN) {
            shiftX = window.innerWidth - EDGE_MARGIN - (left + tip.width);
        }

        setPos({ placement: nextPlacement, shiftX });
    }, [open, placement, label]);

    const isTop = pos.placement === 'top';

    return (
        <span
            ref={wrapRef}
            className={`relative inline-flex ${className}`}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
        >
            {children}
            <AnimatePresence>
                {open && (
                    // Outer wrapper owns the (static) centering + edge-clamp transform.
                    <span
                        className={`pointer-events-none absolute left-1/2 z-[100] ${isTop ? 'bottom-full mb-2' : 'top-full mt-2'}`}
                        style={{ transform: `translateX(calc(-50% + ${pos.shiftX}px))` }}
                    >
                        {/* Inner element is the only thing framer-motion transforms. */}
                        <motion.span
                            ref={tipRef}
                            role="tooltip"
                            initial={{ opacity: 0, scale: 0.92, y: isTop ? 3 : -3 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: isTop ? 3 : -3 }}
                            transition={{ duration: 0.14, ease: 'easeOut' }}
                            className="block whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-gray-50 shadow-md ring-1 ring-black/10 dark:bg-gray-700 dark:ring-white/10"
                        >
                            {label}
                        </motion.span>
                    </span>
                )}
            </AnimatePresence>
        </span>
    );
}
