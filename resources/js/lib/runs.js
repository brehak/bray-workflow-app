// Lightweight, client-only tally of how many workflow runs have completed.
// We don't have a `runs` table yet, so the count lives in localStorage and is
// bumped each time a run reaches a terminal output node (see Workflow.jsx).
const RUNS_KEY = 'fancy-workflows:runs-completed';

/** Read the completed-run count (0 when unset, on the server, or if corrupted). */
export function getRunsCompleted() {
    if (typeof window === 'undefined') return 0;
    const raw = Number(localStorage.getItem(RUNS_KEY));
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
}

/** Bump the completed-run count by one and return the new total. */
export function incrementRunsCompleted() {
    if (typeof window === 'undefined') return 0;
    const next = getRunsCompleted() + 1;
    localStorage.setItem(RUNS_KEY, String(next));
    return next;
}
