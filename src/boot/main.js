// === Global DEBUG toggle & helper ===
if (typeof window !== 'undefined') {
    if (typeof window.DEBUG !== 'boolean') window.DEBUG = false; // set true in console to enable logs

    // Only define DBG if it doesn't already exist (e.g. overlay)
    if (typeof window.DBG !== 'function') {
        window.DBG = (...args) => {
            if (window.DEBUG) {
                try { console.debug(...args); } catch (e) {}
            }
        };
    }

    // Only define DBGW if it doesn't already exist
    if (typeof window.DBGW !== 'function') {
        window.DBGW = (...args) => {
            if (window.DEBUG) {
                try { console.warn(...args); } catch (e) {}
            }
        };
    }
}
// === End DEBUG block ===

// helper to ensure a numeric value is suffixed with px
function __ensurePx(v){
    if (v == null) return v;
    if (typeof v === 'number') return String(Math.round(v)) + 'px';
    if (/^\s*\d+(?:\.\d+)?\s*$/.test(String(v))) return String(Math.round(parseFloat(v))) + 'px';
    return String(v);
}


// === Injected: DEFAULT THEME LIGHT (very early) ===

// === Global DEBUG toggle & helper ===
if (typeof window !== 'undefined') {
    if (typeof window.DEBUG !== 'boolean') window.DEBUG = false; // set true in console to enable logs
    window.DBG = (...args) => { if (window.DEBUG) try { console.debug(...args); } catch(e) {} };
    // Optional warn wrapper: currently not used separately; use DBG for TEMPDBG
    window.DBGW = (...args) => { if (window.DEBUG) try { console.warn(...args); } catch(e) {} };
    // Debug helpers are safe no-ops when DEBUG=false
    window.__dbgPath = function(node){
        if (!window.DEBUG) return '';
        const bits=[];
        while(node && node.nodeType===1){
            let s=node.nodeName.toLowerCase();
            if(node.id) s+='#'+node.id;
            if(node.classList && node.classList.length) s+='.'+[...node.classList].join('.');
            bits.unshift(s);
            node=node.parentElement;
        }
        return bits.join(' > ');
    };
    window.__dbgStyles = function(el){
        if (!window.DEBUG || !el) return null;
        const s=getComputedStyle(el);
        return {
            display: s.display, visibility: s.visibility, pointerEvents: s.pointerEvents,
            opacity: s.opacity, position: s.position, zIndex: s.zIndex,
            width: s.width, height: s.height
        };
    };
}

(() => {
    try {
        if (!document.documentElement.dataset.theme) {
            document.documentElement.dataset.theme = 'light';
            console.debug('[theme-default] set <html data-theme="light">');
        }
    } catch (e) { /* ignore */ }
})();
// === /Injected ===

try{DBG('[TEMP][mod] main.js loaded');}catch{}

import { $ } from '../utils/dom.js';
import { state } from '../core/state.js';
import { buildHostSVG } from '../features/combine.js';
import { loadMeta, indexMeta } from '../io/meta.js';
// import { fileIndex, indexWholeProjectFolder } from '../io/projectIndex.js';
import { loadSVGFromFile, loadSVGFromUrl, preloadSvgs } from '../io/fileload.js';
import { filtry, normalizeUIFilters, partMatchesFilters } from '../features/filters.js';
import { renderEmptyState, updateUIForValidity } from '../features/emptySafe.js';
import { applyWardrobeLayers } from '../features/wardrobe.js';
import { applyBathroomLayer } from '../features/bathroom.js';
import { applyCorridorConnection } from '../features/corridorConnection.js';
import { centeredZoom, themeToggle } from '../ui/controls.js';
import { wireResizer } from '../ui/resizer.js';
import { wireScrollSync } from '../ui/scrollSync.js';
import { exportSVG, exportPNG } from '../io/export.js';
import { cycle } from '../features/cycler.js';
import { Ready } from '../boot/ready.js';
import { loadConfig, getConfig, getAnchorIds } from '../io/config.js';



// === Sidebar width anti-flicker helpers ===
function applySavedSidebarWidthNow(){
    try{
        const w = parseFloat(localStorage.getItem('sidebar.width.px'));
        if (isFinite(w) && w > 0){
            document.documentElement.style.setProperty('--sidebar-w', Math.round(w) + 'px');
        }
    }catch(e){}
}
function lockSidebarWidthInline(){
    try{
        const sb = document.querySelector('.sidebar');
        if (!sb) return;
        const w = sb.getBoundingClientRect().width || parseFloat(getComputedStyle(sb).width) || 0;
        if (w > 0){
            document.documentElement.style.setProperty('--sidebar-w', Math.round(w) + 'px');
            sb.style.width = Math.round(w) + 'px';
            document.documentElement.classList.add('sidebar-locked');
        }
    }catch(e){}
}
function unlockSidebarWidthInline(){
    try{
        const sb = document.querySelector('.sidebar');
        if (!sb) return;
        sb.style.removeProperty('width');
        document.documentElement.classList.remove('sidebar-locked');
        applySavedSidebarWidthNow();
    }catch(e){}
}
// === /helpers ===
let META = { bottoms:[], tops:[] };
let IDX  = null;
window.DEBUG = window.DEBUG || false; // removed shadowing const DBG





