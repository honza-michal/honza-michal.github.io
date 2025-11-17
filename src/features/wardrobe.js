import { getWardrobeLayerIds } from '../io/config.js';

export function applyWardrobeLayers({ mirrorTop }) {
    const host = document.querySelector('#stage > svg');
    if (!host) return;

    const gBase = host.querySelector('#gBase');
    const gTop  = host.querySelector('#gTop');

    // UI-side (radios) choice
    let uiSide = (document.querySelector('input[name="wardrobeSide"]:checked')?.value) || 'left';
    const mirrored = !!mirrorTop;

    // Manual vs automatic flag
    const manualCheckbox = document.getElementById('wardrobeManual');
    const manual = manualCheckbox ? manualCheckbox.checked : true;

    // Was manual just turned ON this render?
    let justEnabledManual = false;
    try {
        if (typeof window !== 'undefined' && window.__wardrobeManualJustEnabled) {
            justEnabledManual = true;
            window.__wardrobeManualJustEnabled = false; // consume flag
        }
    } catch (_e) {}

    // Last user-chosen side, persisted globally
    let storedSide = null;
    try {
        if (typeof window !== 'undefined') {
            storedSide = window.__wardrobeUserSide || null;
        }
    } catch (_e) {}
    if (storedSide !== 'left' && storedSide !== 'right') storedSide = null;

    // --- Read storageSideSwitch config from META for current bottom & top ---
    let bottomEnabled = true;
    let bottomMode = 'layers'; // 'layers' | 'replacement'
    let defaultBottomSide = null;
    let bottomPriority = false;

    let topEnabled = true;
    let topMode = 'layers'; // 'layers' | 'replacement'
    let defaultTopSide = null;

    try {
        const pickBottom = document.getElementById('pickBottom');
        const pickTop    = document.getElementById('pickTop');
        const bottomId   = pickBottom?.value;
        const topId      = pickTop?.value;
        const meta       = (typeof window !== 'undefined' && window.META) ? window.META : null;

        if (meta) {
            if (Array.isArray(meta.bottoms) && bottomId) {
                const bottomCfg = meta.bottoms.find(b => b.id === bottomId);
                if (bottomCfg) {
                    const cfg = bottomCfg.storageSideSwitch || {};
                    if (Object.prototype.hasOwnProperty.call(cfg, 'enabled')) {
                        bottomEnabled = cfg.enabled !== false;
                    }
                    if (typeof cfg.mode === 'string') {
                        const m = cfg.mode;
                        bottomMode = (m === 'replacement' || m === 'bottom-replacement') ? 'replacement' : 'layers';
                    }
                    if (typeof cfg.defaultBottomSide === 'string') {
                        const db = cfg.defaultBottomSide;
                        if (db === 'left' || db === 'right') {
                            defaultBottomSide = db;
                        }
                    }
                    if (Object.prototype.hasOwnProperty.call(bottomCfg, 'priority_storage_loc')) {
                        bottomPriority = !!bottomCfg.priority_storage_loc;
                    }
                }
            }

            if (Array.isArray(meta.tops) && topId) {
                const topCfg = meta.tops.find(t => t.id === topId);
                if (topCfg) {
                    const cfgT = topCfg.storageSideSwitch || {};
                    if (Object.prototype.hasOwnProperty.call(cfgT, 'enabled')) {
                        topEnabled = cfgT.enabled !== false;
                    }
                    if (typeof cfgT.mode === 'string') {
                        const m = cfgT.mode;
                        topMode = (m === 'replacement' || m === 'top-replacement') ? 'replacement' : 'layers';
                    }
                    if (typeof cfgT.defaultTopSide === 'string') {
                        const dt = cfgT.defaultTopSide;
                        if (dt === 'left' || dt === 'right') {
                            defaultTopSide = dt;
                        }
                    }
                }
            }
        }
    } catch (e) {
        try { DBG && DBG('[TEMPDBG][wardrobe] storageSideSwitch cfg error', e); } catch (_e) {}
    }

    // --- Decide effective side & who is boss (bottom vs top) ---
    let bottomSide;
    let topBaseSide;
    let switchEnabled = true;
    let boss; // 'bottom' | 'top'

    // Rule A: bottom disabled -> bottom fixed, top must adapt, no switching, manual ignored
    if (!bottomEnabled) {
        boss = 'bottom';
        switchEnabled = false;
        const baseSide =
            (defaultBottomSide === 'left' || defaultBottomSide === 'right') ? defaultBottomSide :
            (defaultTopSide === 'left'     || defaultTopSide === 'right')     ? defaultTopSide :
            'left';

        bottomSide  = baseSide;
        topBaseSide = baseSide;

        // Reflect locked side in UI radios + styles
        const uiLockSide = baseSide;
        try {
            const wrap = document.getElementById('wardrobeSwitch');
            if (wrap) wrap.classList.add('locked');
            const radios = document.querySelectorAll('input[name="wardrobeSide"]');
            radios.forEach(r => {
                r.checked = (r.value === uiLockSide);
                r.disabled = true;
            });
        } catch (_e) {}
    } else {
        // Bottom can switch. Boss determined by priority_storage_loc.
        boss = bottomPriority ? 'bottom' : 'top';

        const bossDefault =
            boss === 'bottom'
                ? ((defaultBottomSide === 'left' || defaultBottomSide === 'right') ? defaultBottomSide : (defaultTopSide || null))
                : ((defaultTopSide === 'left' || defaultTopSide === 'right') ? defaultTopSide : (defaultBottomSide || null));

        const bossEnabled = boss === 'bottom' ? bottomEnabled : topEnabled;

        if (!manual) {
            // Automatic JSON-driven mode: ignore stored & UI, always use boss default.
            switchEnabled = false;
            const baseSide =
                (bossDefault === 'left' || bossDefault === 'right') ? bossDefault :
                'left';

            bottomSide  = baseSide;
            topBaseSide = baseSide;

            const uiLockSide = baseSide;
            try {
                const wrap = document.getElementById('wardrobeSwitch');
                if (wrap) wrap.classList.add('locked');
                const radios = document.querySelectorAll('input[name="wardrobeSide"]');
                radios.forEach(r => {
                    r.checked = (r.value === uiLockSide);
                    r.disabled = true;
                });
            } catch (_e) {}
        } else {
            // Manual mode.
            switchEnabled = bossEnabled;

            if (!switchEnabled) {
                // Boss is fixed: lock to its default side
                const baseSide =
                    (bossDefault === 'left' || bossDefault === 'right') ? bossDefault :
                    'left';

                bottomSide  = baseSide;
                topBaseSide = baseSide;

                const uiLockSide = baseSide;
                try {
                    const wrap = document.getElementById('wardrobeSwitch');
                    if (wrap) wrap.classList.add('locked');
                    const radios = document.querySelectorAll('input[name="wardrobeSide"]');
                    radios.forEach(r => {
                        r.checked = (r.value === uiLockSide);
                        r.disabled = true;
                    });
                } catch (_e) {}
            } else {
                // Switching enabled in manual mode.
                // On first enable, ignore UI + old stored side, use JSON boss default.
                let effectiveSide;

                if (justEnabledManual) {
                    if (bossDefault === 'left' || bossDefault === 'right') {
                        effectiveSide = bossDefault;
                    } else {
                        effectiveSide = 'left';
                    }
                } else {
                    // Subsequent manual renders: respect user & history
                    effectiveSide = uiSide;

                    if (storedSide === 'left' || storedSide === 'right') {
                        effectiveSide = storedSide;
                    } else if (bossDefault === 'left' || bossDefault === 'right') {
                        effectiveSide = bossDefault;
                    }

                    if (effectiveSide !== 'left' && effectiveSide !== 'right') {
                        effectiveSide = 'left';
                    }
                }

                bottomSide  = effectiveSide;
                topBaseSide = effectiveSide;

                // Ensure radios reflect the active side and are enabled
                try {
                    const wrap = document.getElementById('wardrobeSwitch');
                    if (wrap) wrap.classList.remove('locked');
                    const radios = document.querySelectorAll('input[name="wardrobeSide"]');
                    radios.forEach(r => {
                        r.disabled = false;
                        r.checked = (r.value === effectiveSide);
                    });
                } catch (_e) {}

                // Remember preferred side for next combos (while manual is on)
                try {
                    if (typeof window !== 'undefined') {
                        window.__wardrobeUserSide = effectiveSide;
                    }
                } catch (_e) {}
            }
        }
    }

    // Top side including mirror logic
    const topSide = mirrored
        ? (topBaseSide === 'left' ? 'right' : 'left')
        : topBaseSide;

    // --- Apply storage modes to bottom & top ---
    // Bottom: replacement -> bottomAll-L / bottomAll-R
    if (gBase && bottomMode === 'replacement') {
        const bottomAllL = gBase.querySelector('#bottomAll-L');
        const bottomAllR = gBase.querySelector('#bottomAll-R');
        const showLeft   = (bottomSide === 'left');
        if (bottomAllL) bottomAllL.setAttribute('display', showLeft ? null : 'none');
        if (bottomAllR) bottomAllR.setAttribute('display', showLeft ? 'none' : null);
    }

    // Top: replacement -> topAll-L / topAll-R
    if (gTop && topMode === 'replacement') {
        const topAllL   = gTop.querySelector('#topAll-L');
        const topAllR   = gTop.querySelector('#topAll-R');
        const showLeftT = (topSide === 'left');
        if (topAllL) topAllL.setAttribute('display', showLeftT ? null : 'none');
        if (topAllR) topAllR.setAttribute('display', showLeftT ? 'none' : null);
    }

    // Bottom: layers -> bottomL / bottomR (storage-only)
    if (gBase && bottomMode === 'layers') {
        const storeBottomL = gBase.querySelector('#bottomL');
        const storeBottomR = gBase.querySelector('#bottomR');
        const showLeft   = (bottomSide === 'left');
        if (storeBottomL) storeBottomL.setAttribute('display', showLeft ? null : 'none');
        if (storeBottomR) storeBottomR.setAttribute('display', showLeft ? 'none' : null);
    }

    // Top: layers -> topL / topR (storage-only)
    if (gTop && topMode === 'layers') {
        const storeTopL = gTop.querySelector('#topL');
        const storeTopR = gTop.querySelector('#topR');
        const showLeftT = (topSide === 'left');
        if (storeTopL) storeTopL.setAttribute('display', showLeftT ? null : 'none');
        if (storeTopR) storeTopR.setAttribute('display', showLeftT ? 'none' : null);
    }

    // --- Wardrobe layers via config (L-L/L-R/T-L/T-R) ---
    const ids = getWardrobeLayerIds();

    if (gBase) {
        const baseLeft  = gBase.querySelector('#' + ids.bottomLeft);
        const baseRight = gBase.querySelector('#' + ids.bottomRight);
        if (baseLeft)  baseLeft.setAttribute('display', bottomSide === 'left' ? null : 'none');
        if (baseRight) baseRight.setAttribute('display', bottomSide === 'right' ? null : 'none');
    }

    if (gTop) {
        const topLeftNode  = gTop.querySelector('#' + ids.topLeft);
        const topRightNode = gTop.querySelector('#' + ids.topRight);
        if (topLeftNode)  topLeftNode.setAttribute('display', topSide === 'left' ? null : 'none');
        if (topRightNode) topRightNode.setAttribute('display', topSide === 'right' ? null : 'none');
    }

    // Final safety: wardrobe switch UI enabled/disabled matches switchEnabled
    try {
        const wrap = document.getElementById('wardrobeSwitch');
        const radios = document.querySelectorAll('input[name="wardrobeSide"]');
        if (wrap && radios && radios.length) {
            if (!switchEnabled) {
                wrap.classList.add('locked');
                radios.forEach(r => { r.disabled = true; });
            } else {
                wrap.classList.remove('locked');
                radios.forEach(r => { r.disabled = false; });
            }
        }
    } catch (_e) {}

    
// Disable manual checkbox when bottom storage switching is disabled
try {
    const manualCB = document.getElementById('wardrobeManual');
    if (manualCB) {
        if (!bottomEnabled) {
            manualCB.disabled = true;
            manualCB.checked = false;
            if (typeof window !== 'undefined') {
                window.__wardrobeManual = false;
                window.__wardrobeManualJustEnabled = false;
                window.__wardrobeUserSide = null;
            }
        } else {
            manualCB.disabled = false;
        }
    }
} catch (_e) {}
// Debug
    try {
        DBG && DBG('[TEMPDBG][wardrobe] applied', {
            uiSide,
            storedSide,
            manual,
            justEnabledManual,
            bottomEnabled,
            topEnabled,
            bottomMode,
            topMode,
            bottomPriority,
            defaultTopSide,
            defaultBottomSide,
            bottomSide,
            topBaseSide,
            topSide,
            mirrored,
            switchEnabled,
        });
    } catch (_e) {}
}
