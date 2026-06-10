import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ChevronDown, ChevronUp, X } from 'lucide-react';

/**
 * RunFeedPanel — the collapsible terminal-style run feed shown under the editor.
 * Replaces fancy-flow's built-in feed (hidden via CSS) so it can be collapsed
 * and cleared. Keeps the dark terminal look in both light and dark mode.
 *
 * Header is always visible (label + clear + collapse toggle); the log list
 * collapses/expands with a framer-motion height animation.
 */
const formatTime = (at) => {
    const d = new Date(at);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getMinutes())}:${p(d.getSeconds())}.${Math.floor(d.getMilliseconds() / 100)}`;
};

const LEVEL_TEXT = {
    error: 'text-red-400',
    warn: 'text-amber-300',
    info: 'text-gray-100',
};

export default function RunFeedPanel({ feed, collapsed, onToggle, onClear }) {
    return (
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#0a0a0a] text-gray-100 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-300">
                    <Terminal size={14} aria-hidden="true" />
                    <span>Run Feed</span>
                    {feed.length > 0 && (
                        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] leading-none text-gray-400">
                            {feed.length}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={onClear}
                        disabled={feed.length === 0}
                        aria-label="Clear run feed"
                        title="Clear run feed"
                        className="rounded-md p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                        <X size={15} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        onClick={onToggle}
                        aria-label={collapsed ? 'Expand run feed' : 'Collapse run feed'}
                        aria-expanded={!collapsed}
                        title={collapsed ? 'Expand run feed' : 'Collapse run feed'}
                        className="rounded-md p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-100"
                    >
                        {collapsed ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronUp size={16} aria-hidden="true" />}
                    </button>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {!collapsed && (
                    <motion.div
                        key="feed-body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="overflow-hidden"
                    >
                        <div className="max-h-60 overflow-auto px-3 py-2 font-mono text-[11px] leading-relaxed">
                            {feed.length === 0 ? (
                                <p className="text-gray-500">No run events yet.</p>
                            ) : (
                                feed.map((e) => (
                                    <div key={e.id} className="flex gap-2 py-px">
                                        <span className="shrink-0 text-gray-500">{formatTime(e.at)}</span>
                                        {e.nodeId && <span className="shrink-0 text-violet-300">{e.nodeId}</span>}
                                        <span className={`flex-1 break-words ${LEVEL_TEXT[e.level] ?? 'text-gray-100'}`}>
                                            {e.text}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
