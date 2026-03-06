import { app, Tray, Menu, BrowserWindow, ipcMain, nativeImage, shell, powerMonitor } from 'electron';
import path from 'node:path';
import { store } from './store';
import { registerIpcHandlers } from './ipc';
import { rotateWallpaper } from './rotation';
import { ensureBatchDir, fillBatch, getBatchCount } from './batch-manager';
import { getRateLimit } from './unsplash';
import { scheduler } from './scheduler';
import { shortcutManager } from './shortcuts';
import { initLogger } from './logger';

let tray: Tray | null = null;
let preferencesWindow: BrowserWindow | null = null;

function createPreferencesWindow(): void {
  if (preferencesWindow) {
    preferencesWindow.show();
    preferencesWindow.focus();
    return;
  }

  preferencesWindow = new BrowserWindow({
    width: 560,
    height: 520,
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

  let currentLabel: string;
  if (currentPhoto) {
    const desc = currentPhoto.description || 'Untitled';
    const full = `Current: "${desc}" by ${currentPhoto.photographerName}`;
    currentLabel = full.length > 32 ? full.slice(0, 32) + '...' : full;
  } else if (!hasCollections) {
    currentLabel = 'Current: Add collections in Preferences';
  } else {
    currentLabel = 'Current: No wallpaper set';
  }

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

  const rateLimit = getRateLimit();
  const rateLimitLabel = `API: ${rateLimit.remaining}/${rateLimit.limit} requests left`;

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
      label: rateLimitLabel,
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
    const result = await fillBatch();
    if (result.attempted > 0 && result.succeeded === 0) {
      console.error('[startup] Batch fill failed completely — check network');
    }
  }

  // Set first wallpaper if none is currently set
  if (!store.get('currentWallpaperPath')) {
    const success = await rotateWallpaper();
    if (success) {
      updateTrayMenu();
    }
  }

  // Register global hotkey
  shortcutManager.register();

  // Start the scheduler
  scheduler.handleResume();

  // React to store changes
  store.onDidChange('rotationInterval', () => {
    scheduler.restart();
  });

  store.onDidChange('paused', (paused) => {
    if (paused) {
      scheduler.stop();
    } else {
      scheduler.start();
    }
  });

  // Handle wake from sleep
  powerMonitor.on('resume', () => {
    scheduler.handleResume();
  });
}

app.whenReady().then(() => {
  initLogger();

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

app.on('will-quit', () => {
  shortcutManager.unregister();
});

app.on('window-all-closed', () => {
  // Keep running — menu bar app
});
