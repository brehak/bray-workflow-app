import { ContentRenderer } from '@particle-academy/react-fancy';
import { WORKFLOW_CONTENT_FORMAT, normalizeNodeContent } from '../lib/content';

/**
 * WorkflowContentRenderer — the single, safe entry point for rendering
 * node-authored prose (descriptions / instructions) as styled content.
 *
 * Responsibilities centralised here so call sites stay trivial:
 *   - Normalises arbitrary/legacy content into a renderable string.
 *   - Renders an empty/whitespace-only value as a muted fallback instead of an
 *     empty box.
 *   - Pins the safe defaults: a fixed Markdown format and react-fancy's default
 *     sanitisation. We never forward `unsafe`, so script/iframe/event-handler
 *     injection is always stripped — there is no path here to render raw HTML.
 *
 * @param {object}  props
 * @param {unknown} props.content   Raw node content (usually `node.data.description`).
 * @param {string}  [props.fallback] Text shown when content is empty.
 * @param {string}  [props.className] Extra classes for the rendered prose.
 */
export default function WorkflowContentRenderer({
    content,
    fallback = 'No description provided.',
    className,
}) {
    const value = normalizeNodeContent(content);

    if (!value) {
        return (
            <p
                data-testid="workflow-content-fallback"
                className="text-sm italic text-gray-400 dark:text-gray-500"
            >
                {fallback}
            </p>
        );
    }

    return (
        <div data-testid="workflow-content">
            {/* `unsafe` is intentionally never passed — sanitisation stays on. */}
            <ContentRenderer value={value} format={WORKFLOW_CONTENT_FORMAT} className={className} />
        </div>
    );
}
