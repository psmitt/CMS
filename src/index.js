// GLOBAL DECLARATIONS
const os = require('os')
const fs = require('fs')
const path = require('path')
const remote = require('electron').remote
const ipc = require('electron').ipcRenderer
const dialog = remote.dialog
const currentWindow = remote.getCurrentWindow()

var rootDir

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

const mysql = require('mysql')
var cmdb = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'cmdb_mine',
  database: 'hun'
})