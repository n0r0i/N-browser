const { app, BrowserWindow, BrowserView, ipcMain, session, Menu, dialog, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const axios = require('axios');
const { ElectronChromeExtensions } = require('electron-chrome-extensions');

require('events').EventEmitter.defaultMaxListeners = 20; // Suppress MaxListenersExceededWarning
const database = require('./database.js');

class NBrowser {
    constructor() {
        this.mainWindow = null;
        this.menuWindow = null;
        this.views = new Map();
        this.activeTabId = null;
        this.isFullscreen = false;
        this.extensions = null;

        this._init();
    }

    _init() {
        app.whenReady().then(async () => {
            const browserSession = session.fromPartition('persist:browser');
            browserSession.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36");

            this.extensions = new ElectronChromeExtensions({
                session: browserSession,
                license: 'GPL-3.0',
                createTab: async (details) => {
                    const { view, viewId } = this._createNewTab({ url: details.url });
                    return [view.webContents, this.mainWindow];
                },
                selectTab: (webContents, browserWindow) => {
                    for (const [viewId, view] of this.views.entries()) {
                        if (view.webContents === webContents) {
                            this._switchToTab(viewId);
                            break;
                        }
                    }
                },
                removeTab: (webContents, browserWindow) => {
                    for (const [viewId, view] of this.views.entries()) {
                        if (view.webContents === webContents) {
                            this._closeTab(viewId);
                            break;
                        }
                    }
                },
            });

            await database.initDb();

            this._createWindow();
            this._setupIpcListeners();

            try {
                await browserSession.loadExtension(path.join(__dirname, 'ublock-origin'));
            } catch (e) {
                console.error('Failed to load extension', e);
            }

            app.on('activate', () => {
                if (BrowserWindow.getAllWindows().length === 0) this._createWindow();
            });

            browserSession.on('will-download', async (event, item, webContents) => {
                event.preventDefault();

                const filename = item.getFilename();
                const url = item.getURL();

                try {
                    const { canceled, filePath } = await dialog.showSaveDialog({
                        title: 'Save File',
                        defaultPath: filename,
                        buttonLabel: 'Save'
                    });

                    if (canceled || !filePath) {
                        return;
                    }

                    this.mainWindow.webContents.send('download-progress', { filename, progress: 0 });

                    const response = await axios({
                        method: 'get',
                        url: url,
                        responseType: 'stream',
                    });

                    const writer = fs.createWriteStream(filePath);
                    const totalBytes = parseInt(response.headers['content-length'], 10);
                    let receivedBytes = 0;

                    response.data.on('data', (chunk) => {
                        receivedBytes += chunk.length;
                        const progress = receivedBytes / totalBytes;
                        this.mainWindow.webContents.send('download-progress', { filename, progress });
                    });

                    database.addDownload({
                        filename: filename,
                        url: url,
                        save_path: filePath,
                        total_bytes: totalBytes,
                        state: 'progressing'
                    });

                    response.data.pipe(writer);

                    writer.on('finish', () => {
                        this.mainWindow.webContents.send('download-complete', { filename, state: 'completed' });
                        database.updateDownloadState(filename, 'completed');
                        this.mainWindow.webContents.send('refresh-data');
                    });

                    writer.on('error', (err) => {
                        console.error('File write error:', err);
                        this.mainWindow.webContents.send('download-complete', { filename, state: 'interrupted' });
                        database.updateDownloadState(filename, 'interrupted');
                        this.mainWindow.webContents.send('refresh-data');
                    });

                } catch (err) {
                    console.error('[Download Error]', err.message);
                    this.mainWindow.webContents.send('download-complete', { filename, state: 'interrupted' });
                }
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
                session: session.fromPartition('persist:browser'),
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

        this.mainWindow.webContents.once('did-finish-load', () => {
            this._createNewTab();
        });
    }

    _updateViewBounds() {
        if (!this.mainWindow || this.mainWindow.isDestroyed() || !this.activeTabId) return;

        const activeView = this.views.get(this.activeTabId);
        if (activeView) {
            const [width, height] = this.mainWindow.getContentSize();

            if (this.isFullscreen) {
                activeView.setBounds({ x: 0, y: 0, width: width, height: height });
            } else {
                const navBarHeight = 85;
                activeView.setBounds({ x: 0, y: navBarHeight, width: width, height: height - navBarHeight });
            }
        }
    }

    _createNewTab(options = {}) {
        const { url = 'https://www.google.com', title = 'Nova Aba', webPreferences = {} } = options;

        const browserSession = session.fromPartition('persist:browser');
        const viewId = Date.now().toString();
        const view = new BrowserView({
            webPreferences: {
                ...webPreferences,
                session: browserSession,
                contextIsolation: true,
            }
        });
        this.views.set(viewId, view);

        this.extensions.addTab(view.webContents, this.mainWindow);

        view.webContents.loadURL(url);

        view.webContents.on('page-title-updated', (event, title) => {
            this.mainWindow.webContents.send('tab-title-updated', { viewId, title });
        });
        view.webContents.on('page-favicon-updated', (event, favicons) => {
            if (favicons && favicons.length > 0) {
                this.mainWindow.webContents.send('favicon-updated', { viewId, faviconUrl: favicons[0] });
            }
        });
        view.webContents.on('did-navigate', (event, url) => {
            console.log(`[main.js] did-navigate: view ${viewId} navigated to ${url}. Sending url-updated.`);
            this.mainWindow.webContents.send('url-updated', { viewId, url });
            const title = view.webContents.getTitle();
            database.addHistory(url, title);
        });

        view.webContents.on('did-navigate-in-page', (event, url) => {
            this.mainWindow.webContents.send('url-updated', { viewId, url });
            setTimeout(() => {
                const title = view.webContents.getTitle();
                console.log(`[main.js] did-navigate-in-page: view ${viewId} navigated to ${url} with title "${title}".`);
                database.addHistory(url, title);
            }, 150);
        });

        view.webContents.on('context-menu', (e, params) => {
            const menuItems = this.extensions.getContextMenuItems(view.webContents, params);
            const menu = Menu.buildFromTemplate([
                { label: 'Voltar', click: () => view.webContents.goBack(), enabled: view.webContents.canGoBack() },
                { label: 'Avançar', click: () => view.webContents.goForward(), enabled: view.webContents.canGoForward() },
                { label: 'Recarregar', click: () => view.webContents.reload() },
                { type: 'separator' },
                ...menuItems,
                { type: 'separator' },
                { label: 'Inspecionar', click: () => view.webContents.openDevTools({ mode: 'undocked' }) }
            ]);
            menu.popup({ window: this.mainWindow });
        });

        view.webContents.on('enter-html-full-screen', () => {
            this.isFullscreen = true;
            this.mainWindow.setFullScreen(true);
            this.mainWindow.webContents.send('enter-fullscreen');
            this._updateViewBounds();
        });

        view.webContents.on('leave-html-full-screen', () => {
            this.isFullscreen = false;
            this.mainWindow.setFullScreen(false);
            this.mainWindow.webContents.send('leave-fullscreen');
            this._updateViewBounds();
        });

        this._switchToTab(viewId);
        this.mainWindow.webContents.send('tab-created', { viewId, title: 'Nova Aba' });

        return { view, viewId };
    }

    _switchToTab(viewId) {
        if (!this.views.has(viewId)) return;

        this.activeTabId = viewId;
        const view = this.views.get(this.activeTabId);

        this.mainWindow.setBrowserView(view);
        this._updateViewBounds();

        this.extensions.selectTab(view.webContents);

        this.mainWindow.webContents.send('tab-switched', viewId);

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
                this._createNewTab();
            }
        }
    }

    _setupIpcListeners() {
        ipcMain.on('create-new-tab', () => this._createNewTab({})); // Pass empty options for default behavior
        ipcMain.on('switch-to-tab', (event, viewId) => this._switchToTab(viewId));
        ipcMain.on('close-tab', (event, viewId) => this._closeTab(viewId));

        ipcMain.on('open-downloads-page', () => {
            this._createNewTab({
                url: `file://${path.join(__dirname, 'downloads.html')}`,
                title: 'Downloads',
                webPreferences: {
                    preload: path.join(__dirname, 'preload.js'),
                    contextIsolation: true,
                }
            });
        });

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

        ipcMain.on('get-history-data', async (event, searchTerm) => {
            const history = await database.getHistory(searchTerm);
            event.sender.send('history-data', history);
        });

        ipcMain.handle('search-history', async (event, term) => {
            console.log(`[main.js] IPC handler 'search-history' invoked with term: "${term}"`);
            if (!term || term.trim() === '') {
                return [];
            }
            try {
                const suggestions = await database.searchHistoryForSuggestions(term);
                console.log(`[main.js] Returning ${suggestions.length} suggestions to renderer.`);
                return suggestions;
            } catch (error) {
                console.error('[IPC Error] Failed to search history:', error);
                return []; // Return empty array on error
            }
        });

        ipcMain.on('get-favorites-data', async (event) => {
            console.log('[main.js] Received request for favorites data.');
            const favorites = await database.getFavorites();
            console.log(`[main.js] Got ${favorites.length} favorites items from DB. Sending to renderer.`);
            event.sender.send('favorites-data', favorites);
        });

        ipcMain.on('get-downloads-data', async (event) => {
            console.log('[main.js] Received request for downloads data.');
            const downloads = await database.getDownloads();
            console.log(`[main.js] Got ${downloads.length} downloads items from DB. Sending to renderer.`);
            event.sender.send('downloads-data', downloads);
        });

        ipcMain.on('delete-history-item', (event, id) => {
            database.deleteHistory(id);
            event.sender.send('refresh-data');
        });

        ipcMain.on('delete-favorite-item', (event, id) => {
            database.deleteFavorite(id);
            event.sender.send('refresh-data');
        });

        ipcMain.on('clear-history-by-keyword', (event, keyword) => {
            database.clearHistoryByKeyword(keyword);
            event.sender.send('refresh-data');
        });

        ipcMain.on('clear-history-by-time', (event, time) => {
            database.clearHistoryByTime(time);
            event.sender.send('refresh-data');
        });

        ipcMain.on('delete-download-item', (event, id) => {
            database.deleteDownload(id);
            event.sender.send('refresh-data');
        });

        ipcMain.on('open-download-folder', (event, filePath) => {
            shell.showItemInFolder(filePath);
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
        ipcMain.on('nav-load-url', (event, url) => {
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
            // This now creates a custom HTML-based menu window
            if (this.menuWindow && !this.menuWindow.isDestroyed()) {
                this.menuWindow.close();
            }
            const [winX, winY] = this.mainWindow.getPosition();
            const navBarHeight = 40; // Approximate height of the top bar
            this.menuWindow = new BrowserWindow({
                parent: this.mainWindow,
                x: winX + this.mainWindow.getBounds().width - 250, // Position near the menu button
                y: winY + navBarHeight + 50,
                width: 240,
                height: 100, // Adjusted height for two items
                frame: false,
                transparent: true,
                alwaysOnTop: true,
                resizable: false,
                show: false,
                webPreferences: {
                    preload: path.join(__dirname, 'preload-popup.js')
                }
            });
            this.menuWindow.loadFile(path.join(__dirname, 'menu.html'));
            this.menuWindow.once('ready-to-show', () => this.menuWindow.show());
            this.menuWindow.on('blur', () => {
                if (this.menuWindow && !this.menuWindow.isDestroyed()) {
                    this.menuWindow.close();
                }
            });
        });
    }
}

// Instantiate the browser to start the application
new NBrowser();
