// src/features/corridorConnection.js
// Optional corridor-width transition between bottom & top.
//
// Logic:
// - Read bottom.spojeni_chodeb and top.spojeni_chodeb ("wide" / "narrow").
// - If bottom is "wide" AND top is "narrow" → enable a transition layer
//   in the bottom SVG:
//      - unmirrored  → show #wallTransitionL
//      - mirrored    → show #wallTransitionR
// - When a wallTransition layer is shown, hide base bottom variants:
//      - bottomAll-L / bottomAll-R (replacement mode)
//      - bottomLeft / bottomRight from config (layers mode)
//   and also disable the manual wardrobe checkbox (#wardrobeManual).
// - In all other cases → hide wallTransitionL/R and leave wardrobe logic in charge.
//
// Notes:
// - Attribute is optional on both bottoms and tops.
// - If attribute missing on either → transitions are hidden (no special handling).

import { getWardrobeLayerIds } from '../io/config.js';

export function applyCorridorConnection(state) {
    try {
        const host = document.querySelector('#stage > svg');
        const META = (typeof window !== 'undefined') ? window.META : null;
        if (!host || !META) return;

        const pickBottom = document.getElementById('pickBottom');
        const pickTop    = document.getElementById('pickTop');
        const bottomId   = pickBottom ? pickBottom.value : null;
        const topId      = pickTop ? pickTop.value : null;
        if (!bottomId || !topId) return;

        const bottomMeta = Array.isArray(META.bottoms)
            ? META.bottoms.find(b => b.id === bottomId)
            : null;
        const topMeta = Array.isArray(META.tops)
            ? META.tops.find(t => t.id === topId)
            : null;

        const bAttr = (bottomMeta && typeof bottomMeta.spojeni_chodeb === 'string')
            ? bottomMeta.spojeni_chodeb
            : null;
        const tAttr = (topMeta && typeof topMeta.spojeni_chodeb === 'string')
            ? topMeta.spojeni_chodeb
            : null;

        // Bottom root: same base group wardrobe uses
        const gBase = host.querySelector('#gBase') || host;
        if (!gBase) return;

        const wallL = gBase.querySelector('#wallTransitionL');
        const wallR = gBase.querySelector('#wallTransitionR');

        // If there are no transition layers at all, nothing to do.
        if (!wallL && !wallR) return;

        // Helper: hide both transition layers
        const hideTransitions = () => {
            if (wallL) wallL.setAttribute('display', 'none');
            if (wallR) wallR.setAttribute('display', 'none');
        };

        // Default: ensure transitions are hidden; wardrobe logic controls the rest.
        hideTransitions();

        // Only trigger when bottom=wide AND top=narrow
        const shouldTrigger = (bAttr === 'wide' && tAttr === 'narrow');

        if (!shouldTrigger) {
            try { window.DBG && window.DBG('[TEMPDBG][corridor] no trigger', { bottomId, topId, bAttr, tAttr }); } catch (_) {}
            return;
        }

        const mirrored = !!(state && state.mirrorTop);
        const toShow = !mirrored ? wallR : wallL;

        // If our chosen transition layer is missing, nothing more we can do.
        if (!toShow) {
            try { window.DBG && window.DBG('[TEMPDBG][corridor] trigger but target layer missing', { bottomId, topId, bAttr, tAttr, mirrored }); } catch (_) {}
            return;
        }

        // Show the chosen transition and keep the other hidden.
        if (wallL) wallL.setAttribute('display', toShow === wallL ? null : 'none');
        if (wallR) wallR.setAttribute('display', toShow === wallR ? null : 'none');

        // Align base bottom variants so they match the transition side:
        // if wallTransitionL is shown → show left base, hide right base,
        // if wallTransitionR is shown → show right base, hide left base.
        try {
            // 1) Replacement mode variants: bottomAll-L / bottomAll-R
            const bottomAllL = gBase.querySelector('#bottomAll-L');
            const bottomAllR = gBase.querySelector('#bottomAll-R');

            if (bottomAllL || bottomAllR) {
                const showLeft = (toShow === wallL);
                if (bottomAllL) bottomAllL.setAttribute('display', showLeft ? null : 'none');
                if (bottomAllR) bottomAllR.setAttribute('display', showLeft ? 'none' : null);
            } else {
                // 2) Layers mode variants via config (bottomLeft / bottomRight)
                try {
                    const ids = getWardrobeLayerIds();
                    if (ids && (ids.bottomLeft || ids.bottomRight)) {
                        const showLeft = (toShow === wallL);
                        if (ids.bottomLeft) {
                            const baseLeft = gBase.querySelector('#' + ids.bottomLeft);
                            if (baseLeft) baseLeft.setAttribute('display', showLeft ? null : 'none');
                        }
                        if (ids.bottomRight) {
                            const baseRight = gBase.querySelector('#' + ids.bottomRight);
                            if (baseRight) baseRight.setAttribute('display', showLeft ? 'none' : null);
                        }
                    }
                } catch (_e) {
                    // If config lookup fails, leave whatever wardrobe decided.
                }
            }
        } catch (_e) {
            // Ignore failures, purely visual sync.
        }

        // Disable the manual wardrobe checkbox while corridor transition is active
        try {
            const manualCheckbox = document.getElementById('wardrobeManual');
            if (manualCheckbox) {
                manualCheckbox.checked = false;
                manualCheckbox.disabled = true;
            }
        } catch (_e) {
            // Ignore failures, this is purely UI nicety.
        }

        try {
            window.DBG && window.DBG('[TEMPDBG][corridor] apply', {
                bottomId,
                topId,
                bAttr,
                tAttr,
                mirrored,
                shown: toShow && toShow.id
            });
        } catch (_) {}
    } catch (e) {
        try { window.DBG && window.DBG('[TEMPDBG][corridor][error]', e); } catch (_) {}
    }
}
