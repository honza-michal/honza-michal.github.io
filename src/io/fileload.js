
import { splitVB, pxPerUnit } from '../utils/svg.js';
import { state } from '../core/state.js';
export function readSVG(file){
    return new Promise(res=>{
        const r=new FileReader();
        r.onload=()=>{
            const text=String(r.result);
            const doc=new DOMParser().parseFromString(text,'image/svg+xml');
            const svg=doc.documentElement.tagName.toLowerCase()==='svg'?doc.documentElement:doc.querySelector('svg');
DBG('[TEMPDBG][file] readSVG', {name:file?.name, hasSVG:!!svg});
            res(svg);
        };
        r.readAsText(file);
    });
}
export async function loadSVGFromFile(file, which){
    const svg=await readSVG(file); if(!svg) return;
    if(which==='L'){
        state.srcL=svg; state.vbL=splitVB(svg.getAttribute('viewBox')); state.ppuL=pxPerUnit(svg);
        DBG('[TEMPDBG][file] loaded L', {vb:state.vbL, ppu:state.ppuL});
    }else{
    state.srcTop=svg; state.vbTop=splitVB(svg.getAttribute('viewBox')); state.ppuTop=pxPerUnit(svg);
    DBG('[TEMPDBG][file] loaded Top', {vb:state.vbTop, ppu:state.ppuTop});
}
}

// === URL-based SVG loading with preload cache ===
const SVG_CACHE = new Map();

async function fetchAndParseSvg(url){
    if (!url) return null;
    if (SVG_CACHE.has(url)) return SVG_CACHE.get(url);
    try{
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok){
            DBG('[TEMPDBG][file] fetchAndParseSvg failed', { url, status: res.status });
            return null;
        }
        const text = await res.text();
        const doc  = new DOMParser().parseFromString(text, 'image/svg+xml');
        const svg  = doc.documentElement.tagName.toLowerCase()==='svg'
        ? doc.documentElement
        : doc.querySelector('svg');
DBG('[TEMPDBG][file] fetchAndParseSvg', { url, hasSVG: !!svg });
        if (svg) SVG_CACHE.set(url, svg);
        return svg;
    }catch(e){
    DBG('[TEMPDBG][file] fetchAndParseSvg error', { url, error: e });
    return null;
}
}

export async function preloadSvgs(urls){
    try{
        const unique = Array.from(new Set((urls||[]).filter(Boolean)));
        DBG('[TEMPDBG][file] preloadSvgs start', { count: unique.length });
        await Promise.all(unique.map(u => fetchAndParseSvg(u)));
        DBG('[TEMPDBG][file] preloadSvgs done');
    }catch(e){
    DBG('[TEMPDBG][file] preloadSvgs error', e);
}
}

export async function loadSVGFromUrl(url, which){
    const svg = await fetchAndParseSvg(url);
    if (!svg) return;
    if(which==='L'){
        state.srcL=svg; state.vbL=splitVB(svg.getAttribute('viewBox')); state.ppuL=pxPerUnit(svg);
        DBG('[TEMPDBG][file] loaded L (url)', {url, vb:state.vbL, ppu:state.ppuL});
    }else{
    state.srcTop=svg; state.vbTop=splitVB(svg.getAttribute('viewBox')); state.ppuTop=pxPerUnit(svg);
    DBG('[TEMPDBG][file] loaded Top (url)', {url, vb:state.vbTop, ppu:state.ppuTop});
}
}

