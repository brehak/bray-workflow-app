import { useEffect } from 'react';
import { FRIENDLY_SECTION_LABELS } from '../lib/friendlyPalette';

/**
 * PaletteRelabel — renames fancy-flow's built-in palette section headers
 * ("Triggers", "Logic", "AI", …) to friendly language ("Start",
 * "Decision & Flow", "Smart Actions", …).
 *
 * The palette derives section titles from a hard-coded category→label map with
 * no override prop, so we relabel them in the DOM. We map by the header's
 * *original* text (not its position), which keeps the rename correct even when
 * the palette's search box filters sections out and reorders what's visible.
 * Only `.ff-palette__group-label` elements are touched — node rows are renamed
 * the proper way (re-registered kind labels), so nothing here affects the
 * underlying node types or behavior.
 *
 * `containerRef` points at a stable element that contains the palette (the
 * editor box). A MutationObserver re-applies the mapping whenever the palette
 * re-renders (search, scroll virtualization, remount).
 */
export default function PaletteRelabel({ containerRef }) {
    useEffect(() => {
        const root = containerRef?.current;
        if (!root) return;

        const apply = () => {
            const labels = root.querySelectorAll('.ff-palette__group-label');
            labels.forEach((el) => {
                const friendly = FRIENDLY_SECTION_LABELS[el.textContent];
                // Only rewrite when the current text is an original key (so this
                // is idempotent — once renamed, the text no longer matches and we
                // leave it alone, avoiding an observer feedback loop).
                if (friendly && el.textContent !== friendly) el.textContent = friendly;
            });
        };

        apply();
        const observer = new MutationObserver(apply);
        observer.observe(root, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, [containerRef]);

    return null;
}
