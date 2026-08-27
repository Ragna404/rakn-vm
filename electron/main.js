const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
const http = require('http');

// Express application
const expressApp = require('../server/server.js');

let mainWindow = null;
let serverInstance = null;
const PORT = process.env.PORT || 3000;

function startServer() {
  return new Promise((resolve, reject) => {
    // If already running or listening
    try {
      serverInstance = http.createServer(expressApp);
      serverInstance.listen(PORT, '127.0.0.1', () => {
        console.log(`[Electron] Internal server running at http://127.0.0.1:${PORT}`);
        resolve();
      });
      serverInstance.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`[Electron] Port ${PORT} already in use, assuming server is ready.`);
          resolve();
        } else {
          reject(err);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0f1120',
    title: 'OMARCHY VM',
    autoHideMenuBar: true,
    show: false, // Don't show until ready-to-show
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  // Remove default menu for seamless dark terminal look
  Menu.setApplicationMenu(null);

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links (e.g. Google Cloud Console link in login screen)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      // Don't intercept Google OAuth popup / redirects
      if (url.includes('accounts.google.com') || url.includes('oauth2')) {
        return { action: 'allow' };
      }
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await startServer();
    createWindow();
  } catch (err) {
    console.error('[Electron] Failed to start:', err);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverInstance) {
      serverInstance.close();
    }
    app.quit();
  }
});
