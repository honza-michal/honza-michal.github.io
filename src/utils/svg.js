
export const splitVB=vb=>String(vb||'').trim().split(/\s+/).map(Number);
export function lenToPx(v){if(v==null)return null;const m=String(v).trim().match(/^(-?\d+(?:\.\d+)?)(px|mm|cm|in|pt|pc)?$/i);if(!m)return null;const val=+m[1],u=(m[2]||'px').toLowerCase(),DPI=96,PXMM=DPI/25.4;return u==='px'?val:u==='mm'?val*PXMM:u==='cm'?val*10*PXMM:u==='in'?val*DPI:u==='pt'?val*DPI/72:u==='pc'?val*DPI/6:val;}
export function pxPerUnit(svg){const[, ,w,h]=splitVB(svg.getAttribute('viewBox'));const wp=lenToPx(svg.getAttribute('width'));const hp=lenToPx(svg.getAttribute('height'));if(wp&&w)return wp/w;if(hp&&h)return hp/h;return 1;}
