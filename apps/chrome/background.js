// 1. Sidebar Toggle / Icon Click logic
chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.setOptions({
        tabId: tab.id,
        path: 'sidepanel.html',
        enabled: true
    });
    chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'OPEN_SIDEBAR') {
        chrome.sidePanel.open({ windowId: sender.tab.windowId });
    }

    // 2. Auth bridge — persist the token relayed from the web app (see auth-bridge.js)
    // so the side panel can authenticate API calls even after being closed/reopened.
    if (message.type === 'AUTH_TOKEN_UPDATE') {
        if (message.accessToken) {
            chrome.storage.local.set({
                emode_access_token: message.accessToken,
                emode_user_id: message.userId || null,
                emode_token_expires_at: message.expiresAt || null,
            });
        } else {
            chrome.storage.local.remove(['emode_access_token', 'emode_user_id', 'emode_token_expires_at']);
        }
    }

    // 3. Local outbound cart — no account required. Source of truth lives in
    // chrome.storage.local; PRODUCT_DETECTED/CART_ADD messages also reach an
    // already-open side panel directly since sendMessage broadcasts to all
    // extension contexts, but we persist here so a closed panel sees it later.
    if (message.type === 'CART_ADD' && message.item) {
        chrome.storage.local.get({ emode_cart: [] }, (result) => {
            const cart = result.emode_cart || [];
            const isDuplicate = cart.some((i) => i.image === message.item.image && i.title === message.item.title);
            if (!isDuplicate) {
                cart.push({ ...message.item, id: crypto.randomUUID(), addedAt: Date.now() });
                chrome.storage.local.set({ emode_cart: cart });
            }
        });
    }

    return true;
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('emodeAI Extension Installed');
});
