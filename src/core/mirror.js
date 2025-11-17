
export function mirrorAroundAxisXLocal(group, cx){
    const base = group.getAttribute('transform') || '';
    group.setAttribute('transform', `${base} translate(${cx} 0) scale(-1 1) translate(${-cx} 0)`);
}
export function unmirrorTextsIn(root){
    const texts = root.querySelectorAll('text');
    texts.forEach(txt=>{
        const prev = txt.dataset.origTransform;
        if(prev!==undefined) txt.setAttribute('transform', prev);
        else txt.dataset.origTransform = txt.getAttribute('transform') || '';
        const bb = txt.getBBox(); if(!isFinite(bb.width) || bb.width===0) return;
        const cx = bb.x + bb.width/2;
        const extra = `translate(${cx} 0) scale(-1 1) translate(${-cx} 0)`;
        const base = txt.dataset.origTransform || '';
        txt.setAttribute('transform', base ? (base+' '+extra) : extra);
        txt.dataset.unmirrored = '1';
    });
}
