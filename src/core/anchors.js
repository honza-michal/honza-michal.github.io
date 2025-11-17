
export function anchorPos(hostSvg,scopeGroup,id){
    const el=scopeGroup?.querySelector('#'+CSS.escape(id));
    if(!el){ DBG('[TEMPDBG][anchorPos] missing anchor', {id}); return {x:0,y:0}; }
    let px=0,py=0,explicit=false;
    if(el.hasAttribute('cx')||el.hasAttribute('cy')){px=parseFloat(el.getAttribute('cx')||'0');py=parseFloat(el.getAttribute('cy')||'0');explicit=true;}
    else if(el.hasAttribute('x')||el.hasAttribute('y')){px=parseFloat(el.getAttribute('x')||'0');py=parseFloat(el.getAttribute('y')||'0');explicit=true;}
    if(!explicit&&el.getBBox){const bb=el.getBBox();px=bb.x+bb.width/2;py=bb.y+bb.height/2;}
    let M=null;
    if(typeof el.getTransformToElement==='function')M=el.getTransformToElement(hostSvg);
    else {const S_el=el.getScreenCTM?.();const S_host=hostSvg.getScreenCTM?.();M=(S_el&&S_host)?S_host.inverse().multiply(S_el):el.getCTM?.();}
    const pt=hostSvg.createSVGPoint();pt.x=px;pt.y=py;const p2=M?pt.matrixTransform(M):{x:px,y:py};
    DBG('[TEMPDBG][anchorPos]', {id,px,py,out:p2});
    return {x:p2.x,y:p2.y};
}
export function unmirrorTextsIn(root){
    const texts=root.querySelectorAll('text'); let n=0;
    texts.forEach(txt=>{
        const prev=txt.dataset.origTransform;
        if(prev!==undefined) txt.setAttribute('transform',prev);
        else txt.dataset.origTransform=txt.getAttribute('transform')||'';
        const bb=txt.getBBox(); if(!bb||bb.width===0) return;
        const cx=bb.x+bb.width/2;
        const extra=`translate(${cx} 0) scale(-1 1) translate(${-cx} 0)`;
        const base=txt.dataset.origTransform||''; txt.setAttribute('transform', base?(base+' '+extra):extra);
        txt.dataset.unmirrored='1'; n++;
    });
    DBG('[TEMPDBG][unmirrorTextsIn] processed texts:', n);
}



export function bboxExcluding(root, excludeSelector=''){
    if(!root) return null;
    const svg = root.ownerSVGElement || root.closest('svg') || root;
    const exSel = String(excludeSelector||'').trim();
    const isExcluded = (el) => exSel && typeof el.matches==='function' ? el.matches(exSel) : false;
    let xmin=Infinity, ymin=Infinity, xmax=-Infinity, ymax=-Infinity, any=false;

    const toRoot = (pt, M_el, M_root) => {
        // pt in element-local -> screen -> root-local
        const screenPt = pt.matrixTransform(M_el);
        const invRoot = M_root ? M_root.inverse() : null;
        return invRoot ? screenPt.matrixTransform(invRoot) : screenPt;
    };

    const M_root = (svg && root && root.getScreenCTM) ? root.getScreenCTM() : null;

    const elements = Array.from(root.querySelectorAll('*')).filter(el=>!isExcluded(el));
    for(const el of elements){
        if(typeof el.getBBox !== 'function') continue;
        let bb;
        try { bb = el.getBBox(); } catch { bb = null; }
        if(!bb || !isFinite(bb.width) || bb.width===0 || !isFinite(bb.height)) continue;

        const M_el = (svg && el.getScreenCTM) ? el.getScreenCTM() : null;
        if(!M_el || !M_root) continue;

        const p = svg.createSVGPoint();
        const corners = [
        [bb.x, bb.y],
        [bb.x + bb.width, bb.y],
        [bb.x, bb.y + bb.height],
        [bb.x + bb.width, bb.y + bb.height],
    ].map(([x,y]) => { p.x=x; p.y=y; return toRoot(p, M_el, M_root); });

    const xs = corners.map(c=>c.x), ys = corners.map(c=>c.y);
    const cxmin = Math.min(...xs), cymin = Math.min(...ys);
    const cxmax = Math.max(...xs), cymax = Math.max(...ys);
    if(!Number.isFinite(cxmin) || !Number.isFinite(cymin) || !Number.isFinite(cxmax) || !Number.isFinite(cymax)) continue;

    if(cxmin < xmin) xmin = cxmin;
    if(cymin < ymin) ymin = cymin;
    if(cxmax > xmax) xmax = cxmax;
    if(cymax > ymax) ymax = cymax;
    any = true;
}
if(!any) return { x:0, y:0, width:0, height:0 };
return { x:xmin, y:ymin, width:Math.max(0, xmax-xmin), height:Math.max(0, ymax-ymin) };
}


export function moveAnchorOutOfMirror(gScale, gAnchorSc, anchorId='anchorTop'){
    if(!gScale || !gAnchorSc) return;
    const el = gScale.querySelector('#'+CSS.escape(anchorId));
    if(!el) return;
    try {
        gAnchorSc.appendChild(el); // same scale applied on gAnchorSc, so visuals stay identical
    } catch {}
}
