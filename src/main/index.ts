import { app, Tray, Menu, BrowserWindow, ipcMain, nativeImage, shell } from 'electron';
import path from 'node:path';
import { store } from './store';
import { registerIpcHandlers } from './ipc';
import { rotateWallpaper } from './rotation';
import { ensureBatchDir, fillBatch, getBatchCount } from './batch-manager';

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

function buildTrayMenu(): Menu {
  const currentPhoto = store.get('currentPhoto');
  const collections = store.get('collections');
  const hasCollections = collections.length > 0;

  const currentLabel = currentPhoto
    ? `Current: "${currentPhoto.description || 'Untitled'}" by ${currentPhoto.photographerName}`
    : 'Current: No wallpaper set';

  const menuItems: Electron.MenuItemConstructorOptions[] = [
    {
      label: currentLabel,
      enabled: false,
    },
  ];

  if (currentPhoto) {
    menuItems.push({
      label: '  View on Unsplash',
      click: () => {
        shell.openExternal(currentPhoto.unsplashUrl);
      },
    });
  }

  menuItems.push(
    { type: 'separator' },
    {
      label: 'Next wallpaper',
      enabled: hasCollections,
      click: async () => {
        const success = await rotateWallpaper();
        if (success) {
          updateTrayMenu();
        }
      },
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
  );

  return Menu.buildFromTemplate(menuItems);
}

export function updateTrayMenu(): void {
  if (!tray) return;
  tray.setContextMenu(buildTrayMenu());
}

function createTray(): void {
  const iconPath = path.join(__dirname, '../../assets/trayTemplate.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip('Wall Paprika');
  tray.setContextMenu(buildTrayMenu());
}

async function onStartup(): Promise<void> {
  ensureBatchDir();

  if (!store.get('setupComplete')) {
    createPreferencesWindow();
    return;
  }

  const collections = store.get('collections');
  if (collections.length === 0) return;

  // Fill batch if low or empty
  if (getBatchCount() < 3) {
    await fillBatch();
  }

  // Set first wallpaper if none is currently set
  if (!store.get('currentWallpaperPath')) {
    const success = await rotateWallpaper();
    if (success) {
      updateTrayMenu();
    }
  }
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

  onStartup().catch((err) => {
    console.error('[startup] Error during initialization:', err);
  });
});

app.on('window-all-closed', () => {
  // Keep running — menu bar app
});
