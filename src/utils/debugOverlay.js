// debugOverlay.js
// Overlay + wrapper around (or replacement for) global DBG.
//
// - If window.DBG already exists (from your earlier debug system),
//   we WRAP it and add overlay logging.
// - If not, we create DBG ourselves.
// - In both cases we attach:
//     DBG.showOverlay()
//     DBG.hideOverlay()
//     DBG.toggleOverlay()
//   And also helpers:
//     DBG_SHOW_OVERLAY()
//     DBG_HIDE_OVERLAY()
//     DBG_TOGGLE_OVERLAY()
// - Toggle overlay with Ctrl/Cmd + Shift + D.

(function () {
    const w = window;

    const prevDBG = typeof w.DBG === 'function' ? w.DBG : null;

    if (!('DEBUG' in w)) {
        // Default off, can be set anytime in console.
        w.DEBUG = false;
    }

    let overlay = null;
    let logEl = null;
    let isVisible = false;

    function safeToString(v) {
        try {
            if (v === null) return 'null';
            if (v === undefined) return 'undefined';
            if (typeof v === 'string') return v;
            if (typeof v === 'number' || typeof v === 'boolean') return String(v);
            if (v instanceof Error) return v.stack || v.message || String(v);
            if (typeof v === 'object') return JSON.stringify(v);
            return String(v);
        } catch (e) {
            return '[unserializable]';
        }
    }

    function ensureOverlay() {
        if (overlay && logEl) return;

        const doc = document;
        if (!doc.body) {
            doc.addEventListener('DOMContentLoaded', ensureOverlay, { once: true });
            return;
        }

        overlay = doc.createElement('div');
        overlay.id = 'debugOverlay';
        overlay.style.position = 'fixed';
        overlay.style.zIndex = '999999';
        overlay.style.right = '10px';
        overlay.style.bottom = '10px';
        overlay.style.width = '420px';
        overlay.style.maxHeight = '50vh';
        overlay.style.background = 'rgba(0,0,0,0.8)';
        overlay.style.color = '#fff';
        overlay.style.fontFamily = 'monospace';
        overlay.style.fontSize = '11px';
        overlay.style.borderRadius = '8px';
        overlay.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        overlay.style.display = 'none'; // start hidden
        overlay.style.cursor = 'move';
        overlay.style.userSelect = 'none';

        const header = doc.createElement('div');
        header.textContent = '[TEMPDBG] Overlay — click to hide/show — (drag to move)';
        header.style.padding = '4px 8px';
        header.style.fontWeight = 'bold';
        header.style.borderBottom = '1px solid rgba(255,255,255,0.2)';

        logEl = doc.createElement('div');
        logEl.style.padding = '4px 8px';
        logEl.style.maxHeight = '40vh';
        logEl.style.overflowY = 'auto';
        logEl.style.cursor = 'default';
        logEl.style.userSelect = 'text';

        overlay.appendChild(header);
        overlay.appendChild(logEl);
        doc.body.appendChild(overlay);

        // Click header toggles show/hide
        header.addEventListener('click', function (ev) {
            ev.stopPropagation();
            toggleOverlay();
        });

        // Drag to move
        let drag = null;
        header.addEventListener('mousedown', function (ev) {
            ev.preventDefault();
            drag = {
                startX: ev.clientX,
                startY: ev.clientY,
                startRight: parseInt(overlay.style.right, 10) || 10,
                startBottom: parseInt(overlay.style.bottom, 10) || 10
            };
            window.addEventListener('mousemove', onDragMove);
            window.addEventListener('mouseup', onDragEnd);
        });

        function onDragMove(ev) {
            if (!drag) return;
            const dx = ev.clientX - drag.startX;
            const dy = ev.clientY - drag.startY;
            overlay.style.right = (drag.startRight - dx) + 'px';
            overlay.style.bottom = (drag.startBottom - dy) + 'px';
        }

        function onDragEnd() {
            window.removeEventListener('mousemove', onDragMove);
            window.removeEventListener('mouseup', onDragEnd);
            drag = null;
        }

        console.debug('[TEMPDBG][overlay] ready — toggle with Ctrl/Cmd+Shift+D');
    }

    function showOverlay() {
        ensureOverlay();
        if (!overlay) return;
        overlay.style.display = 'block';
        isVisible = true;
    }

    function hideOverlay() {
        if (!overlay) return;
        overlay.style.display = 'none';
        isVisible = false;
    }

    function toggleOverlay() {
        if (isVisible) hideOverlay();
        else showOverlay();
    }

    function appendToOverlay(args) {
        ensureOverlay();
        if (!logEl) return;
        const line = document.createElement('div');
        const now = new Date();
        const ts = now.toTimeString().slice(0, 8);
        line.textContent = '[' + ts + '] ' + args.map(safeToString).join(' ');
        logEl.appendChild(line);
        logEl.scrollTop = logEl.scrollHeight;
    }

    // This is the new logging core that always feeds the overlay
    function dbgOverlayImpl() {
        const args = Array.prototype.slice.call(arguments);
        appendToOverlay(args);

        if (typeof prevDBG === 'function') {
            // Use your original DBG logic as well
            return prevDBG.apply(w, args);
        } else if (w.DEBUG) {
            // Fallback: console debug when DEBUG=true
            console.debug('DEBUG', ...args);
        }
    }

    function attachHelpers(target) {
        target.showOverlay = showOverlay;
        target.hideOverlay = hideOverlay;
        target.toggleOverlay = toggleOverlay;
    }

    // Build the final DBG:
    let newDBG;

    if (typeof prevDBG === 'function') {
        // Wrap existing DBG
        newDBG = function () {
            return dbgOverlayImpl.apply(w, arguments);
        };
    } else {
        // Create DBG from scratch
        newDBG = function () {
            return dbgOverlayImpl.apply(w, arguments);
        };
    }

    attachHelpers(newDBG);

    // Expose helper globals as well (more robust against future overwrites)
    w.DBG_SHOW_OVERLAY = showOverlay;
    w.DBG_HIDE_OVERLAY = hideOverlay;
    w.DBG_TOGGLE_OVERLAY = toggleOverlay;

    // Install our DBG
    w.DBG = newDBG;

    // Create overlay once DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureOverlay, { once: true });
    } else {
        ensureOverlay();
    }

    // Keyboard toggle: Ctrl/Cmd + Shift + D
    window.addEventListener('keydown', function (ev) {
        const key = ev.key || ev.keyCode;
        if ((ev.ctrlKey || ev.metaKey) && ev.shiftKey && (key === 'd' || key === 'D' || key === 68)) {
            ev.preventDefault();
            toggleOverlay();
        }
    });
})();
