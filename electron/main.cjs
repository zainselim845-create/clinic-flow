const { app, BrowserWindow, ipcMain, shell, Notification, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;
let tray = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: 'ClinicFlow - كلينك فلو لإدارة العيادات',
    backgroundColor: '#09090b',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });

  // Gracefully show window when ready to avoid white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external navigation in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Load URL or File
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // In production, load the built index.html from dist
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  // Handle minimize to tray or close
  mainWindow.on('close', (event) => {
    // Allow closing normally unless tray minimize is desired
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    return mainWindow.isMaximized();
  }
  return false;
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('printer:getList', async () => {
  if (!mainWindow) return [];
  try {
    return await mainWindow.webContents.getPrintersAsync();
  } catch (err) {
    console.error('[Electron] Error fetching printers:', err);
    return [];
  }
});

ipcMain.handle('printer:printDirect', async (event, options = {}) => {
  if (!mainWindow) return { success: false, error: 'No active window' };
  return new Promise((resolve) => {
    const printOptions = {
      silent: Boolean(options.silent),
      printBackground: true,
      deviceName: options.printerName || '',
      color: true,
      margins: { marginType: 'none' },
      landscape: Boolean(options.landscape),
      pagesPerSheet: 1,
      collate: true,
      copies: options.copies || 1,
      header: '',
      footer: '',
      ...options
    };

    mainWindow.webContents.print(printOptions, (success, failureReason) => {
      if (!success) {
        console.warn('[Electron] Print failed:', failureReason);
        resolve({ success: false, error: failureReason });
      } else {
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle('system:notify', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title || 'ClinicFlow',
      body: body || '',
      icon: path.join(__dirname, '../public/favicon.ico')
    }).show();
    return true;
  }
  return false;
});

ipcMain.handle('system:openExternal', async (event, url) => {
  try {
    await shell.openExternal(url);
    return true;
  } catch (err) {
    return false;
  }
});

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

// App Lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Second instance focus
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
