'use strict'

require('electron-reload')(__dirname)

const {
  app,
  BrowserWindow,
  globalShortcut,
  Menu,
  shell
} = require('electron')

const menu = Menu.buildFromTemplate([{
  label: 'Window',
  submenu: [{
    label: 'New',
    accelerator: 'Ctrl+N'
  }, {
    label: 'Change Root',
    accelerator: 'Ctrl+O',
    click: (item, window) => {
      window.webContents.send('Change Root')
    },
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

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow()
  mainWindow.maximize()

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  mainWindow.loadFile('src/index.html')

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow()
})

// Quit when all windows are closed.
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
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.