async function __initToolManagers(){
    if (window.Toolkit && !window.TOOL_STAGE){
        let cfg = null;
        try {
            cfg = await loadConfig();
        } catch (e) {
            try { DBG('[TEMPDBG][config] loadConfig failed in __initToolManagers', e); } catch(_) {}
        }

        window.TOOL_STAGE = Toolkit.create({
            "sidebar": {
                "project": "#dzProject",
                "combos": "#pickBottom",
                "cycle": "#cycleGroup",
                "mirror": "#mirrorTop",
                "storage": "#wardrobeSwitch",
                "anchors": "#showAnchors",
                "scale": "#scale",
                "exportSvg": "#exportSVG",
                "exportPng": "#exportPNG"
            },
            "topbar": {
                "autozoom": "#autoFit",
                "theme": "#themeSwitch"
            }
        });

        if (cfg && cfg.visibilityPolicy){
            try {
                window.TOOL_STAGE.setPolicy(cfg.visibilityPolicy);
            } catch (e) {
                try { DBG('[TEMPDBG][matrix] setPolicy failed', e); } catch(_) {}
            }
        }

        window.TOOL_STAGE.beforeProject();
    }
}
if (window.Toolkit) { __initToolManagers(); }
else { window.addEventListener('load', __initToolManagers, { once:true }); }

// ---- Visibility guard ----
function __setProjectReady(ready){ try{DBG('[TEMP] project-ready ->', ready); }catch{} document.body.classList.toggle('project-ready', !!ready); }
function setReadyUI(ready){ try{ DBG('[TEMPDBG][visGuard] setReadyUI (no-op)', {ready}); }catch{};
    DBG('[TEMPDBG][visGuard] setReadyUI', {ready, count: document.querySelectorAll('[data-vis-guard]').length}); __setProjectReady(ready);
}
setReadyUI(false);

// ---- Project counts ----
function updateProjectCounts(){
    const pc = document.getElementById('projectCounts');
    if (!pc || !META) return;
    const txt = `Načteno: spodní ${META.bottoms.length}, horní ${META.tops.length}`;
    pc.textContent = txt;
    DBG('[TEMPDBG][project] counts', txt);
}

// ---- Mount & render ----
function mountHost(host){
    const stage = $('#stage'); stage.innerHTML=''; stage.appendChild(host);
    // Wardrobe layers (left/right storage etc.)
    applyWardrobeLayers({ mirrorTop: state.mirrorTop });
    // Bathroom compatibility layer based on bottom.kompatibilni_koupelna
    applyBathroomLayer();
    // Corridor connection (bottom/top spojeni_chodeb)
    applyCorridorConnection({ mirrorTop: state.mirrorTop });
    DBG('[TEMPDBG][render] mounted host size(px)', host.getBoundingClientRect());
}
function applyAnchorsVisibility(host){
    try{
        const cb = document.getElementById('showAnchors');
        const show = !cb || cb.checked;
        if (!host) return;
        const ids = getAnchorIds();
        const selector = `#${ids.bottom}, #${ids.top}, .anchor, [data-role="anchor"]`;
        host.querySelectorAll(selector).forEach(el=>{
            if (show){
                el.style.visibility = '';
            } else {
                el.style.visibility = 'hidden';
            }
        });
        DBG('[TEMPDBG][anchors] applyAnchorsVisibility', {show});
    }catch(e){ try{ DBG('[TEMPDBG][anchors] error', e); }catch{} }
}
function render(){
    if (!state.hasValidSelection){ $('#stage').innerHTML=''; DBG('[TEMPDBG][render] skip: no valid selection'); return; }
    if (!state.srcL || !state.srcTop){ DBG('[TEMPDBG][render] skip: missing SVGs', {hasL:!!state.srcL, hasTop:!!state.srcTop}); return; }
    const host = buildHostSVG(state.scale, false);
    let vbAttr = host.getAttribute('viewBox');
    let w=0,h=0; if(vbAttr){ const p=vbAttr.split(/\s+/).map(Number); if(p.length===4){ w=p[2]; h=p[3]; }}
    if(!(w>0&&h>0)){ const vb=state.vbL||[0,0,1000,1000]; w=vb[2]; h=vb[3]; }
    host.style.width = __ensurePx(w*state.scale);
    host.style.height = __ensurePx(h*state.scale);
    mountHost(host);
    applyAnchorsVisibility(host);
    try {
        if (state.hasValidSelection) {
            // Ensure controls are enabled even on programmatic first render
            updateUIForValidity(true);
            if (window.TOOL_STAGE && typeof window.TOOL_STAGE.validSelection === 'function') {
                window.TOOL_STAGE.validSelection();
            }
        }
    } catch(e) {}
}

// Debug helpers – expose state & render for console
window.__state  = state;
window.__render = render;

function computeAutoScale(padding=20){
    const host=document.querySelector('#stage > svg'); const main=$('#scrollMain');
    if(!host||!main){ DBG('[TEMPDBG][autofit] missing host/main'); return 1; }
    const bb=host.getBBox();
    const viewW=Math.max(1, main.clientWidth - padding*2);
    const viewH=Math.max(1, main.clientHeight - padding*2);
    const s = Math.min(viewW/Math.max(1,bb.width), viewH/Math.max(1,bb.height));
    DBG('[TEMPDBG][autofit] bbox, view, scale', {bb,viewW,viewH,s});
    return Math.max(0.05, Math.min(10, s));
}
function autoFitToViewport(padding=20){
    const prev=state.scale; state.scale=1; render();
    if (window.TOOL_STAGE) window.TOOL_STAGE.validSelection();
    state.scale=computeAutoScale(padding); render();
    if (window.TOOL_STAGE) window.TOOL_STAGE.validSelection();
    const host=document.querySelector('#stage > svg'); const main=$('#scrollMain'); if(!host||!main) return;
    const rect=host.getBoundingClientRect(); main.scrollLeft=(rect.width-main.clientWidth)/2; main.scrollTop=(rect.height-main.clientHeight)/2;
        state.zoomPercent = 100;
    const v=100; const sl=document.getElementById('scale'); const sv=document.getElementById('scaleVal');
    if(sl) sl.value=String(v); if(sv) sv.textContent=String(v);
    DBG('[TEMPDBG][autofit] applied', {scale:state.scale, rect, scrollLeft:main.scrollLeft, scrollTop:main.scrollTop});
}

