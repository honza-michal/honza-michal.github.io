// src/io/config.js — central runtime configuration (anchors, layers, visibility matrix, debug)

const DEFAULT_CONFIG = {
    debug: false,
    anchors: {
        bottom: "anchorL",
        top: "anchorTop"
    },
    wardrobeLayers: {
        bottomLeft: "L-L",
        bottomRight: "L-R",
        topLeft: "T-L",
        topRight: "T-R"
    },
        text: {
        normalize: false,
        fontSize: null,
        fontFamily: null,
        lineHeight: null
    },
    visibilityPolicy: {
        defaults: { theme: "enabled" },
        launch: {
            theme: "enabled", autozoom: "hidden",
            project: "hidden",
            combos: "hidden", cycle: "hidden", mirror: "hidden",
            storage: "hidden", anchors: "hidden", scale: "hidden",
            exportSvg: "hidden", exportPng: "hidden", filters: "hidden"
        },
        afterIndex: {
            theme: "enabled", autozoom: "enabled",
            project: "hidden",
            combos: "enabled", cycle: "disabled", mirror: "disabled",
            storage: "disabled", anchors: "disabled", scale: "disabled",
            exportSvg: "disabled", exportPng: "disabled", filters: "disabled"
        },
        validSelection: {
            theme: "enabled", autozoom: "enabled",
            project: "hidden",
            combos: "enabled", cycle: "enabled", mirror: "enabled",
            storage: "enabled", anchors: "enabled", scale: "enabled",
            exportSvg: "enabled", exportPng: "enabled", filters: "enabled"
        }
    }
};


let CONFIG;
try {
    CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
} catch (e) {
    CONFIG = DEFAULT_CONFIG;
}

let LOADED = false;
let LOADING = null;

function mergeVisibilityPolicy(base, next) {
    if (!next) return base;
    const out = {
        defaults: { ...(base.defaults || {}) },
        launch: { ...(base.launch || {}) },
        afterIndex: { ...(base.afterIndex || {}) },
        validSelection: { ...(base.validSelection || {}) }
    };
    if (next.defaults) Object.assign(out.defaults, next.defaults);
    if (next.launch) Object.assign(out.launch, next.launch);
    if (next.afterIndex) Object.assign(out.afterIndex, next.afterIndex);
    if (next.validSelection) Object.assign(out.validSelection, next.validSelection);
    return out;
}

/**
 * Load external config from assets/config.json.
 * Safe: on any failure we keep DEFAULT_CONFIG.
 */
export async function loadConfig() {
    if (LOADED) return CONFIG;
    if (LOADING) return LOADING;

    LOADING = (async () => {
        try {
            const res = await fetch("assets/config.json", { cache: "no-store" });
            if (res && res.ok) {
                const json = await res.json();

                const next = {
                    ...CONFIG,
                    ...json,
                    anchors: {
                        ...(CONFIG.anchors || {}),
                        ...(json.anchors || {})
                    },
                    wardrobeLayers: {
                        ...(CONFIG.wardrobeLayers || {}),
                        ...(json.wardrobeLayers || {})
                    },
                    text: {
                        ...(CONFIG.text || {}),
                        ...(json.text || {})
                    },
                    visibilityPolicy: mergeVisibilityPolicy(
                        CONFIG.visibilityPolicy || {},
                        json.visibilityPolicy || {}
                    )
                };

                CONFIG = next;
            }
        } catch (err) {
            try { console.warn("[config] Failed to load assets/config.json, using defaults", err); } catch (_) {}
        }

        // Apply debug flag globally if available
        try {
            if (typeof window !== "undefined" && typeof CONFIG.debug === "boolean") {
                window.DEBUG = !!CONFIG.debug;
                // Auto-show debug overlay when config.debug === true
                if (window.DEBUG) {
                    try {
                        if (typeof window.DBG_SHOW_OVERLAY === 'function') {
                            window.DBG_SHOW_OVERLAY();
                        } else if (typeof window.DBG === 'function' && typeof window.DBG.showOverlay === 'function') {
                            window.DBG.showOverlay();
                        }
                    } catch (e) {
                        try { console.warn("[config] Failed to auto-show debug overlay", e); } catch (_) {}
                    }
                }
            }
        } catch (_) {}

        LOADED = true;
        LOADING = null;
        return CONFIG;
    })();

    return LOADING;
}

/**
 * Get the current config snapshot (may be defaults if loadConfig() has not completed yet).
 */
export function getConfig() {
    return CONFIG;
}

/**
 * Small helpers for other modules
 */
export function getAnchorIds() {
    const cfg = CONFIG || DEFAULT_CONFIG;
    const a = cfg.anchors || {};
    return {
        bottom: a.bottom || "anchorL",
        top: a.top || "anchorTop"
    };
}

export function getWardrobeLayerIds() {
    const cfg = CONFIG || DEFAULT_CONFIG;
    const w = cfg.wardrobeLayers || {};
    return {
        bottomLeft:  w.bottomLeft  || "L-L",
        bottomRight: w.bottomRight || "L-R",
        topLeft:     w.topLeft     || "T-L",
        topRight:    w.topRight    || "T-R"
    };
}
