// src/features/bathroom.js
// Optional bathroom compatibility layer toggle based on bottom.meta.kompatibilni_koupelna
// If set (number 1,2,3,...), we show the corresponding top-layer id "topKoupelnaX"
// and hide other "topKoupelna*" layers. If not set, we hide all such layers.

export function applyBathroomLayer() {
    try {
        const host = document.querySelector('#stage > svg');
        if (!host) {
            try { window.DBG && window.DBG('[TEMPDBG][bathroom] skip: no host'); } catch (_e) {}
            return;
        }

        const bottomSelect = document.getElementById('pickBottom');
        const bottomId = bottomSelect ? bottomSelect.value : null;
        if (!bottomId) {
            try { window.DBG && window.DBG('[TEMPDBG][bathroom] skip: no bottomId'); } catch (_e) {}
            return;
        }

        const META = window.META;
        if (!META || !Array.isArray(META.bottoms)) {
            try { window.DBG && window.DBG('[TEMPDBG][bathroom] skip: META.bottoms missing'); } catch (_e) {}
            return;
        }

        const bottomMeta = META.bottoms.find(b => b.id === bottomId);
        if (!bottomMeta) {
            try { window.DBG && window.DBG('[TEMPDBG][bathroom] skip: bottomMeta not found', { bottomId }); } catch (_e) {}
            return;
        }

        const value = bottomMeta.kompatibilni_koupelna;

        const layers = host.querySelectorAll('[id^="topKoupelna"]');
        const layerIds = Array.from(layers, el => el.id);

        if (!layers.length) {
            try {
                window.DBG && window.DBG(
                    '[TEMPDBG][bathroom] skip: no topKoupelna* layers in host',
                    { bottomId, value }
                );
            } catch (_e) {}
            return;
        }

        // If attribute is not set => hide all bathroom variants
        if (value === undefined || value === null || value === false || value === '') {
            layers.forEach(el => {
                el.style.display = 'none';
            });
            try {
                window.DBG && window.DBG(
                    '[TEMPDBG][bathroom] no kompatibilni_koupelna, hide all',
                    { bottomId, layerIds }
                );
            } catch (_e) {}
            return;
        }

        const targetId = 'topKoupelna' + String(value);
        let matched = false;

        layers.forEach(el => {
            if (el.id === targetId) {
                el.style.display = '';
                matched = true;
            } else {
                el.style.display = 'none';
            }
        });

        try {
            window.DBG && window.DBG('[TEMPDBG][bathroom] apply', {
                bottomId,
                value,
                targetId,
                matched,
                layerIds
            });
        } catch (_e) {}
    } catch (e) {
        try { window.DBG && window.DBG('[TEMPDBG][bathroom][error]', e); } catch (_e) {}
    }
}
