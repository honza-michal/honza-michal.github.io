// src/boot/enableSvgPart.js
import { wirePartsFromDOM } from './wireParts.js';
import { mirrorPartHorizontally } from '../features/geometry.js';
import { getAnchorIds } from '../io/config.js';
import { Ready } from '../boot/ready.js';

(() => {
    if (window.__SVG_PART_BOOTED) return;
    window.__SVG_PART_BOOTED = true;

    let PARTS = null; // always the *current* wired parts (after project load)

    // Prefer an explicit “project loaded” event from your loader, else wait for anchors.
    function waitForProjectReadyOrAnchors() {
        return new Promise(resolve => {
            const done = () => resolve(true);

            // A) Explicit event (best): call window.dispatchEvent(new Event('project:ready')) after you inject the SVGs.
            const onReady = () => { window.removeEventListener('project:ready', onReady); done(); };
            window.addEventListener('project:ready', onReady, { once: true });

            // B) Fallback: anchors (#anchorL/#anchorTop) appear (configurable via config.anchors)
            const have = () => {
                const ids = getAnchorIds();
                return document.getElementById(ids.bottom) && document.getElementById(ids.top);
            };
            if (have()) return done();
            const obs = new MutationObserver(() => { if (have()) { obs.disconnect(); done(); } });
            obs.observe(document.documentElement, { childList: true, subtree: true });
        });
    }

    function anchorAlignOnce(parts) {
        const ids = getAnchorIds();
        const aL = document.getElementById(ids.bottom);
        const aT = document.getElementById(ids.top);
        if (!aL || !aT) return;

        const bbL = aL.getBBox(), bbT = aT.getBBox();
        const aLx = bbL.x + bbL.width / 2, aLy = bbL.y + bbL.height / 2;
        const aTx = bbT.x + bbT.width / 2, aTy = bbT.y + bbT.height / 2;
        const dx = aLx - aTx, dy = aLy - aTy;

        const prev = parts.top.el.getAttribute('transform') || '';
        parts.top.el.setAttribute('transform', prev && prev !== 'none'
        ? `${prev} translate(${dx},${dy})`
        : `translate(${dx},${dy})`);
    }

    async function wireFreshParts(){
        await Ready.wait();
        PARTS = wirePartsFromDOM();   // wire *now*, when SVGs exist
        if (!PARTS?.top || !PARTS?.bottom) return;
        anchorAlignOnce(PARTS);       // place top over bottom by anchors (once)
    }

    function installMirrorCheckbox() {
        let input = document.querySelector('#mirrorTop, [data-action="mirrorTop"]');
        if (!input) return;
        // hard takeover: remove prior listeners
        const clone = input.cloneNode(true);
        input.parentNode.replaceChild(clone, input);
        input = clone;

        const apply = () => {
            if (!PARTS?.top) return; // nothing wired yet
            const enabled = !!input.checked;      // it’s a checkbox
            mirrorPartHorizontally(PARTS.top, enabled); // geometry-only flip, anchor excluded
        };
        input.addEventListener('change', apply);
        apply(); // run once with the current checkbox state
    }

    // 1) Wait, wire, anchor-align
    // 2) Then install mirror handler (so it acts on *fresh* PARTS)
    window.addEventListener('DOMContentLoaded', async () => {
        await wireFreshParts();
        installMirrorCheckbox();
    });

    // Re-wire on every subsequent project load if your app dispatches the event again
    window.addEventListener('project:ready', async () => {
        await wireFreshParts();
    });
})();
