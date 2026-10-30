chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { action: "TOGGLE_MINI_TOOLS" });
  } catch (err) {
    try {
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["content.css"] });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: "TOGGLE_MINI_TOOLS" });
        } catch (e) {}
      }, 80);
    } catch (e) {
      console.warn("JohnPen: Cannot run on internal browser pages.");
    }
  }
});
