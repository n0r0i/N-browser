const pageTitle = document.getElementById('page-title');
const itemList = document.getElementById('item-list');

// Determine page type from URL query parameter
const urlParams = new URLSearchParams(window.location.search);
const pageType = urlParams.get('page'); // 'history' or 'favorites'

// Set up the page and request data
if (pageType === 'history') {
    pageTitle.textContent = 'History';
    window.electronAPI.getHistoryData();
} else if (pageType === 'favorites') {
    pageTitle.textContent = 'Favorites';
    window.electronAPI.getFavoritesData();
}

// Listen for the data to come back from the main process
window.electronAPI.onHistoryData((data) => {
    itemList.innerHTML = ''; // Clear list
    data.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="${item.url}">${item.title}</a> <span class="timestamp">${new Date(item.timestamp).toLocaleString()}</span>`;
        itemList.appendChild(li);
    });
});

window.electronAPI.onFavoritesData((data) => {
    itemList.innerHTML = ''; // Clear list
    data.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="${item.url}">${item.title}</a>`;
        itemList.appendChild(li);
    });
});
