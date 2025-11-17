
export function readInlineMeta(){
    const el=document.getElementById('meta');
    if(!el) return null;
    try{ const j=JSON.parse(el.textContent.trim()||''); if(j && (j.bottoms||j.tops)) return j; }catch{}
    return null;
}
export async function loadMeta(){
    const inline=readInlineMeta();
    if(inline) { DBG('[TEMPDBG][META] using inline'); return inline; }
    try{ const res=await fetch('assets/meta.json',{cache:'no-store'}); if(!res.ok) throw new Error('HTTP '+res.status); const j=await res.json(); DBG('[TEMPDBG][META] loaded', j); return j; }
    catch(e){ DBG('[TEMPDBG][META] fetch failed', e); return {bottoms:[],tops:[]}; }
}
export function indexMeta(meta){
    const bottomsById=new Map(), topsById=new Map();
    meta.bottoms.forEach(b=>bottomsById.set(b.id,b)); meta.tops.forEach(t=>topsById.set(t.id,t));
    const topToBottoms=new Map(); meta.tops.forEach(t=>topToBottoms.set(t.id,new Set()));
    meta.bottoms.forEach(b=>(b.tops||[]).forEach(tid=>topToBottoms.get(tid)?.add(b.id)));
    const allowedTopByBottom=new Map(); meta.bottoms.forEach(b=>allowedTopByBottom.set(b.id,new Set(b.tops||[])));
    DBG('[TEMPDBG][META] indexed', {bottoms:meta.bottoms.length,tops:meta.tops.length});
    return { bottomsById, topsById, topToBottoms, allowedTopByBottom };
}
