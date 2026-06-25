import { Head, Link, router } from '@inertiajs/react';
import { Button, Heading, Text } from '@particle-academy/react-fancy';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Settings, BarChart3, Layers, Tag as TagIcon, TrendingUp, Zap, Tags, GitBranch, Clock, Split, CalendarDays, Plus, LayoutTemplate, Download, FileText, Activity, ChevronRight, ChevronDown, ArrowUpDown, Check, AlertTriangle } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import EChartLazy from '../Components/EChartLazy';
import GradientDivider from '../Components/GradientDivider';
import Logo from '../Components/Logo';
import NavButton from '../Components/NavButton';
import ThemeToggle from '../Components/ThemeToggle';
import { useTheme } from '../hooks/useTheme';
import { getRunsCompleted } from '../lib/runs';
import { getSettings } from '../lib/settings';
import { createZip, slugify } from '../lib/zip';

// Shared palette — pulled from the app's blue → indigo → purple gradient family
// so the charts feel of-a-piece with the rest of Fancy Workflows.
const PALETTE = ['#6366f1', '#3b82f6', '#a855f7', '#22d3ee', '#ec4899', '#14b8a6', '#f59e0b', '#f43f5e', '#8b5cf6', '#0ea5e9'];

// Accent color per template type — mirrors the card accents on WorkflowList so a
// workflow's dot matches the color it wears elsewhere. Names not from a known
// template (custom builds) fall back to a stable palette color hashed from the
// name, so the same name always gets the same dot.
const TEMPLATE_ACCENTS = {
    'Employee Onboarding': '#3b82f6',
    'Order Processing': '#22c55e',
    'Bug Report': '#dc2626',
    'Job Application Pipeline': '#d946ef',
    'Content Publishing': '#14b8a6',
    'Budget Approval': '#f59e0b',
    'PTO Request': '#0ea5e9',
    'Product Recall': '#f97316',
    'Event Planning': '#ec4899',
    'Return & Refund': '#8b5cf6',
};

function accentFor(name) {
    if (TEMPLATE_ACCENTS[name]) return TEMPLATE_ACCENTS[name];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
}

// Heatmap color ramps per scheme (settings.heatmapColor). Each is light→dark
// graded; the order is reversed for dark mode so low counts stay subtle and high
// counts read bright against the dark card.
const HEATMAP_SCALES = {
    purple: {
        light: ['#f3e8ff', '#d8b4fe', '#c084fc', '#a855f7', '#7e22ce'],
        dark: ['#581c87', '#7e22ce', '#a855f7', '#c084fc', '#d8b4fe'],
    },
    blue: {
        light: ['#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8'],
        dark: ['#1e3a8a', '#1d4ed8', '#3b82f6', '#60a5fa', '#93c5fd'],
    },
    green: {
        light: ['#dcfce7', '#86efac', '#4ade80', '#22c55e', '#15803d'],
        dark: ['#14532d', '#15803d', '#22c55e', '#4ade80', '#86efac'],
    },
    orange: {
        light: ['#ffedd5', '#fdba74', '#fb923c', '#f97316', '#c2410c'],
        dark: ['#7c2d12', '#c2410c', '#f97316', '#fb923c', '#fdba74'],
    },
};

// Date-range filter options. `days: null` means "All time".
const RANGES = [
    { key: '7', label: 'Last 7 days', days: 7 },
    { key: '30', label: 'Last 30 days', days: 30 },
    { key: '90', label: 'Last 90 days', days: 90 },
    { key: 'all', label: 'All time', days: null },
];

// Entrance animation — each chart card fades and rises into place, staggered.
const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.04 } },
};

// ---- Date helpers -------------------------------------------------------

