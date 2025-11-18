export function renderEmptyState(msg='Nenalezen layout, který by odpovídal vybraným filtrům. Chcete individuální projekt? Ozvěte se nám!'){
    const stage=document.getElementById('stage');
    if(!stage) return;
    stage.innerHTML='';
    const wrap=document.createElement('div');
    wrap.className='empty-message';
    wrap.textContent=msg || 'Nenalezen layout, který by odpovídal vybraným filtrům. Chcete individuální projekt? Ozvěte se nám!';
    stage.appendChild(wrap);
    DBG('[TEMPDBG][empty] renderEmptyState', msg);
}
export function updateUIForValidity(valid){
    ['scale','cyclePrev','cycleNext','exportSVG','exportPNG'].forEach(id=>{
        const el=document.getElementById(id); if(el) el.disabled=!valid;
    });
    DBG('[TEMPDBG][ui] updateUIForValidity', valid);
}
