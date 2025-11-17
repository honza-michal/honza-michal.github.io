
import { clamp } from '../utils/math.js';
export const normalizeCfg={enable:true,mode:'height',bottomTarget:1710,topToBottomRatio:780/1710,excludeSelector:''};
export function robustDim(group,mode,excludeSelector,fallbackDim){
    const measure=(hide=false)=>{
        let restore=[];
        try{
            if(hide&&excludeSelector){
                const toHide=Array.from(group.querySelectorAll(excludeSelector));
                restore=toHide.map(el=>[el,el.getAttribute('display')]);
                for(const el of toHide) el.setAttribute('display','none');
            }
            const bb=group.getBBox?.();
            if(bb&&bb.width>0&&bb.height>0) return (mode==='width')?bb.width:bb.height;
        }catch(e){ DBG('[TEMPDBG][robustDim] getBBox failed', e); }
        finally{for(const[el,val]of restore){if(val==null)el.removeAttribute('display');else el.setAttribute('display',val);}}
        return null;
    };
    let dim=measure(true); if(!(dim>0)) dim=measure(false); if(!(dim>0)) dim=fallbackDim;
    DBG('[TEMPDBG][robustDim]', {mode,dim,fallbackDim});
    return dim;
}
export function ensureHostViewBoxFromBBoxExcluding(hostSvg,group,excludeSelector){
    const toHide=excludeSelector?Array.from(group.querySelectorAll(excludeSelector)):[]; const prev=[];
    toHide.forEach(el=>{prev.push([el,el.getAttribute('display')]); el.setAttribute('display','none');});
    try{
        const bb=group.getBBox?.(); DBG('[TEMPDBG][ensureVB] bbox:', bb);
        if(bb&&bb.width>0&&bb.height>0){ hostSvg.setAttribute('viewBox',`${bb.x} ${bb.y} ${bb.width} ${bb.height}`); return true; }
    }catch(e){ DBG('[TEMPDBG][ensureVB] failed', e); }
    finally{ for(const[el,val]of prev){ if(val==null)el.removeAttribute('display'); else el.setAttribute('display',val); } }
    return false;
}
export function computeScales(BASE,TOP,kUnits){
    const mode='height'; const baseVBdim=(mode==='width')?BASE.vb[2]:BASE.vb[3]; const topVBdim=((mode==='width')?TOP.vb[2]:TOP.vb[3])*kUnits;
    const baseDim=robustDim(BASE.group,mode,normalizeCfg.excludeSelector,baseVBdim);
    const topDim =robustDim(TOP.group, mode,normalizeCfg.excludeSelector,topVBdim);
    let sBase=baseDim>0?normalizeCfg.bottomTarget/baseDim:1; let sTop=topDim>0?(normalizeCfg.bottomTarget*normalizeCfg.topToBottomRatio)/topDim:1;
    sBase=clamp(sBase,1e-6,1e6); sTop=clamp(sTop,1e-6,1e6);
    DBG('[TEMPDBG][computeScales]', {kUnits,baseVB:BASE.vb,topVB:TOP.vb,baseDim,topDim,sBase,sTop});
    return {sBase,sTop};
}
