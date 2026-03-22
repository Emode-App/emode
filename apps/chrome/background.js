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
    return true;
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('emodeAI Extension Installed');
});
