const os = require('os')
const fs = require('fs')
const path = require('path')
const ipc = require('electron').ipcRenderer

var rootDir
var mysql_pool

function openNewWindow(folder, filename) {
  ipc.send('New Window', folder, filename)
}

function listDirectory(folder) {
  let entries = fs.readdirSync(path.join(rootDir, folder))
  let filenames = []
  for (let entry of entries)
    if (fs.statSync(path.join(rootDir, folder, entry)).isFile())
      filenames.push(entry)
  return filenames
}

function readXMLFile(folder, filename) {
  let xmlString = fs.readFileSync(path.join(rootDir, folder, filename), 'utf8')
  return new DOMParser().parseFromString(
    xmlString.charCodeAt(0) === 0xFEFF ? // BOM
    xmlString.substring(1) : xmlString, 'text/xml')
}

function runSQLQueries(queries, output, dsn = '', user = '', pass = '') {
  if (!dsn || !user || !pass) { // MySQL queries
    mysql_pool.getConnection((error, cmdb) => {
      if (error) throw error
      cmdb.query({
        sql: queries,
        nestTables: '.'
      }, (error, result, fields) => {
        if (error) throw error
        for (let row of result[result.length - 1]) {
          let dataRow = []
          for (let data in row) {
            if (row[data]) {
              if (row[data] instanceof Date)
                dataRow.push(row[data].toISOString().substring(0, 10))
              else
                dataRow.push(row[data].toString())
            } else { // null or emtpy string
              dataRow.push('')
            }
          }
          dataRow.push(true) // display flag
          output.push(dataRow)
        }
        cmdb.release()
      })
    })
  }
}

// Set root directory and database on startup
document.addEventListener('DOMContentLoaded', _ => {
  if (fs.existsSync(path.join(os.homedir(), '.cms', 'lastRoot.txt'))) {
    let lastRoot = fs.readFileSync(path.join(os.homedir(), '.cms', 'lastRoot.txt'), 'utf8')
    if (fs.statSync(lastRoot).isDirectory())
      changeRoot(lastRoot)
  } else {
    fs.mkdirSync(path.join(os.homedir(), '.cms'))
    changeRoot()
  }

  let basename = path.basename(rootDir)
  alert(basename)

  if (fs.existsSync(path.join(os.homedir(), '.cms', 'lastDatabase.txt'))) {
    let lastDatabaseServer = fs.readFileSync(path.join(os.homedir(), '.cms', 'lastDatabase.txt'), 'utf8')
    mysql.createConnection({
      "host": lastDatabaseServer,
      "database": basename,
      "user": `${basename}_Admin`,
      "password": require('md5')(`${basename}_Admin`)
    }).connect(error => {
      if (error) throw error
      fs.mkdirSync(path.join(os.homedir(), '.cms'))
      changeDatabase()
    })
  }

  // maximizeNavigationBar()
});

/* ROOT DIRECTORY AND DATABASE */

const remote = require('electron').remote
const dialog = remote.dialog
const currentWindow = remote.getCurrentWindow()

ipc.on('Change Root', _ => (changeRoot()))

function changeRoot(folder) {
  if (folder) { // lastRoot
    rootDir = folder
  } else {
    folder = dialog.showOpenDialog(currentWindow, {
      title: 'Select Country Folder for CMS',
      properties: ['openDirectory'],
      multiSelections: false
    })
    if (!folder && !rootDir)
      currentWindow.close()

    fs.writeFileSync(path.join(os.homedir(), '.cms', 'lastRoot.txt'), folder, 'utf8')
    if (rootDir) { // change rootDir
      rootDir = folder
      currentWindow.loadFile('src/index.html')
    } else {
      rootDir = folder
    }
  }
}

ipc.on('Change Database', _ => (changeDatabase()))

function changeDatabase(server) {
  let lastDatabase = server
  if (!lastDatabase)
    server = prompt("Please enter the name of MySQL database server", "Server Name:");

  if (server) {
    fs.writeFileSync(path.join(os.homedir(), '.cms', 'lastDatabase.txt'), server, 'utf8')

    mysql_pool = require('mysql').createPool({
      "host": server,
      "database": rootDir,
      "user": `${rootDir}_Admin`,
      "password": require('md5')(`${rootDir}_Admin`),
      "supportBigNumbers": true,
      "multipleStatements": true
    })

    if (lastDatabase)
      currentWindow.loadFile('src/index.html')
  }
}