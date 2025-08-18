const { app, BrowserWindow, BrowserView, ipcMain } = require('electron');
const path = require('node:path'); // Use modern 'node:' prefix

let mainWindow;
const views = new Map();
let activeViewId = null;

// Dedicated function to update view bounds, as suggested by user
function updateViewBounds() {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    const activeView = views.get(activeTabId);
    if (activeView) {
        const [width, height] = mainWindow.getContentSize();
        // Constants for UI element sizes. Makes it easier to adjust.
        const navBarHeight = 85; // Combined height of title bar and nav bar
        activeView.setBounds({ x: 0, y: navBarHeight, width: width, height: height - navBarHeight });
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    mainWindow.loadFile('index.html');
    mainWindow.removeMenu(); // Remove default menu, as suggested by user

    // Attach resize handler
    mainWindow.on('resize', updateViewBounds);
}

function createNewTab() {
    const viewId = Date.now().toString();
    const view = new BrowserView();
    views.set(viewId, view);

    // No need to addBrowserView here, setBrowserView in switchToTab will handle it.

    view.webContents.loadURL('https://www.google.com');

    view.webContents.on('page-title-updated', (e, title) => {
        mainWindow.webContents.send('tab-title-updated', { viewId, title });
    });
    view.webContents.on('did-navigate', (e, url) => {
        mainWindow.webContents.send('url-updated', { viewId, url });
    });

    switchToTab(viewId);
    mainWindow.webContents.send('tab-created', { viewId, title: 'New Tab' });
}

function switchToTab(viewId) {
    if (!views.has(viewId)) return;

    activeViewId = viewId;
    const view = views.get(viewId);

    mainWindow.setBrowserView(view); // This attaches the view
    updateViewBounds(); // Update bounds on switch

    const url = view.webContents.getURL();
    mainWindow.webContents.send('url-updated', { viewId, url });
}

function closeTab(viewId) {
    if (!views.has(viewId)) return;

    const view = views.get(viewId);

    // If the view to be closed is the current one, remove it from the window
    if (mainWindow.getBrowserView() === view) {
        mainWindow.removeBrowserView(view);
    }

    view.webContents.destroy();
    views.delete(viewId);

    if (activeViewId === viewId) {
        activeViewId = null;
        if (views.size > 0) {
            const firstViewId = views.keys().next().value;
            switchToTab(firstViewId);
        }
    }
}

app.whenReady().then(() => {
    createWindow();
    createNewTab();

    // IPC Listeners
    ipcMain.on('create-new-tab', createNewTab);
    ipcMain.on('switch-to-tab', (e, viewId) => switchToTab(viewId));
    ipcMain.on('close-tab', (e, viewId) => closeTab(viewId));

    ipcMain.on('nav-back', () => {
        if (activeViewId && views.has(activeViewId)) views.get(activeViewId).webContents.goBack();
    });
    ipcMain.on('nav-forward', () => {
        if (activeViewId && views.has(activeViewId)) views.get(activeViewId).webContents.goForward();
    });
    ipcMain.on('nav-reload', () => {
        if (activeViewId && views.has(activeViewId)) views.get(activeViewId).webContents.reload();
    });
    ipcMain.on('nav-load-url', (e, url) => {
        if (activeViewId && views.has(activeViewId)) views.get(activeViewId).webContents.loadURL(url);
    });

    // Window controls
    ipcMain.on('minimize-window', () => mainWindow.minimize());
    ipcMain.on('maximize-window', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });
    ipcMain.on('close-window', () => mainWindow.close());

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
