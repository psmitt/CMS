const electron = require('electron')

// const app = electron.app
// const BrowserWindow = electron.BrowserWindow
const { app, BrowserWindow, globalShortcut, shell } = require('electron')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow()
  mainWindow.maximize()

  // and load the index.html of the app.
  // mainWindow.loadFile('src/index.html')
  // mainWindow.loadFile('C:\\inetpub\\xmlroot\\HUN\\Menu\\3. Tables.xml')
  // mainWindow.loadURL('file://C:\\inetpub\\xmlroot\\HUN\\Menu\\3. Tables.xml')
  mainWindow.loadURL(`file://${__dirname}/Menu/Menu.html`)

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // IPC demo
  // const ipc = electron.ipcMain
  // const countdown = require('./IPC/javascript-module')
  // const windows = [];
  // [1, 2, 3].forEach(_ => {
  //   let win = new BrowserWindow({ width: 400, height: 400 })
  //   win.loadURL(`file://${__dirname}/IPC/event.html`)
  //   win.on('close', _ => { mainWindow = null })
  //   windows.push(win)
  // })
  // ipc.on('May I start countdown?', _ => {
  //   countdown(count => {
  //     windows.forEach(win => {
  //       if ( mainWindow )
  //         win.webContents.send('Yes, start countdown now!', count)
  //     })
  //   })
  // })

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
  globalShortcut.register('Alt+F4', () => {
    console.log('Alt+F4')
  })
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