// ---- Filters & selects ----
function optionsHTML(items){
    return items.map(it=>{
        const tops = Array.isArray(it.tops) && it.tops.length ? ` data-tops="${it.tops.join(',')}"` : '';
        return `<option value="${it.id}"${tops}>${it.name}</option>`;
    }).join('');
}


let __hadActiveFilters = false;
let __preFilterSelection = null;

function applyFiltersAndFillSelection(){
    const pickBottom=$('#pickBottom'), pickTop=$('#pickTop'); 
    if(!pickBottom||!pickTop) return;

    const prevB = pickBottom.value;
    const prevT = pickTop.value;

    const active = normalizeUIFilters(filtry);
    const hasActiveFilters = !!(active && Object.keys(active).length);

    // detect transition: no filters -> some filters
    if (hasActiveFilters && !__hadActiveFilters) {
        __preFilterSelection = {
            bottom: prevB || null,
            top: prevT || null
        };
    }
    const wasFilteredBefore = __hadActiveFilters;
    __hadActiveFilters = hasActiveFilters;
    const isJustReset = !hasActiveFilters && wasFilteredBefore;

    DBG('[TEMPDBG][filters] active', active);

    const filteredBottoms = META.bottoms.filter(b=>partMatchesFilters(b, active));
    if(!filteredBottoms.length){
        state.hasValidSelection=false; 
        updateUIForValidity(false);
        pickBottom.innerHTML=''; 
        pickTop.innerHTML=''; 
        pickTop.disabled=true; 
        renderEmptyState();
        DBG('[TEMPDBG][filters] no bottoms'); 
        return;
    }

    // repopulate bottoms
    pickBottom.innerHTML = optionsHTML(filteredBottoms);

    if (isJustReset && __preFilterSelection && __preFilterSelection.bottom &&
        [...pickBottom.options].some(o => o.value === __preFilterSelection.bottom)) {
        pickBottom.value = __preFilterSelection.bottom;
    } else if (prevB && [...pickBottom.options].some(o => o.value === prevB)) {
        // keep previous selection when possible
        pickBottom.value = prevB;
    } else {
        // fallback to first item
        pickBottom.selectedIndex = 0;
    }

    const selB = pickBottom.value;
    const allowedTopIds = new Set([...(IDX.allowedTopByBottom.get(selB) || new Set())]);
    const filteredTops = META.tops.filter(t => allowedTopIds.has(t.id) && partMatchesFilters(t, active));

    // repopulate tops
    pickTop.innerHTML = optionsHTML(filteredTops);

    if (isJustReset && __preFilterSelection && __preFilterSelection.top &&
        [...pickTop.options].some(o => o.value === __preFilterSelection.top)) {
        pickTop.value = __preFilterSelection.top;
    } else if (prevT && [...pickTop.options].some(o => o.value === prevT)) {
        pickTop.value = prevT;
    } else if (pickTop.options.length) {
        pickTop.selectedIndex = 0;
    }

    pickTop.disabled = pickTop.options.length===0;
    state.hasValidSelection = !!(pickBottom.options.length && pickTop.options.length);
    updateUIForValidity(state.hasValidSelection);
    DBG('[TEMPDBG][filters] lists', {bottoms:pickBottom.options.length, tops:pickTop.options.length, selB, selT:pickTop.value});
    onSelection();
}
async function onSelection(){
    const pickBottom=$('#pickBottom'), pickTop=$('#pickTop');
    const hasBottom=!!(pickBottom?.value), hasTop=!!(pickTop?.value);
    state.hasValidSelection = hasBottom && hasTop;
    updateUIForValidity(state.hasValidSelection);
    if (!state.hasValidSelection){
        renderEmptyState();
        return;
    }
    const bottom = META.bottoms.find(b => b.id === pickBottom.value);
    const top    = META.tops.find(t => t.id === pickTop.value);
    if (!bottom || !top){
        DBG('[TEMPDBG][select] missing meta for selection', { b: pickBottom.value, t: pickTop.value });
        return;
    }
    if (!bottom.tops.includes(top.id)){
        const first = bottom.tops[0];
        if (first) pickTop.value = first; else return;
    }
    const bottomUrl = bottom.file;
    const topUrl    = top.file;
    DBG('[TEMPDBG][select] urls', { bottomUrl, topUrl });
    if (bottomUrl) await loadSVGFromUrl(bottomUrl, 'L');
    if (topUrl)    await loadSVGFromUrl(topUrl, 'Top');
    render();
    if (window.TOOL_STAGE) window.TOOL_STAGE.validSelection();
    if (!onSelection._fittedOnce){
        onSelection._fittedOnce = true;
        try{
            DBG('[TEMPDBG][autofit] first selection, calling centeredZoom');
            autoFitToViewport(16);
        }catch(e){}
    }
    setReadyUI(true);
}


