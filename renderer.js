const webview = document.getElementById('browser-view');
const urlBar = document.getElementById('url-bar');
const backButton = document.getElementById('back-button');
const forwardButton = document.getElementById('forward-button');
const reloadButton = document.getElementById('reload-button');
const addTabButton = document.getElementById('add-tab-button');

// Tab Management
addTabButton.addEventListener('click', () => {
    window.electronAPI.openNewWindow();
});

// URL Bar Logic
urlBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        let url = urlBar.value;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'http://' + url;
        }
        webview.loadURL(url);
    }
});

// Navigation Button Logic
backButton.addEventListener('click', () => {
    if (webview.canGoBack()) {
        webview.goBack();
    }
});

forwardButton.addEventListener('click', () => {
    if (webview.canGoForward()) {
        webview.goForward();
    }
});

reloadButton.addEventListener('click', () => {
    webview.reload();
});

// Webview Event Listeners
webview.addEventListener('did-navigate', (e) => {
    urlBar.value = e.url;
});

webview.addEventListener('page-title-updated', (e) => {
    // We can use this later to update the tab title
    console.log('Page title:', e.title);
});

webview.addEventListener('did-start-loading', () => {
    // Could add a loading spinner indicator here
});

webview.addEventListener('did-stop-loading', () => {
    // Could remove the loading spinner here
});
