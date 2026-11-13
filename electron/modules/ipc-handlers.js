const { ipcMain } = require('electron');

function setupIpcHandlers(app, isDev) {
  ipcMain.on('get-user-data-path', event => {
    event.returnValue = app.getPath('userData');
  });

  ipcMain.handle('check-update', async () => {
    return {
      hasUpdate: false,
      currentVersion: require('electron').app.getVersion(),
      disabled: true,
      message: '魔改版应用不支持自动更新，请向发行方索要最新安装包'
    };
  });

  ipcMain.handle('download-update', async () => {
    return { success: false, disabled: true };
  });

  ipcMain.handle('install-update', () => {
    return { success: false, disabled: true };
  });
}

module.exports = {
  setupIpcHandlers
};