// ===== TEMPDBG: Dropzone diagnostics =====
function __dbgPath(node){
    const bits=[];
    while(node && node.nodeType===1){
        let s=node.nodeName.toLowerCase();
        if(node.id) s+='#'+node.id;
        if(node.classList && node.classList.length) s+='.'+[...node.classList].join('.');
        bits.unshift(s);
        node=node.parentElement;
    }
    return bits.join(' > ');
}
function __dbgStyles(el){
    if(!el) return null;
    const s=getComputedStyle(el);
    return {
        display: s.display, visibility: s.visibility, pointerEvents: s.pointerEvents,
        opacity: s.opacity, position: s.position, zIndex: s.zIndex,
        width: s.width, height: s.height
    };
}
(function TEMPDBG_globalClickTap(){
    if (window.__TEMPDBG_click_tap) return; window.__TEMPDBG_click_tap = true;
    const logEv = (ev) => {
        try{
            const path = ev.composedPath ? ev.composedPath() : [ev.target];
            DBG('[TEMPDBG][doc]', ev.type, 'target=', __dbgPath(ev.target), 'top=', __dbgPath(path[0]||ev.target));
        }catch{}
    };
    ['pointerdown','mousedown','mouseup','click'].forEach(t=>{
        document.addEventListener(t, logEv, {capture:true});
    });
})();

// ---- Dropzones ----
function wireDropzones(){


    // Guard & retry without re-declaring variables used later
    if (window.__DZ_WIRED) { DBG('[TEMPDBG][dz] wireDropzones(): already wired, skip'); return; }
    const ready = !!(document.getElementById('dzProject') && document.getElementById('dzBottom') && document.getElementById('dzTop') && document.getElementById('fileL') && document.getElementById('fileTop'));
    if (!ready) {
        DBG('[TEMPDBG][dz] elements missing — retry in 100ms');
        setTimeout(wireDropzones, 100);
        return;
    }
    window.__DZ_WIRED = true;
    function setMsg(id, txt){ const el=document.getElementById(id); if(el) el.textContent=txt; }
    function prevent(e){ e.preventDefault(); e.stopPropagation(); }
    function addDZ(el){ ['dragenter','dragover'].forEach(ev=>el?.addEventListener(ev,e=>{prevent(e); el.classList.add('dragover');})); ['dragleave','drop'].forEach(ev=>el?.addEventListener(ev,e=>{prevent(e); el.classList.remove('dragover');})); }
    const dzProject=$('#dzProject'), dzBottom=$('#dzBottom'), dzTop=$('#dzTop'); const fileL=$('#fileL'), fileTop=$('#fileTop'); const pickRoot=$('#pickRoot');
    addDZ(dzProject); addDZ(dzBottom); addDZ(dzTop);
    dzProject?.addEventListener('click', ()=>{}); // label opens picker (prevents double prompt)
    dzBottom?.addEventListener('click',(e)=>{
        DBG('[TEMPDBG][dz] dzBottom CLICK', {target: __dbgPath(e.target)});
        try{
            e.preventDefault(); e.stopPropagation();
            const s=__dbgStyles(fileL); DBG('[TEMPDBG][dz] fileL pre', {exists:!!fileL, s, hasShow: !!(fileL && fileL.showPicker)});
            if (fileL && typeof fileL.showPicker==='function'){ fileL.showPicker(); DBG('[TEMPDBG][dz] fileL showPicker() called'); }
            else { fileL?.click(); DBG('[TEMPDBG][dz] fileL click() called'); }
        }catch(err){ DBG('[TEMPDBG][dz] dzBottom handler error', err); }
    });
    dzTop?.addEventListener('click',(e)=>{
        DBG('[TEMPDBG][dz] dzTop CLICK', {target: __dbgPath(e.target)});
        try{
            e.preventDefault(); e.stopPropagation();
            const s=__dbgStyles(fileTop); DBG('[TEMPDBG][dz] fileTop pre', {exists:!!fileTop, s, hasShow: !!(fileTop && fileTop.showPicker)});
            if (fileTop && typeof fileTop.showPicker==='function'){ fileTop.showPicker(); DBG('[TEMPDBG][dz] fileTop showPicker() called'); }
            else { fileTop?.click(); DBG('[TEMPDBG][dz] fileTop click() called'); }
        }catch(err){ DBG('[TEMPDBG][dz] dzTop handler error', err); }
    });
    dzBottom ?.addEventListener('drop', e=>{ const f=e.dataTransfer?.files?.[0]; if(f){ fileL.files=e.dataTransfer.files; fileL.dispatchEvent(new Event('change',{bubbles:true})); }});
    dzTop    ?.addEventListener('drop', e=>{ const f=e.dataTransfer?.files?.[0]; if(f){ fileTop.files=e.dataTransfer.files; fileTop.dispatchEvent(new Event('change',{bubbles:true})); }});
    fileL?.addEventListener('change', async e=>{ const f=e.target.files?.[0]; if(!f) return; await loadSVGFromFile(f,'L'); setMsg('dzBottomMsg', 'Načteno: '+(f.name||'')); render();
        if (window.TOOL_STAGE) window.TOOL_STAGE.validSelection(); DBG('[TEMPDBG][drop] bottom loaded', f.name); });
    fileTop?.addEventListener('change', async e=>{ const f=e.target.files?.[0]; if(!f) return; await loadSVGFromFile(f,'Top'); setMsg('dzTopMsg', 'Načteno: '+(f.name||'')); render();
        if (window.TOOL_STAGE) window.TOOL_STAGE.validSelection(); DBG('[TEMPDBG][drop] top loaded', f.name); });
            // pickRoot change disabled — folder upload no longer required
}


// ---- Initial selection after indexing ----
function chooseInitialPairAndRender(){
    const pickBottom=$('#pickBottom'), pickTop=$('#pickTop');
    const bottoms=[...pickBottom.options].map(o=>o.value); const tops=[...pickTop.options].map(o=>o.value);
    let pickedB=null, pickedT=null;
    outer: for(const b of bottoms){
        const compat=META.bottoms.find(x=>x.id===b)?.tops||[];
        for(const t of compat){
            if (tops.includes(t)){
                pickedB=b; pickedT=t; break outer;
            }
        }
    }
    if(!pickedB) pickedB = bottoms[0] || null;
    if(!pickedT){
        const compat=META.bottoms.find(x=>x.id===pickedB)?.tops||[];
        pickedT=compat.find(t=>tops.includes(t)) || tops[0] || null;
    }
    DBG('[TEMPDBG][select] initial pick', {pickedB,pickedT});
    if (pickedB) pickBottom.value=pickedB; if (pickedT) pickTop.value=pickedT;
    onSelection._fittedOnce = false;
    onSelection();
}

