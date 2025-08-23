const { app, BrowserWindow, session } = require('electron');
const { ElectronChromeExtensions } = require('electron-chrome-extensions');
const path = require('node:path');

async function main() {
  await app.whenReady();

  try {
    console.log('Minimal Test: Instantiating ElectronChromeExtensions...');
    const extensions = new ElectronChromeExtensions();
    console.log('Minimal Test: Instantiation successful.');

    console.log('Minimal Test: Loading uBlock Origin...');
    await session.defaultSession.loadExtension(path.join(__dirname, 'ublock-origin'), { allowFileAccess: true });
    console.log('Minimal Test: uBlock Origin loaded.');

    const browserWindow = new BrowserWindow({
      webPreferences: {
        // The "Advanced" example uses a custom session, but for this test,
        // we stick to the default session to keep it minimal.
        // The BrowserWindow needs to know about the session extensions are in.
        session: session.defaultSession
      }
    });
    console.log('Minimal Test: BrowserWindow created.');

    extensions.addTab(browserWindow.webContents, browserWindow);
    console.log('Minimal Test: Tab added to extensions.');

    browserWindow.loadURL('https://www.google.com');
    browserWindow.show();
    console.log('Minimal Test: Window loaded and shown.');
  } catch (error) {
    console.error('Minimal Test Failed:', error);
  }
}

main();
