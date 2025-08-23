const { app, BrowserWindow } = require('electron')
const { ElectronChromeExtensions } = require('electron-chrome-extensions')

(async function main() {
  await app.whenReady()

  try {
    console.log('Minimal Test: Instantiating ElectronChromeExtensions...');
    const extensions = new ElectronChromeExtensions();
    console.log('Minimal Test: Instantiation successful.');

    const browserWindow = new BrowserWindow();
    console.log('Minimal Test: BrowserWindow created.');

    // Adds the active tab of the browser
    extensions.addTab(browserWindow.webContents, browserWindow);
    console.log('Minimal Test: Tab added to extensions.');

    browserWindow.loadURL('https://www.google.com');
    browserWindow.show();
    console.log('Minimal Test: Window loaded and shown.');
  } catch (error) {
    console.error('Minimal Test Failed:', error);
  }
}())
