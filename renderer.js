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
const downloadButton = document.getElementById('download-button');
const uBlockToggleButton = document.getElementById('ublock-toggle-button');
const container = document.querySelector('.container');


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
        // Optimistically update UI and state, then tell main process
        setActiveTabUI(tabId);
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

function updateUBlockButton(isEnabled) {
    const icon = uBlockToggleButton.querySelector('i');
    if (isEnabled) {
        icon.style.color = '#28a745'; // Green for enabled
        uBlockToggleButton.title = 'uBlock Origin (Enabled)';
    } else {
        icon.style.color = '#6c757d'; // Gray for disabled
        uBlockToggleButton.title = 'uBlock Origin (Disabled)';
    }
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

// This is the primary mechanism for keeping the renderer's active tab state in sync
window.electronAPI.onTabSwitched((tabId) => {
    setActiveTabUI(tabId);
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
        // Reset display style in case it was hidden from a previous error
        faviconEl.style.display = 'inline'; 
        faviconEl.src = faviconUrl;
        faviconEl.onerror = () => {
            faviconEl.style.display = 'none'; // Hide if it fails to load
        };
    }
});

// --- Fullscreen Handlers ---
window.electronAPI.onEnterFullscreen(() => {
    container.classList.add('fullscreen-active');
});

window.electronAPI.onLeaveFullscreen(() => {
    container.classList.remove('fullscreen-active');
});

// --- Download Handlers ---
window.electronAPI.onDownloadProgress((data) => {
    // For now, just log the progress. A more complex UI could show a progress bar.
    console.log(`Download progress for ${data.filename}: ${Math.round(data.progress * 100)}%`);
    // Simple visual feedback: make the button glow or change color
    downloadButton.style.color = '#00aaff';
});

window.electronAPI.onDownloadComplete((data) => {
    console.log(`Download complete for ${data.filename}, state: ${data.state}`);
    // Change color based on state
    if (data.state === 'completed') {
        downloadButton.style.color = '#28a745'; // Green for success
    } else {
        downloadButton.style.color = '#dc3545'; // Red for failure/cancel
    }
    // Reset color after a delay
    setTimeout(() => {
        downloadButton.style.color = ''; // Reset to default
    }, 3000);
});


// --- UI Event Listeners that send messages to the Main Process ---
addTabButton.addEventListener('click', () => window.electronAPI.createNewTab());

favoriteButton.addEventListener('click', () => window.electronAPI.addFavorite());

uBlockToggleButton.addEventListener('click', async () => {
    const isEnabled = await window.electronAPI.toggleUBlock();
    updateUBlockButton(isEnabled);
});

downloadButton.addEventListener('click', () => {
    window.electronAPI.openDownloadsPage();
});

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



// --- URL Suggestions Logic ---
const urlSuggestions = document.getElementById('url-suggestions');

function displaySuggestions(suggestions) {
    console.log('[renderer.js] displaySuggestions called with:', suggestions);
    urlSuggestions.innerHTML = ''; // Clear previous suggestions

    if (suggestions.length === 0) {
        urlSuggestions.style.display = 'none';
        return;
    }

    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.dataset.url = suggestion.url; // Store URL for click handler

        const title = document.createElement('div');
        title.className = 'suggestion-title';
        title.textContent = suggestion.title || 'No Title';
        
        const url = document.createElement('div');
        url.className = 'suggestion-url';
        url.textContent = suggestion.url;

        item.appendChild(title);
        item.appendChild(url);
        urlSuggestions.appendChild(item);
    });

    urlSuggestions.style.display = 'block';
}

urlBar.addEventListener('input', async () => {
    console.log(`[renderer.js] Input event fired. Term: "${urlBar.value.trim()}"`);    
    const term = urlBar.value.trim();
    if (term.length === 0) {
        urlSuggestions.style.display = 'none';
        return;
    }
    const results = await window.electronAPI.searchHistory(term);
    console.log('[renderer.js] Received results from main process:', results);
    displaySuggestions(results);
});

urlBar.addEventListener('blur', () => {
    // Delay hiding to allow click events on suggestions to register
    setTimeout(() => {
        urlSuggestions.style.display = 'none';
    }, 150);
});

urlSuggestions.addEventListener('mousedown', (e) => {
    // Use mousedown to beat the blur event, which would otherwise hide the suggestions
    const item = e.target.closest('.suggestion-item');
    if (item) {
        const url = item.dataset.url;
        urlBar.value = url;
        window.electronAPI.loadURL(url);
    }
});

// Add a keydown listener to the urlBar to hide suggestions on Enter.
// This is separate from the existing one that handles navigation.
urlBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        urlSuggestions.style.display = 'none';
    }
});


// --- Initial State ---
// The main process will create the first tab for us when the window loads.
// We just need to be ready to receive the 'tab-created' event.
updateUBlockButton(true); // Set initial state (assuming it's enabled by default)

// --- Global Key Listeners ---
// F12 is now handled by the main process using globalShortcut.
