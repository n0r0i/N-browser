const pageTitle = document.getElementById('page-title');
const itemList = document.getElementById('item-list');

// Determine page type from URL hostname
const pageType = window.location.hostname; // e.g., 'history' or 'favorites'

// Set up the page and request data
if (pageType === 'history') {
    console.log('[library.js] Requesting history data...');
    pageTitle.textContent = 'History';
    window.electronAPI.getHistoryData();
} else if (pageType === 'favorites') {
    console.log('[library.js] Requesting favorites data...');
    pageTitle.textContent = 'Favorites';
    window.electronAPI.getFavoritesData();
}

// Listen for the data to come back from the main process
window.electronAPI.onHistoryData((data) => {
    console.log(`[library.js] Received ${data.length} history items.`);
    itemList.innerHTML = ''; // Clear list
    data.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="${item.url}">${item.title}</a> <span class="timestamp">${new Date(item.timestamp).toLocaleString()}</span>`;
        itemList.appendChild(li);
    });
});

window.electronAPI.onFavoritesData((data) => {
    console.log(`[library.js] Received ${data.length} favorites items.`);
    itemList.innerHTML = ''; // Clear list
    data.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="${item.url}">${item.title}</a>`;
        itemList.appendChild(li);
    });
});