// ---- Filters wiring with rAF debounce ----
function wireFilters(){
    const sels = '#fEntrance input, #fGarageOrient input, #fGarageEntrance input, #fRooms input';
    document.querySelectorAll(sels).forEach(el=>{
        el.addEventListener('change', ()=>readFiltersAndApply());
        el.addEventListener('input',  ()=>readFiltersAndApply());
    });
	$('#resetFiltry')?.addEventListener('click', ()=>{
		// 1) Zrušit všechny checkBoxy ve fRooms
		document.querySelectorAll('#fRooms input[type=checkbox]').forEach(c=>c.checked=false);

		// 2) Vrátiť rádia na "any"
		['fEntrance','fGarageOrient','fGarageEntrance'].forEach(name=>{
			const group=[...document.querySelectorAll(`input[type="radio"][name="${name}"]`)];
			const any=group.find(r=>(r.value===''||r.value==='any'))||group[0];
			if(any) any.checked=true;
		});

		// 3) Resetovat samotnou garáž (Dedikovaná garáž) + spustit její change handler
		const chkGarage = document.getElementById('fGarage');
		if (chkGarage) {
			chkGarage.checked = false;
			// trigger change, aby wireDedicatedGarage() schoval labely + segmenty
			chkGarage.dispatchEvent(new Event('change', { bubbles: true }));
		}

		// 4) Vyresetovat vnitřní strukturu filtry{}
		Object.keys(filtry).forEach(k=>{
			filtry[k] = (typeof filtry[k] === 'boolean') ? false : '';
		});

		DBG('[TEMPDBG][filters] RESET');
		readFiltersAndApply();
	});
}
function readFiltersAndApply(){
    filtry.orientaceVstupu=(document.querySelector('#fEntrance input:checked')?.value||'');
    filtry.orientaceGaraze=(document.querySelector('#fGarageOrient input:checked')?.value||'');
    filtry.vjezdGaraze=(document.querySelector('#fGarageEntrance input:checked')?.value||'');
    filtry.samostatneWC=!!document.getElementById('fToilet')?.checked;
    filtry.samostatnaPradelna=!!document.getElementById('fLaundry')?.checked;
    filtry.spiz=!!document.getElementById('fFood')?.checked;
    filtry.samostatnaGaraz=!!document.getElementById('fGarage')?.checked;
    if (readFiltersAndApply._raf) cancelAnimationFrame(readFiltersAndApply._raf);
    readFiltersAndApply._raf = requestAnimationFrame(()=>{ applyFiltersAndFillSelection(); });
}

// ---- Basics ----
function wireBasics(){
    themeToggle(); centeredZoom(percent=>{ 
        const prevUI = (state.zoomPercent == null ? 100 : state.zoomPercent);
        const prevScale = (state.scale == null ? 1 : state.scale);
        const factor = percent / prevUI;
        state.scale = prevScale * (factor || 1);
        state.zoomPercent = percent;
        render();
        if (window.TOOL_STAGE) window.TOOL_STAGE.validSelection(); });
    wireResizer(); wireScrollSync();
    document.getElementById('exportSVG')?.addEventListener('click', exportSVG);
    document.getElementById('exportPNG')?.addEventListener('click', exportPNG);
    document.getElementById('autoFit') ?.addEventListener('click', ()=>{ DBG('[TEMPDBG][autofit] button'); onSelection._fittedOnce=false; autoFitToViewport(16); });
    document.getElementById('mirrorTop')?.addEventListener('change', e=>{ state.mirrorTop=!!e.target.checked; DBG('[TEMPDBG][mirror] set', state.mirrorTop); render();
        if (window.TOOL_STAGE) window.TOOL_STAGE.validSelection(); });
    document.querySelectorAll('input[name="wardrobeSide"]').forEach(r=>r.addEventListener('change', e=>{
        const v = e.target?.value;
        try { if (typeof window !== 'undefined') window.__wardrobeUserSide = v; } catch(_e){}
        DBG('[TEMPDBG][wardrobe] side change', v);
        render();
        if (window.TOOL_STAGE) window.TOOL_STAGE.validSelection();
    }));
    document.getElementById('wardrobeManual')?.addEventListener('change', e=>{
        const checked = !!e.target?.checked;
        let prev = false;
        try {
            if (typeof window !== 'undefined' && typeof window.__wardrobeManual === 'boolean') {
                prev = window.__wardrobeManual;
            }
            if (typeof window !== 'undefined') {
                window.__wardrobeManual = checked;
                window.__wardrobeManualJustEnabled = checked && !prev;
                if (!checked) {
                    window.__wardrobeUserSide = null;
                }
            }
        } catch (_e) {}
        DBG('[TEMPDBG][wardrobe] manual toggle', checked);
        render();
        if (window.TOOL_STAGE) window.TOOL_STAGE.validSelection();
    });
    document.getElementById('cyclePrev')?.addEventListener('click', ()=>cycle(-1));
    document.getElementById('cycleNext')?.addEventListener('click', ()=>cycle(+1));
    // Keyboard shortcuts for cycling combinations via ArrowLeft / ArrowRight
    window.addEventListener('keydown', (e)=>{
        try{
            if (e.defaultPrevented) return;
            const active = document.activeElement;
            const tag = active && active.tagName ? active.tagName.toUpperCase() : '';
            // Don't hijack arrows when typing or working in form fields
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                cycle(-1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                cycle(+1);
            }
        }catch(_e){}
    }, { passive:false });

    document.getElementById('showAnchors')?.addEventListener('change', ()=>{ DBG('[TEMPDBG][anchors] toggle'); render();
        if (window.TOOL_STAGE) window.TOOL_STAGE.validSelection(); });
}

