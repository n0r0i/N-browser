// --- Globals ---
let tabs = [];
let activeTabId = null;

// --- DOM Elements ---
const tabBar = document.getElementById('tab-bar');
const contentArea = document.getElementById('content-area');
const urlBar = document.getElementById('url-bar');

const backButton = document.getElementById('back-button');
const forwardButton = document.getElementById('forward-button');
const reloadButton = document.getElementById('reload-button');
const addTabButton = document.getElementById('add-tab-button');

const minimizeButton = document.getElementById('minimize-button');
const maximizeButton = document.getElementById('maximize-button');
const closeButton = document.getElementById('close-button');

// --- Helper Functions ---
const getActiveWebview = () => {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    return activeTab ? activeTab.webview : null;
};

// --- Tab Management Functions ---
function createNewTab() {
    const tabId = Date.now(); // Simple unique ID

    // Create Tab Element
    const tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.dataset.tabId = tabId;
    tabEl.innerHTML = `
        <span class="tab-title">New Tab</span>
        <button class="close-tab-button">x</button>
    `;

    // Create Webview Element
    const webview = document.createElement('webview');
    webview.src = 'https://www.google.com';
    webview.style.width = '100%';
    webview.style.height = '100%';

    // Store Tab Info
    const newTab = { id: tabId, element: tabEl, webview: webview };
    tabs.push(newTab);

    // Add to DOM
    tabBar.appendChild(tabEl);
    contentArea.appendChild(webview);

    // Add Event Listeners
    tabEl.addEventListener('click', () => switchToTab(tabId));
    tabEl.querySelector('.close-tab-button').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent click from bubbling to the tab itself
        closeTab(tabId);
    });

    webview.addEventListener('did-navigate', (e) => {
        if (tabId === activeTabId) {
            urlBar.value = e.url;
        }
    });

    webview.addEventListener('page-title-updated', (e) => {
        tabEl.querySelector('.tab-title').textContent = e.title;
    });

    // Switch to the new tab
    switchToTab(tabId);
}

function switchToTab(tabId) {
    activeTabId = tabId;

    tabs.forEach(tab => {
        const isActive = tab.id === tabId;
        tab.element.classList.toggle('active', isActive);
        tab.webview.style.display = isActive ? 'flex' : 'none';
        if (isActive) {
            urlBar.value = tab.webview.getURL();
        }
    });
}

function closeTab(tabId) {
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex === -1) return;

    const { element, webview } = tabs[tabIndex];

    // Remove from DOM
    element.remove();
    webview.remove();

    // Remove from array
    tabs.splice(tabIndex, 1);

    // If the closed tab was active, switch to a new one
    if (activeTabId === tabId) {
        if (tabs.length > 0) {
            // Switch to the previous tab, or the first one if it was the first
            const newActiveIndex = Math.max(0, tabIndex - 1);
            switchToTab(tabs[newActiveIndex].id);
        } else {
            // If no tabs left, create a new one
            createNewTab();
        }
    }
}


// --- Event Listeners ---
// Navigation Controls
backButton.addEventListener('click', () => {
    const webview = getActiveWebview();
    if (webview && webview.canGoBack()) webview.goBack();
});
forwardButton.addEventListener('click', () => {
    const webview = getActiveWebview();
    if (webview && webview.canGoForward()) webview.goForward();
});
reloadButton.addEventListener('click', () => {
    const webview = getActiveWebview();
    if (webview) webview.reload();
});

// URL Bar
urlBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const webview = getActiveWebview();
        if (webview) {
            let url = urlBar.value;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'http://' + url;
            }
            webview.loadURL(url);
        }
    }
});

// Window Controls
minimizeButton.addEventListener('click', () => window.electronAPI.minimizeWindow());
maximizeButton.addEventListener('click', () => window.electronAPI.maximizeWindow());
closeButton.addEventListener('click', () => window.electronAPI.closeWindow());

// Tab Management
addTabButton.addEventListener('click', createNewTab);


// --- Initial State ---
createNewTab();
