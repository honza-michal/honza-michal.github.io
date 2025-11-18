// src/boot/wireParts.js
import { SvgPart } from '../core/svgPart.js';
import { getAnchorIds } from '../io/config.js';

// Find root + subgroups from DOM that now exists
function pick(...sels){ for (const s of sels){ const el = document.querySelector(s); if (el) return el; } return null; }

export function wirePartsFromDOM() {
    const gBottom = pick('#gBottom','g.bottom','#bottom-root');
    const gTop    = pick('#gTop','g.top','#top-root');
    if (!gBottom || !gTop) {
        console.warn('[wireParts] SVG roots not found (wire after project:ready).');
        return null;
    }

    // Geometry-only groups (fallback to root if not present)
    const gBottomGeom = gBottom.querySelector('.geom,.geometry,[data-role="geometry"]') || gBottom;
    const gTopGeom    = gTop.querySelector('.geom,.geometry,[data-role="geometry"]') || gTop;

    // Anchor groups (fallback to root if missing)
    const ids = getAnchorIds();
    const gBottomAnchor = gBottom.querySelector(`#${ids.bottom},.anchor,[data-role="anchor"]`) || gBottom;
    const gTopAnchor    = gTop.querySelector(`#${ids.top},.anchor,[data-role="anchor"]`) || gTop;

    const bottom = new SvgPart('bottom', gBottom, gBottomGeom, gBottomAnchor);
    const top    = new SvgPart('top', gTop,    gTopGeom,    gTopAnchor);
    bottom.initFromDOM(); top.initFromDOM();

    const parts = { bottom, top };
    window.SVG_PARTS = parts;
    return parts;
}
