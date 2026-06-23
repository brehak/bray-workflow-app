/**
 * Content helpers for node-authored prose (descriptions / instructions).
 *
 * We standardise on **Markdown** as the on-disk content format: every existing
 * node already stores `data.description` as a plain string, and plain text is a
 * valid subset of Markdown — so old data renders unchanged while authors gain
 * **bold**, lists, links, etc. going forward. Rendering always runs through the
 * sanitising path in WorkflowContentRenderer; raw/unsafe HTML is never emitted.
 */

/** The content format passed to ContentRenderer for workflow node prose. */
export const WORKFLOW_CONTENT_FORMAT = 'markdown';

/**
 * Coerce arbitrary node content into a safe, renderable string.
 *
 * Backward-compatibility: older nodes only ever stored a plain string (or
 * nothing) in `data.description`, but we don't want a malformed value to throw
 * inside the renderer. This normalises every shape down to a trimmed string,
 * returning '' for anything we can't meaningfully render (so the wrapper shows
 * its fallback instead).
 *
 * @param {unknown} content
 * @returns {string}
 */
export function normalizeNodeContent(content) {
    if (content == null) return '';
    if (typeof content === 'string') return content.trim();
    if (typeof content === 'number' || typeof content === 'boolean') return String(content);
    // Objects/arrays were never a valid description shape — treat as empty so
    // the caller falls back rather than rendering "[object Object]".
    return '';
}
