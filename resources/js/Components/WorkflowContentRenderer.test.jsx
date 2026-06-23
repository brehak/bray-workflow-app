import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WorkflowContentRenderer from './WorkflowContentRenderer';

describe('WorkflowContentRenderer', () => {
    it('renders valid Markdown content', () => {
        render(<WorkflowContentRenderer content={'Ship the **release** today'} />);

        const rendered = screen.getByTestId('workflow-content');
        expect(rendered).toBeInTheDocument();
        // Markdown emphasis should become a real <strong> element.
        const strong = rendered.querySelector('strong');
        expect(strong).not.toBeNull();
        expect(strong).toHaveTextContent('release');
        expect(screen.queryByTestId('workflow-content-fallback')).toBeNull();
    });

    it('shows the fallback for empty / whitespace / null content', () => {
        for (const empty of ['', '   ', null, undefined]) {
            const { unmount } = render(<WorkflowContentRenderer content={empty} />);
            expect(screen.getByTestId('workflow-content-fallback')).toBeInTheDocument();
            expect(screen.queryByTestId('workflow-content')).toBeNull();
            unmount();
        }
    });

    it('uses a custom fallback when provided', () => {
        render(<WorkflowContentRenderer content={null} fallback="Add instructions" />);
        expect(screen.getByText('Add instructions')).toBeInTheDocument();
    });

    it('does not render script tags from untrusted content', () => {
        render(
            <WorkflowContentRenderer content={'<p>safe</p><script>window.__pwned = true</script>'} />,
        );
        const rendered = screen.getByTestId('workflow-content');
        expect(rendered.querySelector('script')).toBeNull();
    });
});
