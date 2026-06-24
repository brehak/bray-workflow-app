/**
 * MiniCanvas — a tiny, static thumbnail of a workflow graph: colored dots for
 * nodes, thin lines for edges. NOT the fancy-flow editor; just an SVG snapshot
 * so a saved-workflow card can show its shape at a glance.
 *
 * Node positions come straight from the stored graph (React Flow coordinates),
 * so we normalize the bounding box of all nodes into the SVG's inner box. When
 * every node shares a coordinate (e.g. a perfectly horizontal flow), the span is
 * zero — we center that axis instead of dividing by zero.
 */
import { memo } from 'react';
import { motion } from 'framer-motion';

// SVG coordinate space — the 200x80px area we scale node positions into. The
// SVG scales to its container via viewBox, so these are the internal units.
const W = 200;
const H = 80;
const PAD = 12;

// Dot color per node type (falls back to data.kind, then a neutral gray). These
// hues read clearly on both the light and dark card backgrounds.
const KIND_COLORS = {
    trigger: '#22c55e', // green
    action: '#3b82f6', // blue
    decision: '#f97316', // orange
    output: '#a855f7', // purple
    note: '#94a3b8', // slate
    subgraph: '#06b6d4', // cyan
};

const colorFor = (node) => KIND_COLORS[node.type] || KIND_COLORS[node.data?.kind] || '#9ca3af';

// Normalize one axis value into [PAD, size - PAD]. Centers when the span is 0.
const project = (value, min, span, size) => {
    const t = span === 0 ? 0.5 : (value - min) / span;
    return PAD + t * (size - 2 * PAD);
};

function MiniCanvas({ nodes = [], edges = [], className = '' }) {
    const positioned = nodes.filter((n) => n?.position);

    // Nothing to draw — show a faint placeholder so the card still has a header.
    if (positioned.length === 0) {
        return (
            <div
                className={`flex h-20 items-center justify-center rounded-lg bg-gray-50 text-xs text-gray-400 ring-1 ring-inset ring-gray-100 dark:bg-gray-950 dark:text-gray-600 dark:ring-gray-800 ${className}`}
            >
                Empty workflow
            </div>
        );
    }

    const xs = positioned.map((n) => n.position.x);
    const ys = positioned.map((n) => n.position.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const spanX = Math.max(...xs) - minX;
    const spanY = Math.max(...ys) - minY;

    // Map node id -> projected point, so edges can look up their endpoints.
    const points = new Map(
        positioned.map((n) => [
            n.id,
            {
                x: project(n.position.x, minX, spanX, W),
                y: project(n.position.y, minY, spanY, H),
                color: colorFor(n),
            },
        ]),
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className={`h-20 overflow-hidden rounded-lg bg-gray-50 ring-1 ring-inset ring-gray-100 dark:bg-gray-950 dark:ring-gray-800 ${className}`}
            aria-hidden="true"
        >
            <svg
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="xMidYMid meet"
                className="h-full w-full"
            >
                {/* Edges first so dots render on top of the connecting lines. */}
                {edges.map((edge) => {
                    const a = points.get(edge.source);
                    const b = points.get(edge.target);
                    if (!a || !b) return null;
                    return (
                        <line
                            key={edge.id ?? `${edge.source}-${edge.target}`}
                            x1={a.x}
                            y1={a.y}
                            x2={b.x}
                            y2={b.y}
                            className="stroke-gray-300 dark:stroke-gray-700"
                            strokeWidth={1.5}
                            strokeLinecap="round"
                        />
                    );
                })}
                {/* Nodes as colored dots. */}
                {positioned.map((n) => {
                    const p = points.get(n.id);
                    return <circle key={n.id} cx={p.x} cy={p.y} r={3.5} fill={p.color} />;
                })}
            </svg>
        </motion.div>
    );
}

// Memoized: one MiniCanvas renders per saved-workflow card, and the list
// re-renders on search/pin/drag-hover state changes. The `nodes`/`edges` props
// are stable references from the workflow records, so memo skips all the
// projection math for cards that didn't change.
export default memo(MiniCanvas);
