import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FancyClientOnly } from '@particle-academy/fancy-inertia';
import { CodeEditor } from '@particle-academy/fancy-code';
import { X, Copy, Check, Code2, FileCode2, Braces, Loader2, AlertCircle } from 'lucide-react';

/**
 * Track the app's active theme by watching the `.dark` class on <html> — the
 * single source of truth every theme toggle writes to. Using this instead of
 * useTheme keeps the editor in sync even when the theme changes while the panel
 * is open (useTheme holds independent per-instance state).
 */
function useIsDark() {
    const [isDark, setIsDark] = useState(
        () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
    );
    useEffect(() => {
        const el = document.documentElement;
        const sync = () => setIsDark(el.classList.contains('dark'));
        sync();
        const observer = new MutationObserver(sync);
        observer.observe(el, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);
    return isDark;
}

/**
 * Slide-in panel that shows the current workflow as source. Two tabs:
 *   • JSON — the fancy-flow format (name/description/nodes/edges/tags),
 *     editable; "Apply" hands the parsed graph back to the canvas.
 *   • BPMN — the BPMN 2.0 XML the server generates, read-only.
 *
 * The editor itself comes from @particle-academy/fancy-code. It mounts DOM
 * observers and isn't SSR-safe, so it's wrapped in <FancyClientOnly>. The
 * built-in language set has no JSON/XML grammar, so we lean on the closest
 * highlighters: `javascript` for JSON, `html` for the XML tags.
 *
 * Props:
 *   open         — whether the panel is visible
 *   onClose      — called to dismiss the panel
 *   buildJson()  — returns the pretty-printed JSON for the current workflow
 *   onApplyJson(raw) — parses/validates/applies edited JSON; returns true on success
 *   fetchBpmn()  — async; resolves to the BPMN XML string (persists first if needed)
 */
export default function CodePanel({ open, onClose, buildJson, onApplyJson, fetchBpmn }) {
    const isDark = useIsDark();
    const [tab, setTab] = useState('json');

    // Editable JSON draft + the pristine snapshot captured when the panel opened,
    // so we can tell whether there are unapplied edits.
    const [jsonDraft, setJsonDraft] = useState('');
    const [pristineJson, setPristineJson] = useState('');

    // BPMN is fetched lazily (it needs a server round-trip) and cached until the
    // panel is reopened.
    const [bpmn, setBpmn] = useState('');
    const [bpmnState, setBpmnState] = useState('idle'); // idle | loading | ready | error

    const [applying, setApplying] = useState(false);
    const [applyError, setApplyError] = useState('');
    const [copied, setCopied] = useState(false);

    const wasOpen = useRef(false);
    // Guards a single BPMN fetch per open session (reset when the panel reopens).
    const bpmnRequested = useRef(false);

    // Keep the latest fetchBpmn in a ref. The parent re-creates it every render,
    // so depending on it directly would make the fetch effect re-run (and its
    // cleanup cancel the in-flight request) on every keystroke.
    const fetchBpmnRef = useRef(fetchBpmn);
    useEffect(() => {
        fetchBpmnRef.current = fetchBpmn;
    });

    // On open, snapshot the current workflow as JSON and reset transient state.
    // The BPMN cache is cleared too so we re-fetch against the latest graph.
    useEffect(() => {
        if (open && !wasOpen.current) {
            const json = buildJson();
            setJsonDraft(json);
            setPristineJson(json);
            setBpmn('');
            setBpmnState('idle');
            bpmnRequested.current = false;
            setApplyError('');
            setCopied(false);
        }
        wasOpen.current = open;
    }, [open, buildJson]);

    // Pull the BPMN XML the first time the user lands on that tab. Gated by a ref
    // so it fires exactly once per open session; deps stay stable so an in-flight
    // request is only cancelled when the panel/tab actually changes.
    useEffect(() => {
        if (!open || tab !== 'bpmn' || bpmnRequested.current) return;
        bpmnRequested.current = true;
        let cancelled = false;
        let settled = false;
        setBpmnState('loading');
        Promise.resolve(fetchBpmnRef.current())
            .then((xml) => {
                settled = true;
                if (cancelled) return;
                setBpmn(typeof xml === 'string' ? xml : '');
                setBpmnState('ready');
            })
            .catch(() => {
                settled = true;
                if (!cancelled) setBpmnState('error');
            });
        return () => {
            cancelled = true;
            // Torn down before the request finished (e.g. user tabbed away and
            // back) — clear the guard so returning to the tab fetches again.
            if (!settled) bpmnRequested.current = false;
        };
    }, [open, tab]);

    // Close on Escape for keyboard parity with the app's other overlays.
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    const currentContent = tab === 'json' ? jsonDraft : bpmn;

    const handleCopy = useCallback(async () => {
        if (!currentContent) return;
        try {
            await navigator.clipboard.writeText(currentContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* clipboard blocked — nothing actionable to surface */
        }
    }, [currentContent]);

    const handleApply = useCallback(() => {
        setApplying(true);
        setApplyError('');
        // Validate locally first so we can show an inline message; the parent does
        // the actual graph swap (and its own success toast).
        try {
            const parsed = JSON.parse(jsonDraft);
            if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
                throw new Error('JSON must include "nodes" and "edges" arrays.');
            }
            const ok = onApplyJson(parsed);
            if (ok) {
                setPristineJson(jsonDraft);
            }
        } catch (err) {
            setApplyError(err instanceof Error ? err.message : 'Invalid JSON.');
        } finally {
            setApplying(false);
        }
    }, [jsonDraft, onApplyJson]);

    const dirty = tab === 'json' && jsonDraft !== pristineJson;

    const editorTheme = isDark ? 'dark' : 'light';

    const tabBtn = (id, label, Icon) => {
        const active = tab === id;
        return (
            <button
                type="button"
                onClick={() => setTab(id)}
                role="tab"
                aria-selected={active}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:text-indigo-300 dark:ring-gray-700'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
                <Icon size={14} aria-hidden="true" />
                {label}
            </button>
        );
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="code-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
                        aria-hidden="true"
                    />

                    {/* Sliding panel */}
                    <motion.aside
                        key="code-panel"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                        role="dialog"
                        aria-label="Workflow source code"
                        className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-[44rem] flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <Code2 size={18} className="text-indigo-500 dark:text-indigo-400" aria-hidden="true" />
                                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Workflow Code</h2>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close code panel"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                            >
                                <X size={18} aria-hidden="true" />
                            </button>
                        </div>

                        {/* Tabs + actions */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-2 dark:border-gray-800">
                            <div role="tablist" aria-label="Code format" className="inline-flex items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800/60">
                                {tabBtn('json', 'JSON', Braces)}
                                {tabBtn('bpmn', 'BPMN', FileCode2)}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    disabled={!currentContent}
                                    aria-label="Copy code to clipboard"
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                    {copied ? (
                                        <Check size={14} className="text-green-500" aria-hidden="true" />
                                    ) : (
                                        <Copy size={14} aria-hidden="true" />
                                    )}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>

                                {tab === 'json' && (
                                    <button
                                        type="button"
                                        onClick={handleApply}
                                        disabled={applying || !dirty}
                                        aria-label="Apply JSON to canvas"
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {applying ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
                                        Apply
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Inline validation / hint row */}
                        {tab === 'json' && (applyError || dirty) && (
                            <div
                                className={`flex items-center gap-1.5 px-4 py-1.5 text-xs ${
                                    applyError
                                        ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300'
                                        : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                                }`}
                            >
                                <AlertCircle size={13} aria-hidden="true" />
                                {applyError || 'Unapplied edits — click Apply to update the canvas.'}
                            </div>
                        )}

                        {/* Editor surface */}
                        <div className="min-h-0 flex-1 overflow-hidden">
                            <FancyClientOnly
                                fallback={<div className="h-full w-full animate-pulse bg-gray-100 dark:bg-gray-800/50" />}
                            >
                                {tab === 'json' ? (
                                    <CodeEditor
                                        key={`json-${editorTheme}`}
                                        value={jsonDraft}
                                        onChange={setJsonDraft}
                                        language="javascript"
                                        theme={editorTheme}
                                        wordWrap
                                        className="h-full"
                                        placeholder="Workflow JSON…"
                                    >
                                        <CodeEditor.Panel className="h-full" />
                                    </CodeEditor>
                                ) : bpmnState === 'loading' || bpmnState === 'idle' ? (
                                    <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
                                        <Loader2 size={20} className="mr-2 animate-spin" aria-hidden="true" />
                                        Generating BPMN…
                                    </div>
                                ) : bpmnState === 'error' ? (
                                    <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center text-gray-500 dark:text-gray-400">
                                        <AlertCircle size={22} className="text-red-400" aria-hidden="true" />
                                        <p className="text-sm">Couldn’t generate BPMN.</p>
                                        <p className="text-xs">Try saving the workflow, then reopen this panel.</p>
                                    </div>
                                ) : (
                                    <CodeEditor
                                        key={`bpmn-${editorTheme}`}
                                        value={bpmn}
                                        language="html"
                                        theme={editorTheme}
                                        readOnly
                                        wordWrap
                                        className="h-full"
                                    >
                                        <CodeEditor.Panel className="h-full" />
                                    </CodeEditor>
                                )}
                            </FancyClientOnly>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}
