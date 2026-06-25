import {
    EChart,
    registerCharts,
    PieChart,
    BarChart,
    LineChart,
    HeatmapChart,
    GridComponent,
    TooltipComponent,
    LegendComponent,
    CalendarComponent,
    VisualMapComponent,
    CanvasRenderer,
} from '@particle-academy/fancy-echarts';

// This module is the ONLY place ECharts is imported, and it's pulled in via a
// dynamic import() from EChartLazy — so the ~610 KB ECharts payload lands in its
// own deferred chunk instead of the Analytics page chunk. The page shell paints
// first; the charts hydrate once this chunk arrives.
//
// Register only the chart types the Analytics page renders (pie, bar, line,
// calendar heatmap) plus the components they need — tree-shaking the rest of
// ECharts out of the bundle. Safe at module scope: registration is idempotent.
registerCharts([
    PieChart,
    BarChart,
    LineChart,
    HeatmapChart,
    GridComponent,
    TooltipComponent,
    LegendComponent,
    CalendarComponent,
    VisualMapComponent,
    CanvasRenderer,
]);

// Thin pass-through so callers render <EChartLazy {...} /> with the exact same
// props the underlying <EChart> expects (option, theme, style, onEvents, key…).
export default function EChartImpl(props) {
    return <EChart {...props} />;
}
