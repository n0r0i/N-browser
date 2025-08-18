// --- Globals ---
let activeTabId = null;

// --- DOM Elements ---
const tabBar = document.getElementById('tab-bar');
const urlBar = document.getElementById('url-bar');
const backButton = document.getElementById('back-button');
const forwardButton = document.getElementById('forward-button');
const reloadButton = document.getElementById('reload-button');
const addTabButton = document.getElementById('add-tab-button');
const minimizeButton = document.getElementById('minimize-button');
const maximizeButton = document.getElementById('maximize-button');
const closeButton = document.getElementById('close-button');


// --- Tab UI Management ---
function addTabToUI(tabId, title) {
    const tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.dataset.tabId = tabId;
    tabEl.innerHTML = `
        <span class="tab-title">${title}</span>
        <button class="close-tab-button"><i class="fas fa-times"></i></button>
    `;

    tabBar.appendChild(tabEl);

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
    }
});

window.electronAPI.onURLUpdated(({ viewId, url }) => {
    if (viewId === activeTabId) {
        urlBar.value = url;
    }
});


// --- UI Event Listeners that send messages to the Main Process ---
addTabButton.addEventListener('click', () => window.electronAPI.createNewTab());

backButton.addEventListener('click', () => window.electronAPI.navigateBack());
forwardButton.addEventListener('click', () => window.electronAPI.navigateForward());
reloadButton.addEventListener('click', () => window.electronAPI.navigateReload());

urlBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        let url = urlBar.value;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'http://' + url;
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
