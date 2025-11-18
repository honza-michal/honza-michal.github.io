
export function wireScrollSync(){
    const m=document.getElementById('scrollMain'), h=document.getElementById('hMirror'), i=document.getElementById('hMirrorInner'), st=document.getElementById('stage');
    if(!m||!h||!i||!st) return; let raf=0;
    function sync(){ cancelAnimationFrame(raf); raf=requestAnimationFrame(()=>{ const w=Math.max(m.scrollWidth, st.scrollWidth, m.clientWidth); i.style.width=w+'px'; h.scrollLeft=m.scrollLeft; DBG('[TEMPDBG][scrollSync] sync width', w); }); }
    const onM=()=>{ h.scrollLeft=m.scrollLeft; }, onH=()=>{ m.scrollLeft=h.scrollLeft; };
    m.addEventListener('scroll',onM,{passive:true}); h.addEventListener('scroll',onH,{passive:true});
    new ResizeObserver(sync).observe(m); new ResizeObserver(sync).observe(st); sync();
}