// Local YYYY-MM-DD for a Date (used so the heatmap and the over-time series
// bucket on the same calendar-day basis).
function toDayString(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function isoDay(iso) {
    return toDayString(new Date(iso));
}

// Human-friendly "… ago" string for an ISO timestamp.
function timeAgo(iso) {
    if (!iso) return '';
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const secs = Math.max(0, (Date.now() - then) / 1000);
    const units = [
        ['year', 31536000],
        ['month', 2592000],
        ['week', 604800],
        ['day', 86400],
        ['hour', 3600],
        ['minute', 60],
    ];
    for (const [name, span] of units) {
        const n = Math.floor(secs / span);
        if (n >= 1) return `${n} ${name}${n > 1 ? 's' : ''} ago`;
    }
    return 'just now';
}

// ---- Aggregation (client-side, so the range filter is instant) ----------

// Keep only workflows created within the last `days` days (null = all).
function filterByRange(list, days) {
    if (!days) return list;
    const cutoff = Date.now() - days * 86400000;
    return list.filter((w) => new Date(w.created_at).getTime() >= cutoff);
}

// Roll a list of workflow records up into the shapes the charts/stats consume.
function computeStats(list) {
    const total = list.length;

    const tmpl = new Map();
    const tags = new Map();
    const days = new Map();
    let longest = null;
    let newest = null;
    let fromTemplate = 0;

    for (const w of list) {
        tmpl.set(w.template, (tmpl.get(w.template) || 0) + 1);
        for (const t of w.tags || []) tags.set(t, (tags.get(t) || 0) + 1);
        const d = isoDay(w.created_at);
        days.set(d, (days.get(d) || 0) + 1);
        if (!longest || w.steps > longest.steps) longest = { name: w.name, steps: w.steps };
        if (!newest || new Date(w.created_at) > new Date(newest.created_at)) {
            newest = { name: w.name, created_at: w.created_at };
        }
        if (w.fromTemplate) fromTemplate += 1;
    }

    const byTemplate = [...tmpl.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    const byTag = [...tags.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);

    // Continuous daily series (gap days filled with 0) between the first and
    // last day that saw activity.
    let overTime = [];
    if (days.size > 0) {
        const keys = [...days.keys()].sort();
        const cursor = new Date(`${keys[0]}T00:00:00`);
        const end = new Date(`${keys[keys.length - 1]}T00:00:00`);
        while (cursor <= end) {
            const key = toDayString(cursor);
            overTime.push({ date: key, count: days.get(key) || 0 });
            cursor.setDate(cursor.getDate() + 1);
        }
    }

    return {
        total,
        byTemplate,
        byTag,
        overTime,
        longest,
        newest,
        startMethod: { template: fromTemplate, scratch: total - fromTemplate },
    };
}

// Build the contribution-heatmap data over the trailing 52 weeks. Only days
// with activity get a data point; the rest render as the calendar's empty cell.
function buildHeatmap(list) {
    const counts = new Map();
    for (const w of list) {
        const d = isoDay(w.created_at);
        counts.set(d, (counts.get(d) || 0) + 1);
    }
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 364);
    const startStr = toDayString(start);
    const endStr = toDayString(end);

    const data = [];
    let max = 1;
    for (const [day, count] of counts) {
        if (day >= startStr && day <= endStr) {
            data.push([day, count]);
            if (count > max) max = count;
        }
    }
    return { data, range: [startStr, endStr], max };
}

// ---- Presentational pieces ----------------------------------------------

// A white/dark card wrapper with an animated entrance and a labelled header.
function ChartCard({ title, icon: Icon, children, className = '', action }) {
    return (
        <motion.section
            variants={fadeUp}
            className={`print-card rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 ${className}`}
        >
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
                        <Icon size={17} aria-hidden="true" />
                    </span>
                    <Heading as="h3" size="sm" weight="semibold">
                        {title}
                    </Heading>
                </div>
                {action}
            </div>
            {children}
        </motion.section>
    );
}

// Small centered fallback for charts with no data yet.
function EmptyChart({ message }) {
    return (
        <div className="flex h-[300px] items-center justify-center">
            <Text className="text-sm text-gray-400 dark:text-gray-500">{message}</Text>
        </div>
    );
}

// Compact stat card — icon chip + label, a prominent value, optional sub line.
function StatCard({ title, icon: Icon, value, sub, numeric = false, children }) {
    return (
        <motion.div
            variants={fadeUp}
            className="print-card flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
            <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
                    <Icon size={16} aria-hidden="true" />
                </span>
                <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {title}
                </Text>
            </div>
            {children ? (
                <div className="mt-3">{children}</div>
            ) : (
                <div className="mt-3">
                    {numeric ? (
                        <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
                            className="block bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-4xl font-extrabold leading-none tracking-tight text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400"
                        >
                            {value}
                        </motion.span>
                    ) : (
                        <span className="block truncate text-xl font-bold leading-snug text-gray-900 dark:text-gray-100" title={typeof value === 'string' ? value : undefined}>
                            {value}
                        </span>
                    )}
                    {sub && <Text className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{sub}</Text>}
                </div>
            )}
        </motion.div>
    );
}

// Pill-style date-range filter with a sliding gradient highlight.
function RangeFilter({ value, onChange }) {
    return (
        <LayoutGroup id="range-filter">
            <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-gray-200 bg-white/70 p-1 shadow-sm backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/70">
                {RANGES.map((r) => {
                    const active = value === r.key;
                    return (
                        <button
                            key={r.key}
                            type="button"
                            onClick={() => onChange(r.key)}
                            aria-pressed={active}
                            className="relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                        >
                            {active && (
                                <motion.span
                                    layoutId="range-pill"
                                    className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm shadow-indigo-500/30"
                                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                                />
                            )}
                            <span className={`relative z-10 ${active ? 'text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}>
                                {r.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </LayoutGroup>
    );
}

// Sort options for the recent-activity feed. Each carries a comparator applied
// to the (already-sliced) recent set, so switching just re-orders the same items
// in place — "recent" still means the N most recently updated workflows.
const ACTIVITY_SORTS = [
    { key: 'newest', label: 'Newest first', compare: (a, b) => new Date(b.updated_at) - new Date(a.updated_at) },
    { key: 'oldest', label: 'Oldest first', compare: (a, b) => new Date(a.updated_at) - new Date(b.updated_at) },
    { key: 'most-steps', label: 'Most steps', compare: (a, b) => (b.steps ?? 0) - (a.steps ?? 0) },
    { key: 'fewest-steps', label: 'Fewest steps', compare: (a, b) => (a.steps ?? 0) - (b.steps ?? 0) },
    { key: 'name', label: 'A–Z by name', compare: (a, b) => (a.name ?? '').localeCompare(b.name ?? '') },
];

// Small styled dropdown for re-ordering the recent-activity feed. Mirrors the
// card/pill styling used elsewhere on the page (soft border, glass background,
// indigo focus ring) and stays compact so it sits inline in the section header.
function ActivitySortControl({ value, onChange }) {
    return (
        <label className="relative inline-flex items-center">
            <span className="sr-only">Sort recent activity</span>
            <ArrowUpDown
                size={13}
                className="pointer-events-none absolute left-2.5 text-gray-400 dark:text-gray-500"
                aria-hidden="true"
            />
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white/70 py-1.5 pl-7 pr-7 text-xs font-medium text-gray-600 shadow-sm backdrop-blur-md transition-colors hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-300 dark:hover:text-white"
            >
                {ACTIVITY_SORTS.map((s) => (
                    <option key={s.key} value={s.key}>
                        {s.label}
                    </option>
                ))}
            </select>
            <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2 text-gray-400 dark:text-gray-500"
                aria-hidden="true"
            />
        </label>
    );
}

export default function Analytics({ workflows }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    // Pass an explicit theme so ECharts matches the app's class-based dark mode
    // (its auto-detection keys off prefers-color-scheme, not our toggle).
    const chartTheme = isDark ? 'dark' : undefined;
    const axisColor = isDark ? '#9ca3af' : '#6b7280';
    const splitColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    // User preferences (default range, heatmap color, chart visibility, feed
    // length). Read once on mount — the Settings page persists these to
    // localStorage and a reload picks up any changes.
    const [settings] = useState(() => getSettings());

    // Active date range — seeded from the saved default, falling back to "all"
    // if the stored value is somehow unknown. Filtering and all aggregation
    // happen client-side so switching ranges re-computes everything instantly.
    const [range, setRange] = useState(() =>
        RANGES.some((r) => r.key === settings.analyticsDefaultRange) ? settings.analyticsDefaultRange : 'all',
    );
    const activeRange = RANGES.find((r) => r.key === range) ?? RANGES[3];

    const filtered = useMemo(() => filterByRange(workflows, activeRange.days), [workflows, activeRange.days]);
    const stats = useMemo(() => computeStats(filtered), [filtered]);
    const { total, byTemplate, byTag, overTime, longest, newest, startMethod } = stats;

    // The contribution heatmap is a fixed trailing-52-week view of all activity —
    // it intentionally ignores the range filter (a year grid is its whole point).
    const heatmap = useMemo(() => buildHeatmap(workflows), [workflows]);

    // Recent activity — the N most recently saved/modified workflows (by
    // updated_at), where N is the saved feed length. Filter-independent:
    // "recent" is inherently recent.
    const feedLength = useMemo(() => {
        const n = parseInt(settings.activityFeedLength, 10);
        return Number.isFinite(n) ? n : 8;
    }, [settings.activityFeedLength]);
    const recent = useMemo(
        () => [...workflows].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, feedLength),
        [workflows, feedLength],
    );

    // Re-orderable view of the recent feed. The base set (most-recent N) is fixed;
    // this only changes the order they're displayed in, re-computing instantly
    // whenever the user picks a different sort option.
    const [recentSort, setRecentSort] = useState('newest');
    const sortedRecent = useMemo(() => {
        const sorter = ACTIVITY_SORTS.find((s) => s.key === recentSort) ?? ACTIVITY_SORTS[0];
        return [...recent].sort(sorter.compare);
    }, [recent, recentSort]);

    // Clicking a slice/bar jumps to the workflow list with that template/tag
    // pre-applied (WorkflowList seeds its filters from these query params).
    const goToTemplate = (name) => router.visit(`/workflows-list?q=${encodeURIComponent(name)}`);
    const goToTag = (tag) => router.visit(`/workflows-list?tag=${encodeURIComponent(tag)}`);

    // Export every saved workflow as a ZIP of JSON files. The analytics payload
    // is intentionally lean (no nodes/edges), so fetch the full records on demand
    // and bundle them client-side — mirrors Settings' export.
    const [status, setStatus] = useState(null);
    const [exporting, setExporting] = useState(false);
    useEffect(() => {
        if (!status) return;
        const t = setTimeout(() => setStatus(null), 3000);
        return () => clearTimeout(t);
    }, [status]);

    const exportAll = async () => {
        if (exporting) return;
        setExporting(true);
        try {
            const res = await fetch('/workflows', { headers: { Accept: 'application/json' } });
            if (!res.ok) throw new Error('Request failed');
            const all = await res.json();
            if (!all.length) {
                setStatus({ type: 'error', text: 'You have no saved workflows to export yet.' });
                return;
            }
            const files = all.map((w) => ({
                name: `${slugify(w.name)}-${w.id}.json`,
                content: JSON.stringify(
                    { name: w.name, description: w.description ?? '', nodes: w.nodes, edges: w.edges, tags: w.tags ?? [] },
                    null,
                    2,
                ),
            }));
            const blob = createZip(files);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'workflows.zip';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            setStatus({ type: 'success', text: `Exported ${files.length} workflow${files.length === 1 ? '' : 's'} as a ZIP.` });
        } catch {
            setStatus({ type: 'error', text: 'Could not export your workflows. Please try again.' });
        } finally {
            setExporting(false);
        }
    };

    // Export the dashboard as a PDF via the browser's print-to-PDF. A
    // print-specific stylesheet (see app.css `@media print` + `print:` utilities
    // below) strips the nav/buttons and adds a report header/footer so the output
    // reads as a clean report rather than a raw page dump. We flip `printing` on
    // first so the button shows a "Generating PDF…" state, let React paint it,
    // then open the print dialog (window.print blocks until it's dismissed).
    const [printing, setPrinting] = useState(false);
    const reportDate = useMemo(
        () => new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
        [],
    );
    const exportPdf = () => {
        if (printing) return;
        setPrinting(true);
        setTimeout(() => {
            try {
                window.print();
            } finally {
                setPrinting(false);
            }
        }, 350);
    };

    // Completed-run count lives in localStorage (no runs table yet). It has no
    // per-run timestamps, so it's an all-time figure regardless of the filter.
    const [runs, setRuns] = useState(0);
    useEffect(() => {
        setRuns(getRunsCompleted());
    }, []);

    const uniqueTags = byTag.length;
    const startTotal = startMethod.template + startMethod.scratch;
    const templatePct = startTotal > 0 ? Math.round((startMethod.template / startTotal) * 100) : 0;
    const rangeNoun = activeRange.days ? `the last ${activeRange.days} days` : 'your workspace';

    const templateOption = useMemo(
        () => ({
            tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
            legend: {
                type: 'scroll',
                orient: 'horizontal',
                bottom: 0,
                textStyle: { color: axisColor },
            },
            series: [
                {
                    name: 'Template',
                    type: 'pie',
                    radius: ['45%', '70%'],
                    center: ['50%', '44%'],
                    avoidLabelOverlap: true,
                    itemStyle: { borderRadius: 6, borderColor: isDark ? '#111827' : '#fff', borderWidth: 2 },
                    label: { show: false },
                    emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
                    cursor: 'pointer',
                    data: byTemplate.map((t, i) => ({
                        name: t.name,
                        value: t.count,
                        itemStyle: { color: PALETTE[i % PALETTE.length] },
                    })),
                },
            ],
        }),
        [byTemplate, axisColor, isDark],
    );

    const tagOption = useMemo(
        () => ({
            grid: { left: 8, right: 24, top: 16, bottom: 8, containLabel: true },
            tooltip: {
                trigger: 'item',
                axisPointer: { type: 'shadow' },
                formatter: (p) => `${p.name}: <b>${p.value}</b> workflow${p.value === 1 ? '' : 's'}`,
            },
            xAxis: {
                type: 'value',
                axisLabel: { color: axisColor },
                splitLine: { lineStyle: { color: splitColor } },
            },
            yAxis: {
                type: 'category',
                inverse: true,
                data: byTag.map((t) => t.tag),
                axisLabel: { color: axisColor },
                axisLine: { lineStyle: { color: splitColor } },
            },
            series: [
                {
                    name: 'Workflows',
                    type: 'bar',
                    cursor: 'pointer',
                    data: byTag.map((t, i) => ({
                        value: t.count,
                        itemStyle: { color: PALETTE[i % PALETTE.length], borderRadius: [0, 6, 6, 0] },
                    })),
                    barMaxWidth: 26,
                },
            ],
        }),
        [byTag, axisColor, splitColor],
    );

    const overTimeOption = useMemo(
        () => ({
            grid: { left: 8, right: 24, top: 24, bottom: 8, containLabel: true },
            tooltip: { trigger: 'axis' },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: overTime.map((d) => d.date),
                axisLabel: {
                    color: axisColor,
                    formatter: (value) => {
                        const d = new Date(value);
                        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    },
                },
                axisLine: { lineStyle: { color: splitColor } },
            },
            yAxis: {
                type: 'value',
                minInterval: 1,
                axisLabel: { color: axisColor },
                splitLine: { lineStyle: { color: splitColor } },
            },
            series: [
                {
                    name: 'Workflows saved',
                    type: 'line',
                    smooth: true,
                    showSymbol: overTime.length <= 31,
                    symbolSize: 7,
                    data: overTime.map((d) => d.count),
                    lineStyle: { width: 3, color: '#6366f1' },
                    itemStyle: { color: '#6366f1' },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.25)' },
                                { offset: 1, color: 'rgba(99,102,241,0)' },
                            ],
                        },
                    },
                },
            ],
        }),
        [overTime, axisColor, splitColor, isDark],
    );

    const heatmapOption = useMemo(() => {
        const cardBg = isDark ? '#111827' : '#ffffff';
        const emptyCell = isDark ? 'rgba(148,163,184,0.12)' : '#ebedf0';
        const scheme = HEATMAP_SCALES[settings.heatmapColor] ?? HEATMAP_SCALES.purple;
        const scale = isDark ? scheme.dark : scheme.light;
        return {
            tooltip: {
                formatter: (p) => {
                    const [day, count] = p.value;
                    const nice = new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                    });
                    return `${nice}<br/><b>${count}</b> workflow${count === 1 ? '' : 's'} created`;
                },
            },
            visualMap: {
                min: 1,
                max: heatmap.max,
                type: 'piecewise',
                splitNumber: Math.min(heatmap.max, 4),
                orient: 'horizontal',
                left: 'right',
                top: 0,
                itemWidth: 11,
                itemHeight: 11,
                itemGap: 3,
                hoverLink: false,
                showLabel: false,
                text: ['More', 'Less'],
                textStyle: { color: axisColor, fontSize: 10 },
                inRange: { color: scale },
            },
            calendar: {
                top: 36,
                left: 36,
                right: 8,
                bottom: 4,
                cellSize: ['auto', 14],
                range: heatmap.range,
                splitLine: { show: false },
                itemStyle: { color: emptyCell, borderColor: cardBg, borderWidth: 3 },
                yearLabel: { show: false },
                monthLabel: { color: axisColor, fontSize: 10, margin: 8 },
                dayLabel: {
                    firstDay: 1,
                    margin: 4,
                    nameMap: ['', 'Mon', '', 'Wed', '', 'Fri', ''],
                    color: axisColor,
                    fontSize: 10,
                },
            },
            series: {
                type: 'heatmap',
                coordinateSystem: 'calendar',
                data: heatmap.data,
                itemStyle: { borderColor: cardBg, borderWidth: 3 },
            },
        };
    }, [heatmap, axisColor, isDark, settings.heatmapColor]);

    const hasData = workflows.length > 0;

    return (
        <>
            <Head title="Analytics — Fancy Workflows" />

            <div className="flex min-h-screen flex-col bg-gray-50 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(59,130,246,0.08),transparent_70%)] transition-colors duration-300 dark:bg-gray-950 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(99,102,241,0.15),transparent_70%)]">
                {/* Glassmorphism header — mirrors WorkflowList for visual continuity. */}
                <header className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/70 px-6 py-4 backdrop-blur-md transition-colors duration-300 dark:border-gray-800/60 dark:bg-gray-900/70 print:hidden">
                    <div className="mx-auto flex max-w-5xl items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <Logo className="text-indigo-600 dark:text-indigo-400" />
                            <div className="flex flex-col">
                                <Heading as="h2" size="xl" weight="semibold">
                                    Analytics
                                </Heading>
                                <Text className="hidden text-xs text-gray-500 dark:text-gray-400 sm:block">
                                    How your workflows break down across templates, tags, and time.
                                </Text>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link
                                href="/settings"
                                aria-label="Settings"
                                title="Settings"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-100/80 text-gray-700 transition-colors hover:bg-gray-200/80 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-gray-700/80"
                            >
                                <Settings size={18} aria-hidden="true" />
                            </Link>
                            <ThemeToggle />
                            <Link href="/workflows-list">
                                <NavButton>Workflows</NavButton>
                            </Link>
                        </div>
                    </div>
                </header>

                <div className="print:hidden">
                    <GradientDivider />
                </div>

                <main className="mx-auto w-full max-w-5xl flex-1 p-6">
                    {/* Print-only report header — app name + current date at the top
                        of the exported PDF. Hidden on screen, shown only when the
                        browser is printing (see `exportPdf` / @media print). */}
                    <div className="mb-6 hidden border-b border-gray-300 pb-4 print:block">
                        <div className="flex items-center gap-2.5">
                            <Logo className="text-indigo-600" />
                            <Heading as="h1" size="2xl" weight="bold">
                                Fancy Workflows — Analytics Report
                            </Heading>
                        </div>
                        <Text className="mt-1.5 text-sm text-gray-600">
                            Generated {reportDate} · {activeRange.days ? `Last ${activeRange.days} days` : 'All time'} ·{' '}
                            {filtered.length} of {workflows.length} {workflows.length === 1 ? 'workflow' : 'workflows'}
                        </Text>
                    </div>

                    {/* Quick actions bar. */}
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="mb-6 flex flex-wrap items-center gap-3 print:hidden"
                    >
                        <Link href="/workflow">
                            <motion.div className="inline-flex" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                <Button variant="primary" className="rounded-full shadow-sm shadow-indigo-500/20">
                                    <span className="inline-flex items-center gap-2">
                                        <Plus size={16} aria-hidden="true" /> New Workflow
                                    </span>
                                </Button>
                            </motion.div>
                        </Link>
                        <Link href="/workflows-list">
                            <motion.div className="inline-flex" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                <Button variant="outline" color="gray" className="rounded-full">
                                    <span className="inline-flex items-center gap-2">
                                        <LayoutTemplate size={16} aria-hidden="true" /> Browse Templates
                                    </span>
                                </Button>
                            </motion.div>
                        </Link>
                        <motion.div className="inline-flex" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                            <Button variant="outline" color="gray" className="rounded-full" onClick={exportAll} disabled={exporting || !hasData}>
                                <span className="inline-flex items-center gap-2">
                                    <Download size={16} aria-hidden="true" /> {exporting ? 'Exporting…' : 'Export All'}
                                </span>
                            </Button>
                        </motion.div>
                    </motion.div>

                    {!hasData ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 text-center dark:border-gray-800 dark:bg-gray-900">
                            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
                                <BarChart3 size={24} aria-hidden="true" />
                            </span>
                            <Heading as="h3" size="lg" weight="semibold">
                                No data to chart yet
                            </Heading>
                            <Text className="mt-1.5 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                                Save a few workflows and your analytics will appear here.
                            </Text>
                            <Link
                                href="/workflows-list"
                                className="mt-4 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                            >
                                Browse templates &amp; workflows →
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* Date-range filter bar. */}
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                                className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden"
                            >
                                <Text className="text-sm text-gray-500 dark:text-gray-400">
                                    Showing <span className="font-semibold text-gray-700 dark:text-gray-200">{filtered.length}</span> of{' '}
                                    {workflows.length} {workflows.length === 1 ? 'workflow' : 'workflows'}
                                    {activeRange.days ? ` from the last ${activeRange.days} days` : ' (all time)'}
                                </Text>
                                <div className="flex flex-wrap items-center gap-3">
                                    <RangeFilter value={range} onChange={setRange} />
                                    <motion.div className="inline-flex" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                        <Button
                                            variant="outline"
                                            color="gray"
                                            className="rounded-full"
                                            onClick={exportPdf}
                                            disabled={printing}
                                            aria-busy={printing}
                                        >
                                            <span className="inline-flex items-center gap-2">
                                                <FileText size={16} aria-hidden="true" /> {printing ? 'Generating PDF…' : 'Export PDF'}
                                            </span>
                                        </Button>
                                    </motion.div>
                                </div>
                            </motion.div>

                            {/* Filtered stats + charts. Keyed on the range so switching
                                re-mounts and replays the staggered entrance. */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={range}
                                    variants={stagger}
                                    initial="hidden"
                                    animate="visible"
                                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                                    className="grid grid-cols-1 gap-5 lg:grid-cols-2"
                                >
                                    {/* Big-number stat card. */}
                                    <motion.section
                                        variants={fadeUp}
                                        className="print-card relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:col-span-2"
                                    >
                                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                                        <div className="flex items-center gap-2.5">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
                                                <Layers size={17} aria-hidden="true" />
                                            </span>
                                            <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                Total workflows saved
                                            </Text>
                                        </div>
                                        <div className="mt-3 flex items-end gap-3">
                                            <motion.span
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
                                                className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-6xl font-extrabold leading-none tracking-tight text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400"
                                            >
                                                {total}
                                            </motion.span>
                                            <Text className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                                                {total === 1 ? 'workflow' : 'workflows'} in {rangeNoun}
                                            </Text>
                                        </div>
                                    </motion.section>

                                    {/* Secondary stat cards — quick at-a-glance metrics. */}
                                    <motion.div variants={stagger} className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:col-span-2">
                                        <StatCard
                                            title="Total runs completed"
                                            icon={Zap}
                                            numeric
                                            value={runs}
                                            sub={`${runs === 1 ? 'run' : 'runs'} played (all time)`}
                                        />
                                        <StatCard
                                            title="Total tags used"
                                            icon={Tags}
                                            numeric
                                            value={uniqueTags}
                                            sub={`unique ${uniqueTags === 1 ? 'tag' : 'tags'} in ${rangeNoun}`}
                                        />
                                        <StatCard
                                            title="Longest workflow"
                                            icon={GitBranch}
                                            value={longest?.name ?? '—'}
                                            sub={longest ? `${longest.steps} ${longest.steps === 1 ? 'step' : 'steps'}` : 'No workflows in range'}
                                        />
                                        <StatCard
                                            title="Newest workflow"
                                            icon={Clock}
                                            value={newest?.name ?? '—'}
                                            sub={newest ? `Created ${timeAgo(newest.created_at)}` : 'No workflows in range'}
                                        />
                                        <StatCard title="Blank vs template started" icon={Split}>
                                            <div className="flex items-end justify-between gap-3">
                                                <div>
                                                    <span className="block text-3xl font-extrabold leading-none text-indigo-600 dark:text-indigo-400">
                                                        {startMethod.template}
                                                    </span>
                                                    <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">From template</Text>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-3xl font-extrabold leading-none text-gray-700 dark:text-gray-200">
                                                        {startMethod.scratch}
                                                    </span>
                                                    <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">From scratch</Text>
                                                </div>
                                            </div>
                                            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                                <motion.div
                                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${templatePct}%` }}
                                                    transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
                                                />
                                            </div>
                                        </StatCard>
                                    </motion.div>

                                    {/* Workflows by template type — donut. Click a
                                        slice to jump to that template, pre-filtered. */}
                                    {settings.showChart_templateDistribution && (
                                        <ChartCard title="Workflows by template type" icon={Layers}>
                                            {byTemplate.length > 0 ? (
                                                <>
                                                    <EChartLazy
                                                        option={templateOption}
                                                        theme={chartTheme}
                                                        style={{ height: 320 }}
                                                        onEvents={{ click: (p) => goToTemplate(p.name) }}
                                                    />
                                                    <Text className="mt-1 text-center text-[11px] text-gray-400 dark:text-gray-500">
                                                        Click a slice to view those workflows
                                                    </Text>
                                                </>
                                            ) : (
                                                <EmptyChart message="No workflows in this range." />
                                            )}
                                        </ChartCard>
                                    )}

                                    {/* Workflows by tag — horizontal bar. Click a bar to
                                        jump to that tag, pre-filtered. */}
                                    {settings.showChart_tags && (
                                        <ChartCard title="Workflows by tag" icon={TagIcon}>
                                            {byTag.length > 0 ? (
                                                <>
                                                    <EChartLazy
                                                        option={tagOption}
                                                        theme={chartTheme}
                                                        style={{ height: 320 }}
                                                        onEvents={{ click: (p) => goToTag(p.name) }}
                                                    />
                                                    <Text className="mt-1 text-center text-[11px] text-gray-400 dark:text-gray-500">
                                                        Click a bar to view those workflows
                                                    </Text>
                                                </>
                                            ) : (
                                                <EmptyChart message="No tagged workflows in this range." />
                                            )}
                                        </ChartCard>
                                    )}

                                    {/* Workflows created over time — line. */}
                                    {settings.showChart_workflowsOverTime && (
                                        <ChartCard title="Workflows created over time" icon={TrendingUp} className="lg:col-span-2">
                                            {overTime.length > 0 ? (
                                                <EChartLazy option={overTimeOption} theme={chartTheme} style={{ height: 320 }} />
                                            ) : (
                                                <EmptyChart message="No workflows created in this range." />
                                            )}
                                        </ChartCard>
                                    )}
                                </motion.div>
                            </AnimatePresence>

                            {/* Contribution heatmap — fixed trailing 52 weeks of all
                                activity, independent of the range filter above. */}
                            {settings.showChart_heatmap && (
                            <motion.section
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                                className="print-card mt-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                            >
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
                                            <CalendarDays size={17} aria-hidden="true" />
                                        </span>
                                        <Heading as="h3" size="sm" weight="semibold">
                                            Workflow creation activity
                                        </Heading>
                                    </div>
                                    <Text className="text-xs text-gray-400 dark:text-gray-500">Last 52 weeks</Text>
                                </div>
                                <div className="overflow-x-auto">
                                    <div className="min-w-[640px]">
                                        <EChartLazy
                                            option={heatmapOption}
                                            theme={chartTheme}
                                            style={{ height: 180 }}
                                            // Re-key on theme so the empty-cell / border colors rebuild cleanly.
                                            key={isDark ? 'dark' : 'light'}
                                        />
                                    </div>
                                </div>
                            </motion.section>
                            )}

                            {/* Recent activity feed — most recently saved/modified
                                workflows (independent of the range filter). */}
                            {settings.showChart_recentActivity && (
                            <motion.section
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
                                className="print-card mt-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                            >
                                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
                                            <Activity size={17} aria-hidden="true" />
                                        </span>
                                        <Heading as="h3" size="sm" weight="semibold">
                                            Recent activity
                                        </Heading>
                                    </div>
                                    <div className="flex items-center gap-3 self-end sm:self-auto">
                                        <Text className="text-xs text-gray-400 dark:text-gray-500">
                                            Last {recent.length} {recent.length === 1 ? 'update' : 'updates'}
                                        </Text>
                                        <ActivitySortControl value={recentSort} onChange={setRecentSort} />
                                    </div>
                                </div>
                                <LayoutGroup id="recent-activity">
                                <ul className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800/80">
                                    {sortedRecent.map((w, i) => (
                                        <motion.li
                                            key={w.id}
                                            layout
                                            initial={{ opacity: 0, x: 18 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{
                                                delay: 0.05 * i,
                                                duration: 0.35,
                                                ease: 'easeOut',
                                                layout: { type: 'spring', stiffness: 500, damping: 42 },
                                            }}
                                        >
                                            <Link
                                                href={`/workflow?id=${w.id}`}
                                                className="group flex items-center gap-3 py-2.5"
                                            >
                                                <span
                                                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-inset ring-black/5 dark:ring-white/10"
                                                    style={{ backgroundColor: accentFor(w.template) }}
                                                    aria-hidden="true"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium text-gray-900 transition-colors group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400">
                                                        {w.name}
                                                    </p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                                        {w.steps} {w.steps === 1 ? 'step' : 'steps'} · {timeAgo(w.updated_at)}
                                                    </p>
                                                </div>
                                                <ChevronRight
                                                    size={16}
                                                    className="shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-600"
                                                    aria-hidden="true"
                                                />
                                            </Link>
                                        </motion.li>
                                    ))}
                                </ul>
                                </LayoutGroup>
                            </motion.section>
                            )}
                        </>
                    )}
                </main>

                {/* Print-only report footer — pinned to the bottom of every printed
                    page by `.print-footer` (see app.css @media print). */}
                <div className="print-footer hidden pt-3 text-center text-xs text-gray-500 print:block">
                    Generated by Fancy Workflows
                </div>
            </div>

            {/* Transient export status toast. */}
            <AnimatePresence>
                {status && (
                    <motion.div
                        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border bg-white px-4 py-3 shadow-lg dark:bg-gray-900 ${
                            status.type === 'error'
                                ? 'border-red-200 dark:border-red-500/30'
                                : 'border-green-200 dark:border-green-500/30'
                        }`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        transition={{ duration: 0.2 }}
                    >
                        <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full ${
                                status.type === 'error'
                                    ? 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400'
                                    : 'bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400'
                            }`}
                        >
                            {status.type === 'error' ? <AlertTriangle size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
                        </span>
                        <Text className="text-sm text-gray-700 dark:text-gray-200">{status.text}</Text>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
