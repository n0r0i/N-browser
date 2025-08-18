const { app, BrowserWindow, BrowserView, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
const views = new Map();
let activeViewId = null;

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
    // mainWindow.webContents.openDevTools(); // For debugging UI

    mainWindow.on('resize', () => {
        if (activeViewId) {
            const view = views.get(activeViewId);
            if (view) {
                // Adjust view bounds based on UI element sizes (40px title + 45px nav)
                const [width, height] = mainWindow.getContentSize();
                view.setBounds({ x: 0, y: 85, width: width, height: height - 85 });
            }
        }
    });
}

function createNewTab() {
    const viewId = Date.now().toString();
    const view = new BrowserView();
    views.set(viewId, view);

    mainWindow.addBrowserView(view);

    const [width, height] = mainWindow.getContentSize();
    view.setBounds({ x: 0, y: 85, width: width, height: height - 85 });
    view.webContents.loadURL('https://www.google.com');

    // view.webContents.openDevTools(); // For debugging webview content

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

    mainWindow.setBrowserView(view); // Use setBrowserView to show and hide

    // Adjust bounds on switch
    const [width, height] = mainWindow.getContentSize();
    view.setBounds({ x: 0, y: 85, width: width, height: height - 85 });

    const url = view.webContents.getURL();
    mainWindow.webContents.send('url-updated', { viewId, url });
}

function closeTab(viewId) {
    if (!views.has(viewId)) return;

    const view = views.get(viewId);
    mainWindow.removeBrowserView(view);
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
    createNewTab(); // Create the first tab on startup

    // Set up IPC listeners
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
