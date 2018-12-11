'use strict'

require('electron-reload')(__dirname)

const {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  Menu,
  shell
} = require('electron')

const menu = Menu.buildFromTemplate([{
  label: 'Window',
  submenu: [{
    label: 'New Window',
    accelerator: 'Ctrl+N',
    click: createWindow
  }, {
    label: 'Change Root',
    accelerator: 'Ctrl+O',
    click: (item, window) => {
      window.webContents.send('Change XML Root Directory')
    }
  }, {
    label: 'Change Database',
    accelerator: 'Ctrl+D',
    click: (item, window) => {
      window.webContents.send('Change MySQL Database')
    }
  }, {
    label: 'Force Reload',
    role: 'forceReload',
    accelerator: 'Ctrl+R'
  }, {
    type: 'separator'
  }, {
    label: 'Minimize',
    role: 'minimize'
  }, {
    label: 'Close',
    role: 'close',
    accelerator: 'Ctrl+F4'
  }, {
    label: 'Close All',
    role: 'quit',
    accelerator: 'Alt+F4'
  }]
}, {
  label: 'Edit',
  submenu: [{
    label: 'Copy',
    role: 'copy',
    accelerator: 'Ctrl+C'
  }, {
    label: 'Paste',
    role: 'paste',
    accelerator: 'Ctrl+V'
  }]
}, {
  label: 'View',
  submenu: [{
    label: 'Zoom In',
    role: 'zoomIn'
  }, {
    label: 'Zoom Out',
    role: 'zoomOut'
  }, {
    label: 'Zoom Reset',
    role: 'resetZoom',
    accelerator: 'Ctrl+0'
  }, {
    label: 'Full Screen On/Off',
    role: 'toggleFullScreen',
    accelerator: 'F11'
  }, {
    label: 'Dev Tools On/Off',
    role: 'toggleDevTools',
    accelerator: 'F12'
  }]
}, {
  label: 'Help',
  submenu: [{
    label: `About ${app.getName()}`,
    role: 'about'
  }]
}])
Menu.setApplicationMenu(menu)

let windows = []

function createWindow(folder, file) {
  let window = new BrowserWindow({
    show: false
  })
  window.loadFile('src/index.html')
  window.webContents.on('did-finish-load', function () {
    window.maximize();
  });

  window.on('closed', _ => windows.splice(windows.indexOf(window), 1))

  windows.push(window)
}

app.on('ready', () => {
  createWindow()
})

app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (!windows.length) {
    createWindow()
  }
})

ipcMain.on('datalist focused', (event, left, top) => {
  console.log(left, top);
  event.sender.sendInputEvent({
    type: 'mouseDown',
    x: left + 1,
    y: top + 1
  })
})