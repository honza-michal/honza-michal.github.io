// src/features/geometry.js
import { SvgPart } from '../core/svgPart.js';
import { unmirrorTextsIn } from '../core/textFix.js';

export function mirrorPartHorizontally(part, enabled, opts = {}) {
    if (!(part instanceof SvgPart)) throw new Error('mirrorPartHorizontally: part must be SvgPart');
    part.mirror = enabled;
    part.gMirror.setAttribute('transform', '');
    if (!enabled) { part.updateFromDOMAfterChange(); return; }
    const bb = part.gMirror.getBBox();
    const cx = bb.x + bb.width/2;
    part.mirrorPivot = cx;
    part.gMirror.setAttribute('transform', `translate(${cx},0) scale(-1,1) translate(${-cx},0)`);
    unmirrorTextsIn(part.gMirror);
    part.updateFromDOMAfterChange();
}

export function alignTopNextToBottom(top, bottom, gap = 0) {
    const bbb = bottom.gMirror.getBBox();
    const tbb = top.gMirror.getBBox();
    const tx = (bbb.x + bbb.width + gap) - tbb.x;
    const ty = (bbb.y) - tbb.y;
    top.el.setAttribute('transform', `translate(${tx}, ${ty})`);
    top.updateFromDOMAfterChange();
}
