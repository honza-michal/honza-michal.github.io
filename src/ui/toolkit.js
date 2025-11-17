try{DBG('[TEMP][mod] toolkit.js loaded');}catch{}
// src/ui/toolkit.js — CLEAN 3×3 MATRIX (launch / afterIndex / validSelection)
// Levels: 'hidden' | 'disabled' | 'enabled'
(function(){
    const LEVELS = new Set(['hidden','disabled','enabled']);
    const clamp = v => LEVELS.has(v) ? v : 'hidden';

    function resolveContainer(el, explicit){
        if (!el) return null;
        if (explicit){
            const c = el.closest(explicit);
            if (c) return c;
        }
        // Prefer a visible UI row / block wrapper
        return el.closest('.row, .segmented, .select-row, .tool-block') || el;
    }

    class Control {
        constructor(key, el, container){
            this.key = key;
            this.el = el || null;
            this.container = container || el || null;
        }
        show(){ 
            const box = this.container || this.el; if(!box) return;
            // Neutralize legacy hiding
            box.removeAttribute('hidden'); box.classList.remove('hidden'); box.removeAttribute('data-vis-guard');
            // SMART_DISPLAY_FIX: ensure inline style overrides initial CSS (#autoFit{display:none})
            const tag = (box.tagName||'').toUpperCase();
            if (box.classList.contains('row'))       { box.style.display = 'block'; }
            else if (tag === 'BUTTON' || tag === 'INPUT' || tag==='SELECT') { box.style.display = 'inline-block'; }
            else                                     { box.style.display = ''; }
        }
        hide(){
            const box = this.container || this.el;
            if (!box) return;
            box.setAttribute('hidden','');
            box.classList.add('hidden');
            box.setAttribute('data-vis-guard','');
            box.style.display = 'none';
        }
        setEnabled(enabled){
            const box = this.container || this.el;
            if (!box) return;
            // Disable the box itself if it's interactive
            if ('disabled' in box) box.disabled = !enabled;
            // And all interactive descendants
            box.querySelectorAll('button,input,select,textarea').forEach(n=>{
                if ('disabled' in n) n.disabled = !enabled;
            });
        }
        setLevel(level){
            level = clamp(level);
            if (level === 'hidden'){ this.hide(); this.setEnabled(false); }
            else if (level === 'disabled'){ this.show(); this.setEnabled(false); }
            else { this.show(); this.setEnabled(true); }
            const box = this.container || this.el;
            if (box) box.setAttribute('data-ui-level', level);
            try{ DBG('[TEMPDBG][matrix][setLevel]', {key:this.key, level}); }catch{}
        }
    }

    class UIManager {
        constructor(map){
            this.controls = new Map();
            this.policy = { defaults:{ theme:'enabled' }, launch:{}, afterIndex:{}, validSelection:{} };
            if (map) this.register(map);
        }
        register(map){
            for (const [key, spec] of Object.entries(map)){
                let selector = spec, containerSel = null;
                if (spec && typeof spec === 'object'){ selector = spec.selector; containerSel = spec.container || null; }
                const el = selector ? document.querySelector(selector) : null;
                const container = resolveContainer(el, containerSel);
                this.controls.set(key, new Control(key, el, container));
                try{ DBG('[TEMPDBG][matrix][register]', {key, selector, hasEl:!!el, hasContainer:!!container}); }catch{}
            }
        }
        setPolicy(next){
            if (!next || typeof next!=='object') return;
            for (const sec of ['defaults','launch','afterIndex','validSelection']){
                if (next[sec]) this.policy[sec] = Object.assign({}, this.policy[sec], next[sec]);
            }
        }
        getPolicy(){ return JSON.parse(JSON.stringify(this.policy)); }
        applyStage(stage){
            try{ DBG('[TEMPDBG][matrix][applyStage]', stage); }catch{}
            const pol = this.policy;
            for (const [key, ctrl] of this.controls.entries()){
                const level = pol[stage]?.[key] ?? pol.defaults?.[key] ?? 'hidden';
                ctrl.setLevel(level);
            }
        }
    }

    // PUBLIC API
    window.Toolkit = {
        create(selectors){
            const map = {
                // TOPBAR
                theme:    { selector: (selectors.topbar && selectors.topbar.theme)    || '#themeSwitch',   container: '.themeToggle' },
                autozoom: { selector: (selectors.topbar && selectors.topbar.autozoom) || '#autoFit' },
                // SIDEBAR
                project:  { selector: (selectors.sidebar && selectors.sidebar.project)  || '#dzProject',    container: '.row' },
                combos:   { selector: (selectors.sidebar && selectors.sidebar.combos)   || '#pickBottom',   container: '.row' },
                cycle:    { selector: (selectors.sidebar && selectors.sidebar.cycle)    || '#cycleGroup',   container: '.row' },
                mirror:   { selector: (selectors.sidebar && selectors.sidebar.mirror)   || '#mirrorTop',    container: '.row' },
                storage:  { selector: (selectors.sidebar && selectors.sidebar.storage)  || '#wardrobeSwitch', container: '.row' },
                anchors:  { selector: (selectors.sidebar && selectors.sidebar.anchors)  || '#showAnchors',  container: '.row' },
                scale:    { selector: (selectors.sidebar && selectors.sidebar.scale)    || '#scale',        container: '.row' },
                exportSvg:{ selector: (selectors.sidebar && selectors.sidebar.exportSvg)|| '#exportSVG' },
                exportPng:{ selector: (selectors.sidebar && selectors.sidebar.exportPng)|| '#exportPNG' },
                filters:{ selector: (selectors.sidebar && selectors.sidebar.filters)|| '.filters', container: '.row'  },
            };
            const mgr = new UIManager(map);

            // EDIT THIS MATRIX AS NEEDED
            mgr.setPolicy({
                defaults: { theme:'enabled' },
                launch: {
                    theme:'enabled', autozoom:'hidden',
                    project:'hidden',
                    combos:'hidden', cycle:'hidden', mirror:'hidden',
                    storage:'hidden', anchors:'hidden', scale:'hidden',
                    exportSvg:'hidden', exportPng:'hidden', filters:'hidden'
                },
                afterIndex: {
                    theme:'enabled', autozoom:'enabled',
                    project:'hidden',
                    combos:'enabled', cycle:'disabled', mirror:'disabled',
                    storage:'disabled', anchors:'disabled', scale:'disabled',
                    exportSvg:'disabled', exportPng:'disabled', filters:'disabled'
                },
                validSelection: {
                    theme:'enabled', autozoom:'enabled',
                    project:'hidden',
                    combos:'enabled', cycle:'enabled', mirror:'enabled',
                    storage:'enabled', anchors:'enabled', scale:'enabled',
                    exportSvg:'enabled', exportPng:'enabled', filters:'enabled'
                }
            });

            const api = {
                beforeProject(){ mgr.applyStage('launch'); },
                afterIndex(){ mgr.applyStage('afterIndex'); },
                validSelection(){ mgr.applyStage('validSelection'); },
                setPolicy(next){ mgr.setPolicy(next); },
                getPolicy(){ return mgr.getPolicy(); },
                managers:{ mgr }
            };
            // Apply immediately for launch
            api.beforeProject();
            return api;
        }
    };
})();
