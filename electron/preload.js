const { contextBridge } = require('electron');

// Expose safe desktop info to renderer if needed
contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,
});
