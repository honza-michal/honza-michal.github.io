// src/core/svgText.js
// Utilities for working with <text> in SVGs (normalization, later room schedule extraction, etc.)

// Normalize text appearance based on config.text (fontSize, fontFamily, lineHeight).
export function normalizeSvgTexts(svgRoot, cfg) {
    if (!svgRoot || !cfg) return;

    try {
        const size = cfg.fontSize;
        const family = cfg.fontFamily;
        const lineHeight = cfg.lineHeight;

        // If nothing is specified, there is nothing to normalize.
        if (!size && !family && !lineHeight) return;

        const txtNodes = svgRoot.querySelectorAll('text');
        txtNodes.forEach(node => {
            // Collect existing style rules except the ones we are going to control.
            const styleAttr = node.getAttribute('style') || '';
            const styleParts = styleAttr
                .split(';')
                .map(s => s.trim())
                .filter(s =>
                    s &&
                    !/^font-size\s*:/i.test(s) &&
                    !/^font-family\s*:/i.test(s) &&
                    !/^line-height\s*:/i.test(s)
                );

            // Hard-set a uniform font-size (via attribute) if requested.
            if (size) {
                node.setAttribute('font-size', String(size));
            }

            // Apply a consistent font family if requested.
            if (family) {
                node.setAttribute('font-family', family);
            }

            // "line-height" in style works for most renderers for multi-line <text>/<tspan>.
            if (lineHeight) {
                styleParts.push(`line-height: ${lineHeight}`);
            }

            if (styleParts.length) {
                node.setAttribute('style', styleParts.join('; '));
            } else {
                node.removeAttribute('style');
            }
        });

        try {
            DBG('[TEMPDBG][text] normalizeSvgTexts', {
                count: txtNodes.length,
                fontSize: size,
                fontFamily: family,
                lineHeight
            });
        } catch {}

    } catch (e) {
        try { DBG('[TEMPDBG][text] normalizeSvgTexts error', e); } catch {}
    }
}

// Stub for legacy text-joining (intentionally disabled).
// Kept only so existing imports won't break; currently unused.
export function mergeAdjacentTextElements() {}
