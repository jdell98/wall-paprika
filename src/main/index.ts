import { app, Tray, Menu, ipcMain, nativeImage } from 'electron';
import path from 'node:path';

let tray: Tray | null = null;

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
        // no-op for now
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

  createTray();

  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });
});

app.on('window-all-closed', () => {
  // Keep running — menu bar app
});