// ---- Boot ----
async function boot(){
    window.__state = state;   // <-- ADD THIS LINE							

    META = await loadMeta();
    IDX  = indexMeta(META);
    if (typeof window !== 'undefined') { window.META = META; window.IDX = IDX; }
    $('#pickBottom').innerHTML = META.bottoms.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
    $('#pickTop').innerHTML    = META.tops.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
    try{ updateProjectCounts(); }catch(e){}
    try{
        const urls = [
            ...META.bottoms.map(b => b.file),
            ...META.tops.map(t => t.file),
        ];
        preloadSvgs(urls);
    }catch(e){
        DBG('[TEMPDBG][boot] preloadSvgs error', e);
    }
    wireFilters();
    $('#pickBottom').addEventListener('change', ()=>applyFiltersAndFillSelection());
    $('#pickTop').addEventListener('change', ()=>onSelection());
    // Enable mouse-wheel cycling over bottom/top selects when hovered
    (function(){
        function wheelSelect(id){
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('wheel', (e)=>{
                try{
                    if (e.deltaY === 0) return;
                    e.preventDefault();
                    const opts = el.options;
                    if (!opts || !opts.length) return;
                    let idx = el.selectedIndex;
                    if (idx < 0) idx = 0;
                    idx += (e.deltaY > 0 ? 1 : -1);
                    if (idx < 0) idx = 0;
                    if (idx >= opts.length) idx = opts.length - 1;
                    if (idx !== el.selectedIndex) {
                        el.selectedIndex = idx;
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }catch(_e){}
            }, { passive:false });
        }
        wheelSelect('pickBottom');
        wheelSelect('pickTop');
    })();

    wireDropzones();
    wireBasics();
    applyFiltersAndFillSelection();
    updateUIForValidity(false);
    try{ chooseInitialPairAndRender(); }catch(e){}
    DBG('[TEMPDBG][boot] done', META);
}

// [TEMP] robust folder wiring removed — auto-boot without project folder

(function(){
    function start(){
        try{ DBG('[TEMPDBG][boot] DOMContentLoaded — starting boot()'); }catch(e){}
        try{ applySavedSidebarWidthNow(); }catch(e){}
        try{
            boot().catch(err => { try{ DBG('[TEMPDBG][boot] error', err); }catch(e2){} });
        }catch(err){
            try{ DBG('[TEMPDBG][boot] boot() threw synchronously', err); }catch(e3){}
        }
    }
    if (document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', start, {once:true});
    } else {
        start();
    }
})();


// === Injected: THEME DOM-READY WIRING (sync to light by default) ===
(() => {
    if (window.__THEME_DOM_READY2__) return;
    window.__THEME_DOM_READY2__ = true;

    function run() {
        const el = document.querySelector('#theme, #themeSwitch, [data-theme-toggle]');
        if (!el) {
            console.warn('[theme] toggle not found at DOM ready');
            return;
        }
        // Sync checkbox to current html[data-theme] (defaulted to light)
        const current = document.documentElement.dataset.theme || 'light';
        el.checked = current === 'light';

        const apply = () => {
            document.documentElement.dataset.theme = el.checked ? 'light' : 'dark';
            console.debug('[theme] applied', document.documentElement.dataset.theme);
        };
        el.addEventListener('change', apply, { passive: true });
        apply(); // apply once immediately
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
        run();
    }
})();
// === /Injected ===



// === Injected: SIDEBAR RESIZER (uses --sidebar-w css var) ===
(() => {
    if (window.__SIDEBAR_RESIZER_CSSVAR__) return;
    window.__SIDEBAR_RESIZER_CSSVAR__ = true;

    function $(s){ return document.querySelector(s); }
    function first(...sels){ for (const s of sels){ const el = $(s); if (el) return el; } return null; }

    function setSidebarWidthPx(px){
        const n = Math.max(180, Math.min(720, Math.round(px)));
        document.documentElement.style.setProperty('--sidebar-w', __ensurePx(n));
        try { localStorage.setItem('sidebar.width.px', String(n)); } catch(e){}
        return n;
    }
    function getSavedWidthPx(){
        try { const v = parseFloat(localStorage.getItem('sidebar.width.px')); if (isFinite(v)&&v>0) return v; } catch(e){}
        return null;
    }
    function getCurrentWidthPx(sidebar){
        // Prefer computed var; fallback to element rect
        const cs = getComputedStyle(document.documentElement);
        const varStr = cs.getPropertyValue('--sidebar-w').trim();
        const fromVar = parseFloat(varStr.replace('px',''));
        if (isFinite(fromVar) && fromVar>0) return fromVar;
        return Math.round(sidebar.getBoundingClientRect().width);
    }

    function wire(){
        const sidebar = first('#sidebar', '.sidebar', '[data-sidebar]');
        const handle  = first('#resizer', '#sidebarResizer', '.sidebar-resizer', '[data-resizer="sidebar"]', '.resizer', '[data-resizer]')
            || (sidebar && sidebar.parentElement && sidebar.parentElement.querySelector('.resizer, [data-resizer]'));

        // Apply any saved width to the CSS variable (not the element) at startup
        const saved = getSavedWidthPx();
        if (saved) setSidebarWidthPx(saved);

        if (!sidebar || !handle || handle.__WIRED_RESIZER_CSSVAR__) return;

        let dragging = false, startX = 0, startW = getCurrentWidthPx(sidebar);
        const minW = 180, maxW = 720;

        function onDown(ev){
            const e = ev.touches ? ev.touches[0] : ev;
            startX = e.clientX;
            startW = getCurrentWidthPx(sidebar);
            dragging = true;
            document.body.classList.add('is-resizing-sidebar');
            ev.preventDefault();
            ev.stopPropagation();

            window.addEventListener('mousemove', onMove, { capture:true });
            window.addEventListener('mouseup', onUp, { once:true, capture:true });
            window.addEventListener('touchmove', onMove, { passive:false, capture:true });
            window.addEventListener('touchend', onUp, { once:true, capture:true });
        }

        function onMove(ev){
            if (!dragging) return;
            const e = ev.touches ? ev.touches[0] : ev;
            const dx = e.clientX - startX;
            const w = Math.max(minW, Math.min(maxW, startW + dx));
            setSidebarWidthPx(w);
            ev.preventDefault();
            ev.stopPropagation();
        }

        function onUp(ev){
            dragging = false;
            document.body.classList.remove('is-resizing-sidebar');
            window.removeEventListener('mousemove', onMove, { capture:true });
            window.removeEventListener('touchmove', onMove, { capture:true });
            const finalW = getCurrentWidthPx(sidebar);
            setSidebarWidthPx(finalW);
            if (ev) ev.stopPropagation();
        }

        handle.__WIRED_RESIZER_CSSVAR__ = true;
        handle.style.cursor = 'col-resize';
        handle.style.touchAction = 'none';
        handle.addEventListener('mousedown', onDown, { capture:true });
        handle.addEventListener('touchstart', onDown, { passive:false, capture:true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wire, { once:true });
    } else {
        wire();
    }
})();
// === /Injected ===



// === Injected: Authoritative sidebar width apply (before-index + project-ready) ===
(() => {
    if (window.__SIDEBAR_AUTH_APPLY__) return; window.__SIDEBAR_AUTH_APPLY__ = true;

    function readCurrentSidebarWidthPx(){
        try{
            const v = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-w').trim();
            const n = parseFloat(v.replace('px',''));
            if (isFinite(n) && n > 0) return Math.round(n);
        }catch(e){}
        return null;
    }
    function readSavedSidebarWidthPx(){
        try{
            const s = parseFloat(localStorage.getItem('sidebar.width.px'));
            if (isFinite(s) && s > 0) return Math.round(s);
        }catch(e){}
        return null;
    }
    function applySavedSidebarWidthAuthoritative(reason){
        const saved = readSavedSidebarWidthPx();
        if (saved){
            document.documentElement.style.setProperty('--sidebar-w', __ensurePx(saved));
            console.debug('[sidebar][apply-saved]', reason, saved);
            return saved;
        }
        return null;
    }

    function wireFolderInputs(){
        const inputs = document.querySelectorAll('#pickRoot, input[webkitdirectory], [data-folder-input]');
        inputs.forEach(inp => {
            if (inp.__SIDEBAR_APPLY_WIRED__) return; inp.__SIDEBAR_APPLY_WIRED__ = true;
            inp.addEventListener('change', () => {
                const cur = readCurrentSidebarWidthPx();
                if (cur) try { localStorage.setItem('sidebar.width.px', String(cur)); } catch(e){}
                applySavedSidebarWidthAuthoritative('before-index');
            }, { capture:true });
        });
    }

    function observeProjectReady(){
        const body = document.body;
        const mo = new MutationObserver(() => {
            if (body.classList.contains('project-ready')){
                applySavedSidebarWidthAuthoritative('project-ready');
                mo.disconnect();
            }
        });
        mo.observe(body, { attributes:true, attributeFilter:['class'] });
    }

    function installDefaultGuards(){
        const hasExisting = !!readCurrentSidebarWidthPx() || !!readSavedSidebarWidthPx();
        if (hasExisting){
            const cur = readCurrentSidebarWidthPx() || readSavedSidebarWidthPx();
            if (cur) document.documentElement.style.setProperty('--sidebar-w', __ensurePx(cur));
        }
    }

    function onReady(){
        installDefaultGuards();
        wireFolderInputs();
        observeProjectReady();
    }

    if (document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', onReady, { once:true });
    } else {
        onReady();
    }
})();
// === /Injected ===



// === Injected: Sidebar width lock during indexing (prevents reset to 20vw) ===
(() => {
    if (window.__SIDEBAR_WIDTH_LOCK__) return; window.__SIDEBAR_WIDTH_LOCK__ = true;

    function getSidebarPx(){
        try {
            const v = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-w').trim();
            const n = parseFloat(v.replace('px',''));
            return (isFinite(n) && n > 0) ? Math.round(n) : null;
        } catch (e) { return null; }
    }
    function ensureLock(px){
        let s = document.getElementById('__sidebar_lock');
        if (!s) {
            s = document.createElement('style');
            s.id = '__sidebar_lock';
            document.head.appendChild(s);
        }
        s.textContent = `:root{ --sidebar-w: ${px}px !important; }`;
    }
    function releaseLock(px){
        const s = document.getElementById('__sidebar_lock');
        if (s) s.remove();
        if (px && isFinite(px)) {
            document.documentElement.style.setProperty('--sidebar-w', __ensurePx(Math.round(px)));
        }
    }
    function save(px){
        try { localStorage.setItem('sidebar.width.px', String(Math.round(px))); } catch(e){}
    }
    function onFolderChange(){
        const cur = getSidebarPx();
        if (cur) {
            save(cur);
            ensureLock(cur); // prevent any default reset during boot/indexing
            // Also set inline var so any code reading var sees the same value
            document.documentElement.style.setProperty('--sidebar-w', __ensurePx(cur));
            console.debug('[sidebar][lock] start', cur);
        }
    }
    function watchReady(){
        const mo = new MutationObserver(()=>{
            if (document.body.classList.contains('project-ready')){
                const cur = getSidebarPx() || parseFloat(localStorage.getItem('sidebar.width.px')) || null;
                releaseLock(cur);
                console.debug('[sidebar][lock] end', cur);
                mo.disconnect();
            }
        });
        mo.observe(document.body, { attributes:true, attributeFilter:['class'] });
    }

    function wire(){
        // folder inputs
        document.querySelectorAll('#pickRoot, input[webkitdirectory], [data-folder-input]')
            .forEach(inp => {
                if (inp.__SIDEBAR_LOCK_WIRED__) return;
                inp.__SIDEBAR_LOCK_WIRED__ = true;
                inp.addEventListener('change', onFolderChange, { capture:true });
            });
        watchReady();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wire, { once:true });
    } else {
        wire();
    }
})();
// === /Injected ===



// === Post-reset: select first options & notify ===
(function(){
    try{
        const btn = document.getElementById('resetFiltry');
        if (!btn) return;
        btn.addEventListener('click', function(){
            // Defer until lists are repopulated by existing reset logic
            requestAnimationFrame(()=>{
                const selBottom = document.getElementById('pickBottom');
                const selTop = document.getElementById('pickTop');
                let changed = false;
                if (selBottom && selBottom.options && selBottom.options.length){
                    if (selBottom.selectedIndex !== 0) { selBottom.selectedIndex = 0; changed = true; }
                    selBottom.dispatchEvent(new Event('change', { bubbles: true }));
                }
                if (selTop && selTop.options && selTop.options.length){
                    if (selTop.selectedIndex !== 0) { selTop.selectedIndex = 0; changed = true; }
                    selTop.dispatchEvent(new Event('change', { bubbles: true }));
                }
                // Optional: re-run selection side-effects
                if (typeof onSelection === 'function'){
                    onSelection._fittedOnce = false;
                    onSelection();
                }
            });
        }, { capture:false });
    }catch(e){}
})();
// === /Post-reset ===

// Ensure dropzones wiring after DOM is fully parsed
window.addEventListener('DOMContentLoaded', () => {
    try {
        if (!window.__DZ_WIRED) {
            DBG('[TEMPDBG][dz] DOMContentLoaded → wireDropzones()');
            wireDropzones();
        }
    } catch (e) { DBG('[TEMPDBG][dz] DOMContentLoaded wiring failed', e); }
});


// Dedicated garage — show extra orientation/entrance controls only when enabled
(function wireDedicatedGarage(){
    try {
        const chk = document.getElementById('fGarage');              // checkbox "Dedikovaná garáž"
        const garageE = document.getElementById('fGarageEntrance');  // entrance control group
        const garageO = document.getElementById('fGarageOrient');    // orientation control group

        if (!chk || !garageE || !garageO) return;

        const labelOrient = garageO.previousElementSibling;   // "garáž orientace"
        const labelEntrance = garageE.previousElementSibling; // "vjezd do garáže"

        const update = () => {
            const on = !!chk.checked;
            if (on) {
                if (labelOrient)  labelOrient.style.display  = '';
                if (labelEntrance) labelEntrance.style.display = '';

                garageE.style.display = '';
                garageO.style.display = '';
                garageE.style.opacity = '1';
                garageO.style.opacity = '1';
                garageE.style.pointerEvents = 'auto';
                garageO.style.pointerEvents = 'auto';
            } else {
                if (labelOrient)  labelOrient.style.display  = 'none';
                if (labelEntrance) labelEntrance.style.display = 'none';

                garageE.style.display = 'none';
                garageO.style.display = 'none';
                garageE.style.opacity = '0.3';
                garageO.style.opacity = '0.3';
                garageE.style.pointerEvents = 'none';
                garageO.style.pointerEvents = 'none';
            }
        };

        chk.addEventListener('change', update);
        // initial state
        update();
    } catch(e) {
        try { DBG('[TEMPDBG][garage] wiring error', e); } catch(_) {}
    }
})();


document.addEventListener('DOMContentLoaded', () => {
    // Create global tooltip layer once
    const layer = document.createElement('div');
    layer.id = 'helpTooltipLayer';
    document.body.appendChild(layer);

    let activeTip = null;

    function showTip(el) {
        const text = el.dataset.tip || '';
        if (!text) return;
        activeTip = el;
        layer.textContent = text;
        layer.style.display = 'block';
    }

    function hideTip() {
        activeTip = null;
        layer.style.display = 'none';
    }

    function positionLayer(x, y) {
        const margin = 12;
        layer.style.left = x + margin + 'px';
        layer.style.top  = y + margin + 'px';

        // Optional: keep inside viewport a bit
        const rect = layer.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let left = rect.left;
        let top  = rect.top;

        if (rect.right > vw - margin) {
            left = vw - rect.width - margin;
        }
        if (rect.bottom > vh - margin) {
            top = vh - rect.height - margin;
        }

        layer.style.left = left + 'px';
        layer.style.top  = top + 'px';
    }

    document.addEventListener('mouseover', (e) => {
        const tip = e.target.closest('.help-tip[data-tip]');
        if (!tip) {
            hideTip();
            return;
        }
        showTip(tip);
    });

    document.addEventListener('mousemove', (e) => {
        if (!activeTip) return;
        positionLayer(e.clientX, e.clientY);
    });

    document.addEventListener('mouseout', (e) => {
        if (e.relatedTarget && e.relatedTarget.closest('.help-tip')) return;
        hideTip();
    });
});
