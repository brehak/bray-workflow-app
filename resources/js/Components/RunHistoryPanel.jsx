import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, XCircle, MinusCircle, ChevronRight, Clock } from 'lucide-react';
import { Button, Heading, Text } from '@particle-academy/react-fancy';

// Per-node status presentation (works in light + dark mode).
const NODE_STATUS = {
    done: { Icon: CheckCircle2, className: 'text-green-500', label: 'Done' },
    error: { Icon: XCircle, className: 'text-red-500', label: 'Error' },
    skipped: { Icon: MinusCircle, className: 'text-gray-400 dark:text-gray-600', label: 'Skipped' },
};

const formatTime = (ts) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// Compact duration: sub-second in ms, longer rolls to seconds.
const formatMs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`);

/**
 * RunHistoryPanel — a slide-in drawer (framer-motion) listing the most recent
 * workflow runs, newest first. Each entry expands to show per-node results.
 * Run data lives in the parent's React state only.
 */
export default function RunHistoryPanel({ open, runs, onClose, onClear }) {
    const [expandedId, setExpandedId] = useState(null);

    // Average execution time per node across every run that timed it. Keyed by
    // node id → mean duration in ms (nodes that never produced a timing are
    // simply absent). Recomputed whenever the run list changes.
    const nodeAverages = useMemo(() => {
        const acc = {};
        runs.forEach((run) => {
            run.nodes.forEach((n) => {
                if (n.durationMs == null) return;
                const cur = acc[n.id] ?? { total: 0, count: 0 };
                cur.total += n.durationMs;
                cur.count += 1;
                acc[n.id] = cur;
            });
        });
        return Object.fromEntries(
            Object.entries(acc).map(([id, { total, count }]) => [id, total / count]),
        );
    }, [runs]);

    return (
        <AnimatePresence>
            {open && (
                <motion.aside
                    key="run-history"
                    role="dialog"
                    aria-label="Run history"
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                    className="fixed inset-y-0 right-0 z-50 flex w-80 flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900"
                >
                    <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                        <Heading as="h2" size="md" weight="semibold">
                            Run History
                        </Heading>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close run history"
                            className="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                            <X size={18} aria-hidden="true" />
                        </button>
                    </header>

                    <div className="flex-1 overflow-y-auto p-3">
                        {runs.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                                <Text className="text-sm text-gray-400 dark:text-gray-500">No runs yet.</Text>
                                <Text className="mt-1 text-xs text-gray-400 dark:text-gray-600">
                                    Click Run to execute the workflow and results will appear here.
                                </Text>
                            </div>
                        ) : (
                            <ul className="flex flex-col gap-2">
                                {runs.map((run) => {
                                    const expanded = expandedId === run.id;
                                    const ran = run.nodes.filter((n) => n.status !== 'skipped').length;
                                    // Timing summary for the performance breakdown. The slowest
                                    // node is flagged amber, the fastest green — only when there
                                    // are at least two distinct timings to compare.
                                    const timed = run.nodes.filter((n) => n.durationMs != null);
                                    const maxMs = timed.length ? Math.max(...timed.map((n) => n.durationMs)) : 0;
                                    const minMs = timed.length ? Math.min(...timed.map((n) => n.durationMs)) : 0;
                                    const highlight = timed.length >= 2 && maxMs !== minMs;
                                    const totalMs = run.totalMs ?? Math.round(run.durationSec * 1000);
                                    return (
                                        <li
                                            key={run.id}
                                            className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setExpandedId(expanded ? null : run.id)}
                                                aria-expanded={expanded}
                                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                                            >
                                                <ChevronRight
                                                    size={14}
                                                    aria-hidden="true"
                                                    className={`shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
                                                />
                                                {run.success ? (
                                                    <CheckCircle2 size={16} className="shrink-0 text-green-500" aria-hidden="true" />
                                                ) : (
                                                    <XCircle size={16} className="shrink-0 text-red-500" aria-hidden="true" />
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                                        {run.success ? 'Completed' : 'Completed with errors'}
                                                    </div>
                                                    <div className="text-xs text-gray-400 dark:text-gray-500">
                                                        {formatTime(run.startedAt)} · {run.durationSec.toFixed(1)}s · {ran} step
                                                        {ran === 1 ? '' : 's'}
                                                    </div>
                                                </div>
                                            </button>

                                            <AnimatePresence initial={false}>
                                                {expanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2, ease: 'easeOut' }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="border-t border-gray-100 dark:border-gray-800">
                                                            {/* Total run time header */}
                                                            <div className="flex items-center justify-between px-3 pb-1 pt-2">
                                                                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                                                    Performance
                                                                </span>
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                                                                    <Clock size={11} aria-hidden="true" />
                                                                    {formatMs(totalMs)} total
                                                                </span>
                                                            </div>
                                                            <ul className="px-3 pb-2">
                                                                {run.nodes.map((n) => {
                                                                    const s = NODE_STATUS[n.status] ?? NODE_STATUS.skipped;
                                                                    const timedNode = n.durationMs != null;
                                                                    const isSlowest = highlight && n.durationMs === maxMs;
                                                                    const isFastest = highlight && n.durationMs === minMs;
                                                                    // Bar fill relative to the run's slowest node.
                                                                    const pct = timedNode && maxMs > 0
                                                                        ? Math.max(4, (n.durationMs / maxMs) * 100)
                                                                        : 0;
                                                                    const barColor = isSlowest
                                                                        ? 'bg-amber-500'
                                                                        : isFastest
                                                                          ? 'bg-green-500'
                                                                          : 'bg-indigo-400 dark:bg-indigo-500';
                                                                    const numColor = isSlowest
                                                                        ? 'text-amber-600 dark:text-amber-400'
                                                                        : isFastest
                                                                          ? 'text-green-600 dark:text-green-400'
                                                                          : 'text-gray-500 dark:text-gray-400';
                                                                    const avg = nodeAverages[n.id];
                                                                    return (
                                                                        <li key={n.id} className="py-1.5">
                                                                            <div className="flex items-center gap-2">
                                                                                <s.Icon
                                                                                    size={13}
                                                                                    className={`shrink-0 ${s.className}`}
                                                                                    aria-hidden="true"
                                                                                />
                                                                                <span className="truncate text-xs text-gray-600 dark:text-gray-300">
                                                                                    {n.label}
                                                                                </span>
                                                                                <span
                                                                                    className={`ml-auto shrink-0 font-mono text-[11px] font-semibold ${
                                                                                        timedNode ? numColor : 'text-gray-400 dark:text-gray-600'
                                                                                    }`}
                                                                                >
                                                                                    {timedNode ? formatMs(n.durationMs) : s.label}
                                                                                </span>
                                                                            </div>
                                                                            {timedNode && (
                                                                                <div className="mt-1 flex items-center gap-2 pl-[21px]">
                                                                                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                                                                        <motion.div
                                                                                            initial={{ width: 0 }}
                                                                                            animate={{ width: `${pct}%` }}
                                                                                            transition={{ duration: 0.45, ease: 'easeOut' }}
                                                                                            className={`h-full rounded-full ${barColor}`}
                                                                                        />
                                                                                    </div>
                                                                                    {avg != null && (
                                                                                        <span className="shrink-0 whitespace-nowrap text-[10px] text-gray-400 dark:text-gray-500">
                                                                                            avg {formatMs(avg)}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                            {highlight && (
                                                                <div className="flex items-center gap-3 px-3 pb-2 text-[10px] text-gray-400 dark:text-gray-500">
                                                                    <span className="inline-flex items-center gap-1">
                                                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                                                        Slowest
                                                                    </span>
                                                                    <span className="inline-flex items-center gap-1">
                                                                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                                                        Fastest
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    <footer className="border-t border-gray-100 p-3 dark:border-gray-800">
                        <Button
                            variant="outline"
                            color="gray"
                            onClick={onClear}
                            disabled={runs.length === 0}
                            className="w-full"
                        >
                            Clear History
                        </Button>
                    </footer>
                </motion.aside>
            )}
        </AnimatePresence>
    );
}
