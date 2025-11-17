
import { splitVB, pxPerUnit } from '../utils/svg.js';
import { clamp } from '../utils/math.js';
import { anchorPos, moveAnchorOutOfMirror, bboxExcluding } from '../core/anchors.js';
import { mirrorAroundAxisXLocal, unmirrorTextsIn } from '../core/mirror.js';
import { normalizeSvgTexts } from '../core/svgText.js';
import { getAnchorIds, getConfig } from '../io/config.js';
import { robustDim, ensureHostViewBoxFromBBoxExcluding, normalizeCfg } from '../core/normalize.js';
import { state } from '../core/state.js';;

export function assignRoles(){
    const A = { svg: state.srcL,  vb: state.vbL,  ppu: state.pxPerUnitL };
    const B = { svg: state.srcTop, vb: state.vbTop, ppu: state.pxPerUnitTop };
    state.roles.base = A; state.roles.overlay = B;
}

export function buildHostSVG(scale = state.scale, forExport=false){
    const ids = getAnchorIds();
    const defExclude = `#${ids.bottom}, #${ids.top}`;
    assignRoles();
    const BASE = state.roles.base, TOP = state.roles.overlay;
    const [minX, minY, w, h] = BASE.vb;
    const ns = 'http://www.w3.org/2000/svg';
    const host = document.createElementNS(ns,'svg');
    host.setAttribute('xmlns', ns);
    host.setAttribute('viewBox', `${minX} ${minY} ${w} ${h}`);
    if(!forExport){
        host.style.width  = (w*scale)+'px';
        host.style.height = (h*scale)+'px';
        host.classList.add('stage-svg');
    } else {
        host.setAttribute('width',  w*scale);
        host.setAttribute('height', h*scale);
    }
const gBase   = document.createElementNS(ns,'g'); gBase.id='gBase';
const gBaseNorm = document.createElementNS(ns,'g'); gBaseNorm.id='gBaseNorm'; gBase.appendChild(gBaseNorm);
cloneChildren(BASE.svg, gBaseNorm);

const gTop  = document.createElementNS(ns,'g'); gTop.id='gTop';
const gTopNorm = document.createElementNS(ns,'g'); gTopNorm.id='gTopNorm';
const gAnchor = document.createElementNS(ns,'g'); gAnchor.id='gTopAnchor';
const gAnchorSc = document.createElementNS(ns,'g'); gAnchorSc.id='gTopAnchorScale';
const gMirror = document.createElementNS(ns,'g'); gMirror.id='gTopMirror';
const gScale = document.createElementNS(ns,'g'); gScale.id='gTopScale';

const kUnits = (TOP.ppu || 1) / (BASE.ppu || 1);
gScale.setAttribute('transform', `scale(${kUnits})`);
gAnchorSc.setAttribute('transform', `scale(${kUnits})`);
cloneChildren(TOP.svg, gScale);
gAnchor.appendChild(gAnchorSc);
gTopNorm.appendChild(gAnchor);
gMirror.appendChild(gScale);
gTopNorm.appendChild(gMirror);
gTop.appendChild(gTopNorm);

host.appendChild(gBase); host.appendChild(gTop);
document.body.appendChild(host);

if(normalizeCfg.enable){
    const mode = (normalizeCfg.mode==='width')?'width':'height';
    const exclude = normalizeCfg.excludeSelector || defExclude;
    const baseVBdim = (mode==='width') ? BASE.vb[2] : BASE.vb[3];
    const topVBdimRaw = (mode==='width') ? TOP.vb[2] : TOP.vb[3];
    const topVBdim = topVBdimRaw * kUnits;

    const baseDim = robustDim(gBaseNorm, mode, exclude, baseVBdim);
    const topDim  = robustDim(gScale,    mode, exclude, topVBdim);

    let sBase = (baseDim>0) ? (normalizeCfg.bottomTarget / baseDim) : 1;
    let sTop  = (topDim >0) ? (normalizeCfg.bottomTarget*normalizeCfg.topToBottomRatio / topDim) : 1;
    sBase = clamp(sBase, 1e-6, 1e6);
    sTop  = clamp(sTop,  1e-6, 1e6);
    gBaseNorm.setAttribute('transform', `scale(${sBase})`);
    gTopNorm.setAttribute('transform',  `scale(${sTop})`);

    // Normalize text per-part so final apparent size stays constant across normalization scales
    try{
        const cfgAll = getConfig();
        const textCfg = (cfgAll && cfgAll.text) || {};
        if (textCfg.normalize && textCfg.fontSize){
            const target = textCfg.fontSize;
            const baseSize = target / sBase;
            const topSize  = target / (sTop * kUnits);
            normalizeSvgTexts(gBaseNorm, { ...textCfg, fontSize: baseSize });
            normalizeSvgTexts(gScale,    { ...textCfg, fontSize: topSize });
        }
    } catch(e){
        try{ DBG && DBG('[TEMPDBG][text] per-part normalize error', e); }catch(_e){}
    }
}
const LID = ids.bottom, TID = ids.top;
const aL = anchorPos(host, gBase,  LID);
const aT = anchorPos(host, gScale, TID);
const dx = aL.x - aT.x, dy = aL.y - aT.y;
gTop.setAttribute('transform', `translate(${dx},${dy})`);

moveAnchorOutOfMirror(gScale, gAnchorSc, TID);

if(state.mirrorTop){
    const bb = bboxExcluding(gMirror, `${defExclude}, [id="${ids.top}"]`);
    const cxLocal = (bb && isFinite(bb.width) && bb.width>0) ? (bb.x + bb.width/2) : 0;
    mirrorAroundAxisXLocal(gMirror, cxLocal);
    unmirrorTextsIn(gMirror);
}

// auto clip top layout
try{
    const side = state.clipSide || 'bottom';
    const rawAmt = state.clipAmount || 0;
    const exclude = normalizeCfg.excludeSelector || defExclude;
    const bbTop = bboxExcluding(gTop, exclude);
    if(bbTop && isFinite(bbTop.x) && isFinite(bbTop.y) &&
       isFinite(bbTop.width) && isFinite(bbTop.height) &&
       bbTop.width>0 && bbTop.height>0){

        const ns2 = ns;
        let defs = host.querySelector('defs');
        if(!defs){
            defs = document.createElementNS(ns2,'defs');
            host.insertBefore(defs, host.firstChild);
        }

        const clip = document.createElementNS(ns2,'clipPath');
        clip.id = 'clipTop';
        clip.setAttribute('clipPathUnits','userSpaceOnUse');

        const rect = document.createElementNS(ns2,'rect');

        const autoAmt = (side==='top' || side==='bottom') ? (bbTop.height/2) : (bbTop.width/2);
        let amt;
        if(rawAmt && rawAmt>0){
            const dim = (side==='top' || side==='bottom') ? bbTop.height : bbTop.width;
            // if 0<rawAmt<=1 treat as percentage of dimension, otherwise as absolute units
            amt = (rawAmt>0 && rawAmt<=1) ? (rawAmt*dim) : rawAmt;
        } else {
            amt = autoAmt;
        }

        if(side==='bottom'){
            rect.setAttribute('x', bbTop.x);
            rect.setAttribute('width', bbTop.width);
            rect.setAttribute('y', bbTop.y);
            rect.setAttribute('height', Math.max(0, bbTop.height - amt));
        } else if(side==='top'){
            rect.setAttribute('x', bbTop.x);
            rect.setAttribute('width', bbTop.width);
            rect.setAttribute('y', bbTop.y + amt);
            rect.setAttribute('height', Math.max(0, bbTop.height - amt));
        } else if(side==='left'){
            rect.setAttribute('y', bbTop.y);
            rect.setAttribute('height', bbTop.height);
            rect.setAttribute('x', bbTop.x + amt);
            rect.setAttribute('width', Math.max(0, bbTop.width - amt));
        } else if(side==='right'){
            rect.setAttribute('y', bbTop.y);
            rect.setAttribute('height', bbTop.height);
            rect.setAttribute('x', bbTop.x);
            rect.setAttribute('width', Math.max(0, bbTop.width - amt));
        } else {
            // unknown side => no clip
        }

        clip.appendChild(rect);
        defs.appendChild(clip);
        gTop.setAttribute('clip-path','url(#clipTop)');
    }
} catch(e){
    try{ DBG && DBG('[TEMPDBG][clipTop][error]', e); }catch(_e){}
}

ensureHostViewBoxFromBBoxExcluding(host, gBase, normalizeCfg.excludeSelector || defExclude);
if(!forExport){
    const vb = (host.getAttribute('viewBox')||'').trim().split(/\s+/).map(Number);
    if(vb.length===4 && vb.every(Number.isFinite)){ const [, , vw, vh] = vb; host.style.width=(vw*scale)+'px'; host.style.height=(vh*scale)+'px'; }
}

    return host;
}

export function buildCombinedSVGForExport(){
    return buildHostSVG(state.scale, true);
}

function cloneChildren(src, dst){
    dst.replaceChildren();
    for(const n of Array.from(src.childNodes)){
        if(n.nodeType===1) dst.appendChild(n.cloneNode(true));
    }
}
