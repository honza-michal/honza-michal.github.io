
import { state } from '../core/state.js';
import { buildCombinedSVGForExport } from '../features/combine.js';
export function exportSVG(){
    const svg=buildCombinedSVGForExport();
    const xml=new XMLSerializer().serializeToString(svg);
    const blob=new Blob([xml],{type:'image/svg+xml'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='kombinace.svg'; a.click(); URL.revokeObjectURL(a.href);
    DBG('[TEMPDBG][export] SVG done');
}
export async function exportPNG(){
    const svg=buildCombinedSVGForExport();
    const data=new XMLSerializer().serializeToString(svg);
    const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(data);
    const img=new Image(); await new Promise(r=>{ img.onload=r; img.src=url; });
    const canvas=document.createElement('canvas');
    const vb = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : null;
    const wAttr = svg.width && svg.width.baseVal ? svg.width.baseVal.value : null;
    const hAttr = svg.height && svg.height.baseVal ? svg.height.baseVal.value : null;
    let w = (wAttr && wAttr>0) ? wAttr : (vb ? vb.width : img.width);
    let h = (hAttr && hAttr>0) ? hAttr : (vb ? vb.height : img.height);
    canvas.width = w;
    canvas.height = h;
    const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,canvas.width,canvas.height); canvas.toBlob(b=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='kombinace.png'; a.click(); URL.revokeObjectURL(a.href); DBG('[TEMPDBG][export] PNG done'); },'image/png');
}
