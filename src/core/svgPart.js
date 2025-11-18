// src/core/svgPart.js
export class SvgPart {
    constructor(name, el, gMirror, gAnchor) {
        this.name = name;
        this.el = el;
        this.gMirror = gMirror;
        this.gAnchor = gAnchor;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.originalPos = { x: 0, y: 0 };
        this.originalAnchor = { x: 0, y: 0 };
        this.currentWidth = 0;
        this.currentHeight = 0;
        this.currentPos = { x: 0, y: 0 };
        this.currentAnchor = { x: 0, y: 0 };
        this.mirror = false;
        this.mirrorPivot = 0;
    }
    _geomBBox() {
        try { return this.gMirror.getBBox(); } catch(e) { return {x:0,y:0,width:0,height:0}; }
    }
    _anchorCenterLocal() {
        try { const b = this.gAnchor.getBBox(); return { x: b.x + b.width/2, y: b.y + b.height/2 }; }
        catch(e){ return {x:0,y:0}; }
    }
    localToHost(p) {
        const m = this.el.getCTM?.(); if (!m) return {...p};
        return { x: m.a*p.x + m.c*p.y + m.e, y: m.b*p.x + m.d*p.y + m.f };
    }
    hostToLocal(p) {
        const m = this.el.getCTM?.(); if (!m) return {...p};
        const det = m.a*m.d - m.b*m.c || 1;
        const ia = m.d/det, ib = -m.b/det, ic = -m.c/det, id = m.a/det
        const ie = (m.c*m.f - m.d*m.e)/det, if_ = (m.b*m.e - m.a*m.f)/det
        return { x: ia*p.x + ic*p.y + ie, y: ib*p.x + id*p.y + if_ };
    }
    initFromDOM() {
        const bb = this._geomBBox();
        this.originalWidth = bb.width; this.originalHeight = bb.height;
        this.originalPos = { x: bb.x, y: bb.y };
        this.originalAnchor = this._anchorCenterLocal();
        this.currentWidth = bb.width; this.currentHeight = bb.height;
        this.currentPos = { x: bb.x, y: bb.y };
        this.currentAnchor = this.localToHost(this.originalAnchor);
        this.mirrorPivot = bb.x + bb.width/2;
    }
    updateFromDOMAfterChange() {
        const bb = this._geomBBox();
        this.currentWidth = bb.width; this.currentHeight = bb.height;
        this.currentPos = { x: bb.x, y: bb.y };
        const localAnchor = this._anchorCenterLocal();
        this.currentAnchor = this.localToHost(localAnchor);
    }
}
