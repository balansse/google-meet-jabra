chrome.action.onClicked.addListener(tab => {
    chrome.tabs.sendMessage(tab.id, { type: 'consent' });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.badgeText)
        chrome.action.setBadgeBackgroundColor({ color: [255, 209, 0, 255] });
        chrome.action.setBadgeText({ tabId: sender.tab.id, text: request.badgeText });
    }
);