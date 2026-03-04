import { app, Tray, Menu, BrowserWindow, ipcMain, nativeImage, shell } from 'electron';
import path from 'node:path';
import { store } from './store';
import { registerIpcHandlers } from './ipc';

let tray: Tray | null = null;
let preferencesWindow: BrowserWindow | null = null;

function createPreferencesWindow(): void {
  if (preferencesWindow) {
    preferencesWindow.show();
    preferencesWindow.focus();
    return;
  }

  preferencesWindow = new BrowserWindow({
    width: 520,
    height: 480,
    show: false,
    resizable: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    preferencesWindow.loadURL('http://localhost:9000');
  } else {
    preferencesWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  preferencesWindow.once('ready-to-show', () => {
    preferencesWindow?.show();
  });

  preferencesWindow.on('closed', () => {
    preferencesWindow = null;
  });

  preferencesWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createTray(): void {
  const iconPath = path.join(__dirname, '../../assets/trayTemplate.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip('Wall Paprika');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Current: No wallpaper set',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Next wallpaper',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Preferences...',
      click: () => {
        createPreferencesWindow();
      },
    },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    app.dock.hide();
  }

  registerIpcHandlers();

  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  createTray();

  if (!store.get('setupComplete')) {
    createPreferencesWindow();
  }
});

app.on('window-all-closed', () => {
  // Keep running — menu bar app
});
