
export const fileIndex={ bottoms:new Map(), tops:new Map() };
const isSvg=f=>/\.svg$/i.test(f.name);
const base=p=>(p.split(/[\\/]/).pop()||'').replace(/\.[^.]+$/,'');
export function indexWholeProjectFolder(files){
    fileIndex.bottoms.clear(); fileIndex.tops.clear();
    for(const f of files){ if(!isSvg(f)) continue;
        const rel=(f.webkitRelativePath||f.name).replace(/\\/g,'/').toLowerCase();
        if(rel.includes('/assets/bottoms/')) fileIndex.bottoms.set(base(f.name), f);
        else if(rel.includes('/assets/tops/')) fileIndex.tops.set(base(f.name), f);
        else { if(/^bottom_/.test(f.name)) fileIndex.bottoms.set(base(f.name), f); if(/^top_/.test(f.name)) fileIndex.tops.set(base(f.name), f); }
    }
    DBG('[TEMPDBG][index] bottoms,tops', fileIndex.bottoms.size, fileIndex.tops.size);
}
