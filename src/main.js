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
    click: () => createWindow(false)
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

function createWindow(openerScript) {
  let window = new BrowserWindow({
    show: false
  })
  window.loadFile('src/index.html')
  window.webContents.on('did-finish-load', function () {
    window.webContents.executeJavaScript(openerScript || '')
    window.maximize()
  })
  window.on('closed', () => windows.splice(windows.indexOf(window), 1))
  windows.push(window)
}

app.on('ready', () => {
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('activate', () => {
  if (!windows.length) {
    createWindow()
  }
})

ipcMain.on('New Window', (event, openerScript) => createWindow(openerScript))