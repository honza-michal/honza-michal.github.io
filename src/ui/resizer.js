
// === MIGRATION: unify sidebar width storage (remove legacy 'ui.sidebarW' which held vw) ===
(function() {
    try {
        const legacy = localStorage.getItem('ui.sidebarW');
        if (legacy) {
            if (/^\d+(?:\.\d+)?vw$/.test(legacy)) {
                const num = parseFloat(legacy);
                const px = Math.round(window.innerWidth * (num / 100));
                localStorage.setItem('sidebar.width.px', String(px));
            } else if (/^\d+(?:\.\d+)?px$/.test(legacy)) {
            const num = parseFloat(legacy);
            localStorage.setItem('sidebar.width.px', String(num));
        }
        localStorage.removeItem('ui.sidebarW');
    }
} catch (e) { /* no-op */ }
})();
// === END MIGRATION ===

// helper to ensure a numeric value is suffixed with px
function __ensurePx(v){
    if (v == null) return v;
    if (typeof v === 'number') return String(Math.round(v)) + 'px';
    if (/^\s*\d+(?:\.\d+)?\s*$/.test(String(v))) return String(Math.round(parseFloat(v))) + 'px';
    return String(v);
}


export function wireResizer(){
    const root=document.documentElement, r=document.getElementById('resizer'), s=document.querySelector('.sidebar');
    if(!r||!s) return; const saved=localStorage.getItem('sidebar.width.px'); if(saved) root.style.setProperty('--sidebar-w', __ensurePx(saved));
    let drag=false,x=0,w=0;
    const down=e=>{drag=true;x=e.clientX;w=s.getBoundingClientRect().width;document.body.style.cursor='col-resize';document.addEventListener('mousemove',move);document.addEventListener('mouseup',up);};
    const move=e=>{if(!drag) return; const dx=e.clientX-x; let nw=Math.max(200,Math.min(window.innerWidth*0.6,w+dx)); root.style.setProperty('--sidebar-w', __ensurePx(nw+'px'));};
    const up=()=>{drag=false;document.body.style.cursor='';document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',up);
        const val=getComputedStyle(root).getPropertyValue('--sidebar-w').trim(); localStorage.setItem('sidebar.width.px', val); DBG('[TEMPDBG][resizer] saved', val);};
        r.addEventListener('mousedown',down);
    }
