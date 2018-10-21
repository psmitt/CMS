// GLOBAL DECLARATIONS
const os = require('os')
const fs = require('fs')
const path = require('path')
const mysql = require('mysql')
const md5 = require('md5')
const remote = require('electron').remote
const ipc = require('electron').ipcRenderer
const dialog = remote.dialog
const currentWindow = remote.getCurrentWindow()

var rootDir
var mysql_pool

function changeRoot(folder) {
  if (!folder) {
    let folders = dialog.showOpenDialog(currentWindow, {
      title: 'Select Country Folder for CMS',
      properties: ['openDirectory']
    })
    if (folders) {
      folder = folders[0]
    }
  }
  rootDir = folder
  if (!rootDir)
    currentWindow.close()
  else {
    fs.writeFile(path.join(os.homedir(), '.cms', 'lastpath.txt'), rootDir, 'utf8', (error) => {
      if (error) throw error
    })
    fs.readFile(path.join(rootDir, 'cmdb'), 'utf8', (error, cmdb) => {
      if (error) throw error
      let server = JSON.parse(cmdb)
      server.user = server.database.toUpperCase() + '_Admin'
      server.password = md5(server.user)
      server.supportBigNumbers = true
      mysql_pool = mysql.createPool(server)
    })
    loadMenuFiles(path.join(rootDir, 'Menu'))
  }
}

if (fs.existsSync(path.join(os.homedir(), '.cms', 'lastpath.txt'))) {
  changeRoot(fs.readFileSync(path.join(os.homedir(), '.cms', 'lastpath.txt'), 'utf8'))
} else {
  fs.mkdir(path.join(os.homedir(), '.cms'), (error) => {
    if (error) throw error
  })
  changeRoot()
}

ipc.on('Change Root', changeRoot)

$(document).on('keypress', event => {
  if (event.ctrlKey && event.originalEvent.code === 'KeyF')
    $('#search').focus()
});

/*
var mysql_pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'cmdb_mine',
  database: 'hun'
})
*/