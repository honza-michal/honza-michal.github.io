// src/core/textFix.js
function composeTransform(oldT, extraT) {
    if (!oldT || oldT === 'none') return extraT;
    return `${oldT} ${extraT}`;
}
export function unmirrorTextsIn(groupEl) {
    if (!groupEl) return;
    const texts = groupEl.querySelectorAll('text');
    texts.forEach(txt => {
        if (txt.dataset.unmirrored === '1') return;
        let bb; try { bb = txt.getBBox(); } catch(e) { bb = {x:0,y:0,width:0,height:0}; }
        const cx = bb.x + bb.width/2;
        const t = `translate(${cx},0) scale(-1,1) translate(${-cx},0)`;
        const prev = txt.getAttribute('transform');
        txt.setAttribute('transform', composeTransform(prev, t));
        txt.dataset.unmirrored = '1';
    });
}
