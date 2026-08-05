// emodeAI | Auth Bridge Content Script
// Runs ONLY on the emodeAI web app origin (see manifest.json matches).
// The web app broadcasts its Supabase session via window.postMessage
// (see apps/web/components/ExtensionAuthBridge.tsx); we relay it into the
// extension's storage so the side panel can call authenticated APIs from a
// chrome-extension:// origin, which cannot see the web app's localStorage/cookies.

window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.origin !== window.location.origin) return;
    if (!event.data || event.data.source !== 'emode-web') return;

    if (event.data.type === 'EMODE_AUTH_STATE') {
        chrome.runtime.sendMessage({
            type: 'AUTH_TOKEN_UPDATE',
            accessToken: event.data.accessToken || null,
            userId: event.data.userId || null,
            expiresAt: event.data.expiresAt || null,
            email: event.data.email || null,
        });
    }
});

// Ask the page to (re)announce its current auth state as soon as we're injected
// (covers the case where the page loaded and fired its one-time broadcast before
// the content script was ready).
window.postMessage({ source: 'emode-extension', type: 'REQUEST_AUTH_STATE' }, window.location.origin);
