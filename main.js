const { app, BrowserWindow, BrowserView, ipcMain, session, Menu, protocol } = require('electron');
const path = require('node:path');

// Custom protocol removed for stability. Will revert to file://
require('events').EventEmitter.defaultMaxListeners = 20; // Suppress MaxListenersExceededWarning
const database = require('./database.js');

class NBrowser {
    constructor() {
        this.mainWindow = null;
        this.menuWindow = null;
        this.views = new Map();
        this.activeTabId = null;

        this._init();
    }

    _init() {
        app.whenReady().then(async () => {
            // Set User Agent for the default session, as suggested by user
            session.defaultSession.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36");

            await database.initDb();

            this._createWindow();
            this._setupIpcListeners();

            app.on('activate', () => {
                if (BrowserWindow.getAllWindows().length === 0) this._createWindow();
            });
        });

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') app.quit();
        });
    }

    _createWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            frame: false,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                contextIsolation: true,
                nodeIntegration: false,
            }
        });

        this.mainWindow.loadFile('index.html');
        this.mainWindow.removeMenu();

        this.mainWindow.on('resize', () => this._updateViewBounds());

        this.mainWindow.on('maximize', () => {
            this.mainWindow.webContents.send('window-state-changed', 'maximized');
        });
        this.mainWindow.on('unmaximize', () => {
            this.mainWindow.webContents.send('window-state-changed', 'normal');
        });

        // Create the first tab once the UI is ready
        this.mainWindow.webContents.once('did-finish-load', () => {
            this._createNewTab();
        });
    }

    _updateViewBounds() {
        if (!this.mainWindow || this.mainWindow.isDestroyed() || !this.activeTabId) return;

        const activeView = this.views.get(this.activeTabId);
        if (activeView) {
            const [width, height] = this.mainWindow.getContentSize();
            const navBarHeight = 85;
            activeView.setBounds({ x: 0, y: navBarHeight, width: width, height: height - navBarHeight });
        }
    }

    _createNewTab(options = {}) {
        const { url = 'https://www.google.com', title = 'New Tab', webPreferences = {} } = options;

        const viewId = Date.now().toString();
        const view = new BrowserView({ webPreferences });
        this.views.set(viewId, view);

        view.webContents.loadURL(url);

        view.webContents.on('page-title-updated', (e, title) => {
            this.mainWindow.webContents.send('tab-title-updated', { viewId, title });
        });
        view.webContents.on('page-favicon-updated', (e, favicons) => {
            if (favicons && favicons.length > 0) {
                this.mainWindow.webContents.send('favicon-updated', { viewId, faviconUrl: favicons[0] });
            }
        });
        view.webContents.on('did-navigate', (e, url) => {
            console.log(`[main.js] did-navigate: view ${viewId} navigated to ${url}. Sending url-updated.`);
            this.mainWindow.webContents.send('url-updated', { viewId, url });
            const title = view.webContents.getTitle();
            database.addHistory(url, title);
        });

        view.webContents.on('context-menu', (e, params) => {
            const menu = Menu.buildFromTemplate([
                { label: 'Back', click: () => view.webContents.goBack(), enabled: view.webContents.canGoBack() },
                { label: 'Forward', click: () => view.webContents.goForward(), enabled: view.webContents.canGoForward() },
                { label: 'Reload', click: () => view.webContents.reload() },
                { type: 'separator' },
                { label: 'Inspect', click: () => view.webContents.openDevTools({ mode: 'undocked' }) }
            ]);
            menu.popup({ window: this.mainWindow });
        });

        this._switchToTab(viewId);
        this.mainWindow.webContents.send('tab-created', { viewId, title: 'New Tab' });
    }

    _switchToTab(viewId) {
        if (!this.views.has(viewId)) return;

        this.activeTabId = viewId;
        const view = this.views.get(this.activeTabId);

        this.mainWindow.setBrowserView(view);
        this._updateViewBounds();

        const url = view.webContents.getURL();
        this.mainWindow.webContents.send('url-updated', { viewId, url });
    }

    _closeTab(viewId) {
        if (!this.views.has(viewId)) return;

        const view = this.views.get(viewId);
        if (this.mainWindow.getBrowserView() === view) {
            this.mainWindow.removeBrowserView(view);
        }
        view.webContents.destroy();
        this.views.delete(viewId);

        if (this.activeTabId === viewId) {
            this.activeTabId = null;
            if (this.views.size > 0) {
                const firstViewId = this.views.keys().next().value;
                this._switchToTab(firstViewId);
            } else {
                // If all tabs are closed, maybe create a new one or close the window
                this._createNewTab();
            }
        }
    }

    _setupIpcListeners() {
        ipcMain.on('create-new-tab', () => this._createNewTab({})); // Pass empty options for default behavior
        ipcMain.on('switch-to-tab', (e, viewId) => this._switchToTab(viewId));
        ipcMain.on('close-tab', (e, viewId) => this._closeTab(viewId));

        ipcMain.on('open-library-page', (e, page) => {
            // page will be 'history' or 'favorites'
            const url = `file://${path.join(__dirname, `${page}.html`)}`;
            const title = page.charAt(0).toUpperCase() + page.slice(1);
            this._createNewTab({
                url,
                title,
                webPreferences: {
                    preload: path.join(__dirname, 'preload.js'),
                    contextIsolation: true,
                }
            });
        });

        ipcMain.on('get-history-data', async (event) => {
            console.log('[main.js] Received request for history data.');
            const history = await database.getHistory();
            console.log(`[main.js] Got ${history.length} history items from DB. Sending to renderer.`);
            event.sender.send('history-data', history);
        });

        ipcMain.on('get-favorites-data', async (event) => {
            console.log('[main.js] Received request for favorites data.');
            const favorites = await database.getFavorites();
            console.log(`[main.js] Got ${favorites.length} favorites items from DB. Sending to renderer.`);
            event.sender.send('favorites-data', favorites);
        });

        ipcMain.on('delete-history-item', (event, id) => {
            database.deleteHistory(id);
            event.sender.send('refresh-data');
        });

        ipcMain.on('delete-favorite-item', (event, id) => {
            database.deleteFavorite(id);
            event.sender.send('refresh-data');
        });

        ipcMain.on('add-favorite', () => {
            if (this.activeTabId) {
                const view = this.views.get(this.activeTabId);
                if (view) {
                    const url = view.webContents.getURL();
                    const title = view.webContents.getTitle();
                    database.addFavorite(url, title);
                }
            }
        });

        ipcMain.on('nav-back', () => {
            if (this.activeTabId) this.views.get(this.activeTabId)?.webContents.goBack();
        });
        ipcMain.on('nav-forward', () => {
            if (this.activeTabId) this.views.get(this.activeTabId)?.webContents.goForward();
        });
        ipcMain.on('nav-reload', () => {
            if (this.activeTabId) this.views.get(this.activeTabId)?.webContents.reload();
        });
        ipcMain.on('nav-load-url', (e, url) => {
            if (this.activeTabId) this.views.get(this.activeTabId)?.webContents.loadURL(url);
        });

        ipcMain.on('minimize-window', () => this.mainWindow.minimize());
        ipcMain.on('maximize-window', () => {
            if (this.mainWindow.isMaximized()) {
                this.mainWindow.unmaximize();
            } else {
                this.mainWindow.maximize();
            }
        });
        ipcMain.on('close-window', () => this.mainWindow.close());

        ipcMain.on('show-main-menu', () => {
            const menuTemplate = [
                {
                    label: 'History',
                    click: () => this._createNewTab({
                        url: `file://${path.join(__dirname, 'history.html')}`,
                        title: 'History',
                        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
                    })
                },
                {
                    label: 'Favorites',
                    click: () => this._createNewTab({
                        url: `file://${path.join(__dirname, 'favorites.html')}`,
                        title: 'Favorites',
                        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
                    })
                }
            ];
            const menu = Menu.buildFromTemplate(menuTemplate);
            menu.popup({ window: this.mainWindow });
        });
    }
}

// Instantiate the browser to start the application
new NBrowser();
