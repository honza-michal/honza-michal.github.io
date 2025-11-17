import { filtry, normalizeUIFilters, partMatchesFilters } from './filters.js';

export function cycle(d = +1) {
    const b = document.getElementById('pickBottom');
    const t = document.getElementById('pickTop');

    if (!b || !t) {
        DBG('[TEMPDBG][cycle] missing selects');
        return;
    }
    if (!window.META || !Array.isArray(window.META.bottoms) || !Array.isArray(window.META.tops)) {
        DBG('[TEMPDBG][cycle] META missing or invalid');
        return;
    }

    DBG('[TEMPDBG][cycle] start', { d, currentBottom: b.value, currentTop: t.value });

    // 1) Build the canonical list of valid bottoms/tops based on current filters (not DOM quirks)
    const active = normalizeUIFilters(filtry);

    const bottoms = window.META.bottoms.filter(part => partMatchesFilters(part, active));
    const tops    = window.META.tops.filter(part => partMatchesFilters(part, active));

    if (!bottoms.length || !tops.length) {
        DBG('[TEMPDBG][cycle] no bottoms or tops after filters', {
            bottoms: bottoms.length,
            tops: tops.length
        });
        return;
    }

    const pairs = [];
    for (const bMeta of bottoms) {
        const allowed = Array.isArray(bMeta.tops) && bMeta.tops.length ? new Set(bMeta.tops) : null;
        for (const tMeta of tops) {
            if (!allowed || allowed.has(tMeta.id)) {
                pairs.push({ b: bMeta.id, t: tMeta.id });
            }
        }
    }

    if (!pairs.length) {
        DBG('[TEMPDBG][cycle] no valid pairs after compatibility');
        return;
    }

    // 🔍 New: full dump of the canonical sequence
    DBG('[TEMPDBG][cycle] pairs', {
        count: pairs.length,
        pairs
    });

    const curB = b.value;
    const curT = t.value;

    // 2) Find current index; if exact pair not found, fall back to first pair with same bottom, otherwise start from 0
    let idx = pairs.findIndex(p => p.b === curB && p.t === curT);
    if (idx < 0) {
        const sameBottomIdx = pairs.findIndex(p => p.b === curB);
        idx = sameBottomIdx >= 0 ? sameBottomIdx : 0;
    }

    const tot = pairs.length;
    idx = (idx + d + tot) % tot;
    const next = pairs[idx];

    DBG('[TEMPDBG][cycle] next', {
        d,
        next,
        tot,
        curB,
        curT,
        idx
    });

    // 3) First, change bottom – this will repopulate the top list via change handler + filters
    b.value = next.b;
    b.dispatchEvent(new Event('change', { bubbles: true }));

    // 4) After UI updates, enforce the desired (bottom, top) pair if it still exists.
    //    If not, we gracefully fall back to the closest valid combination.
    requestAnimationFrame(() => {
        const bottomIds = [...b.options].map(o => o.value).filter(Boolean);
        const topIds    = [...t.options].map(o => o.value).filter(Boolean);

        if (!bottomIds.length || !topIds.length) {
            DBG('[TEMPDBG][cycle] no options after update', { bottomIds, topIds });
            return;
        }

        // Enforce bottom: if our target bottom disappeared under filters, move to the first available one
        let enforcedBottom = bottomIds.includes(next.b) ? next.b : bottomIds[0];

        // Compute a compatible top for the enforced bottom
        let enforcedTop = null;
        if (topIds.includes(next.t) && enforcedBottom === next.b) {
            // Ideal case: keep exact requested top
            enforcedTop = next.t;
        } else {
            // Find first top that is compatible with the enforced bottom
            const metaBottom = window.META.bottoms.find(bb => bb.id === enforcedBottom);
            const allowedTopIds = metaBottom && Array.isArray(metaBottom.tops) ? metaBottom.tops : null;

            if (allowedTopIds && allowedTopIds.length) {
                enforcedTop = allowedTopIds.find(id => topIds.includes(id)) || null;
            }

            if (!enforcedTop) {
                // Last fallback: just take first available top from the list
                enforcedTop = topIds[0] || null;
            }
        }

        DBG('[TEMPDBG][cycle] enforce pair', {
            enforcedBottom,
            enforcedTop,
            bottomIds,
            topIds
        });

        if (enforcedBottom) {
            b.value = enforcedBottom;
        }
        if (enforcedTop) {
            t.value = enforcedTop;
            t.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
}
