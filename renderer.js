// --- Globals ---
let activeTabId = null;

// --- DOM Elements ---
const tabBar = document.getElementById('tab-bar');
const urlBar = document.getElementById('url-bar');
const backButton = document.getElementById('back-button');
const forwardButton = document.getElementById('forward-button');
const reloadButton = document.getElementById('reload-button');
const addTabButton = document.getElementById('add-tab-button');
const favoriteButton = document.getElementById('favorite-button');
const minimizeButton = document.getElementById('minimize-button');
const maximizeButton = document.getElementById('maximize-button');
const closeButton = document.getElementById('close-button');
const menuButton = document.getElementById('menu-button');


// --- Tab UI Management ---
function addTabToUI(tabId, title) {
    const tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.dataset.tabId = tabId;
    tabEl.innerHTML = `
        <img class="tab-favicon" src=""> <!-- Placeholder for the icon -->
        <span class="tab-title">${title}</span>
        <button class="close-tab-button"><i class="fas fa-times"></i></button>
    `;

    tabBar.insertBefore(tabEl, addTabButton);

    // Event Listeners for the new tab element
    tabEl.addEventListener('click', () => {
        window.electronAPI.switchToTab(tabId);
    });

    tabEl.querySelector('.close-tab-button').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent the tab click event from firing
        window.electronAPI.closeTab(tabId);
        tabEl.remove(); // Immediately remove from UI for responsiveness
    });
}

function setActiveTabUI(tabId) {
    activeTabId = tabId;
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tabId === tabId);
    });
}

// --- Listeners for events from the Main Process ---
window.electronAPI.onWindowStateChange((state) => {
    const maximizeIcon = maximizeButton.querySelector('i');
    if (state === 'maximized') {
        maximizeIcon.classList.remove('fa-square');
        maximizeIcon.classList.add('fa-window-restore');
    } else {
        maximizeIcon.classList.remove('fa-window-restore');
        maximizeIcon.classList.add('fa-square');
    }
});

window.electronAPI.onTabCreated((newTab) => {
    addTabToUI(newTab.viewId, newTab.title);
    setActiveTabUI(newTab.viewId);
});

window.electronAPI.onTabTitleUpdated(({ viewId, title }) => {
    const tabEl = tabBar.querySelector(`[data-tab-id="${viewId}"]`);
    if (tabEl) {
        tabEl.querySelector('.tab-title').textContent = title;
        tabEl.title = title; // Set the tooltip
    }
});

window.electronAPI.onURLUpdated(({ viewId, url }) => {
    console.log(`[renderer.js] url-updated event received for view ${viewId}. Active tab is ${activeTabId}.`);
    if (viewId === activeTabId) {
        console.log(`[renderer.js] Updating URL bar to: ${url}`);
        urlBar.value = url;
    }
});

window.electronAPI.onFaviconUpdated(({ viewId, faviconUrl }) => {
    const tabEl = tabBar.querySelector(`[data-tab-id="${viewId}"]`);
    if (tabEl) {
        const faviconEl = tabEl.querySelector('.tab-favicon');
        faviconEl.src = faviconUrl;
    }
});


// --- UI Event Listeners that send messages to the Main Process ---
addTabButton.addEventListener('click', () => window.electronAPI.createNewTab());

favoriteButton.addEventListener('click', () => window.electronAPI.addFavorite());

menuButton.addEventListener('click', () => {
    window.electronAPI.showMainMenu();
});

backButton.addEventListener('click', () => window.electronAPI.navigateBack());
forwardButton.addEventListener('click', () => window.electronAPI.navigateForward());
reloadButton.addEventListener('click', () => window.electronAPI.navigateReload());

urlBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        let input = urlBar.value;
        let url;

        // Basic check for URL vs. search query
        if (input.includes('.') && !input.includes(' ')) {
            url = !input.startsWith('http') ? 'http://' + input : input;
        } else {
            url = 'https://www.google.com/search?q=' + encodeURIComponent(input);
        }

        window.electronAPI.loadURL(url);
    }
});

minimizeButton.addEventListener('click', () => window.electronAPI.minimizeWindow());
maximizeButton.addEventListener('click', () => window.electronAPI.maximizeWindow());
closeButton.addEventListener('click', () => window.electronAPI.closeWindow());

// --- Initial State ---
// The main process will create the first tab for us when the window loads.
// We just need to be ready to receive the 'tab-created' event.

// --- Global Key Listeners ---
// F12 is now handled by the main process using globalShortcut.
