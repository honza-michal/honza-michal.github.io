
export function centeredZoom(set){
    const s=document.getElementById('scale'), v=document.getElementById('scaleVal');
    s?.addEventListener('input',e=>{
        const n=+e.target.value||100;
        if(v) v.textContent=String(n);
        DBG('[TEMPDBG][zoom] slider ->', n);
        set(n);
    });
}
export function themeToggle(){
    const root=document.documentElement, sw=document.getElementById('themeSwitch');
    const saved=localStorage.getItem('ui.theme')||'light';
    root.setAttribute('data-theme',saved);
    if(sw) sw.checked=(saved==='light');
    sw?.addEventListener('change',()=>{
        const mode=sw.checked?'light':'dark';
        root.setAttribute('data-theme',mode);
        localStorage.setItem('ui.theme',mode);
        DBG('[TEMPDBG][theme] mode', mode);
    });
}


// [TEMP] theme sync (no injection)
(function(){
    try{ DBG('[TEMP] theme sync start'); }catch{}
    const cb = document.getElementById('theme');
    const root = document.documentElement;
    const current = (root.getAttribute('data-theme')||'light').toLowerCase();
    if (cb) {
        cb.checked = (current === 'light');
        cb.addEventListener('change', (e)=>{
            const on = !!e.target.checked;
            try{ DBG('[TEMP] theme toggled ->', on); }catch{}
            root.setAttribute('data-theme', on ? 'light' : 'dark');
        });
        try{ DBG('[TEMP] theme wired', {checked: cb.checked}); }catch{}
    } else {
    try{ DBG('[TEMP] #theme checkbox not found'); }catch{}
}
})();
