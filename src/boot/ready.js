// src/boot/ready.js
export const Ready = (() => {
    let ready = false;
    const listeners = new Set();

    function isReady(){ return ready; }

    function onReady(cb){
        if (ready) { queueMicrotask(cb); return () => {}; }
        listeners.add(cb);
        return () => listeners.delete(cb);
    }

    function emitReady(){
        if (ready) return;
        ready = true;
        for (const cb of listeners) { try { cb(); } catch (e) {} }
        listeners.clear();
        window.dispatchEvent(new Event('project:ready'));
        console.debug('[READY] project:ready emitted');
    }

    function wait(){
        return ready ? Promise.resolve() : new Promise(res => onReady(res));
    }

    return { isReady, onReady, emitReady, wait };
})();
