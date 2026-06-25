import { lazy, Suspense } from 'react';

// Lazily pull in the ECharts-bearing implementation. Because this is a dynamic
// import(), Vite splits EChartImpl (and all of ECharts) into a separate chunk
// that only downloads when a chart first renders — keeping the ~610 KB payload
// off the Analytics page's critical path.
const EChartImpl = lazy(() => import('./EChartImpl'));

// Loading skeleton shown while the ECharts chunk streams in. Mirrors the chart's
// final footprint (via the same `style.height`) so the card doesn't jump when
// the real chart swaps in, and uses the app's gray palette + a soft pulse.
function ChartSkeleton({ style }) {
    const height = style?.height ?? 320;
    return (
        <div
            style={{ height }}
            role="status"
            aria-label="Loading chart…"
            className="flex w-full animate-pulse flex-col justify-end gap-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/40"
        >
            {/* Faux plot area with a few bars so the placeholder reads as a chart. */}
            <div className="flex flex-1 items-end gap-2">
                <div className="w-full rounded-t bg-gray-200 dark:bg-gray-700/60" style={{ height: '55%' }} />
                <div className="w-full rounded-t bg-gray-200 dark:bg-gray-700/60" style={{ height: '80%' }} />
                <div className="w-full rounded-t bg-gray-200 dark:bg-gray-700/60" style={{ height: '40%' }} />
                <div className="w-full rounded-t bg-gray-200 dark:bg-gray-700/60" style={{ height: '70%' }} />
                <div className="w-full rounded-t bg-gray-200 dark:bg-gray-700/60" style={{ height: '50%' }} />
                <div className="w-full rounded-t bg-gray-200 dark:bg-gray-700/60" style={{ height: '90%' }} />
            </div>
            {/* Faux axis line. */}
            <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-700/60" />
            <span className="sr-only">Loading chart…</span>
        </div>
    );
}

// Drop-in replacement for <EChart> that defers the ECharts bundle and shows a
// skeleton until it loads. Same props as the underlying EChart.
export default function EChartLazy(props) {
    return (
        <Suspense fallback={<ChartSkeleton style={props.style} />}>
            <EChartImpl {...props} />
        </Suspense>
    );
}
