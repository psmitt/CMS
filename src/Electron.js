const os = require('os')
const fs = require('fs')
const path = require('path')
const ipc = require('electron').ipcRenderer

var Profile // Local CMS profile folder
var XMLRootDirectory // CMS country folder with XML subfolders
var MySQL_Pool // CMDB connection pool

document.addEventListener('DOMContentLoaded', _ => {
  Profile = path.join(os.homedir(), '.cms')
  if (!fs.statSync(Profile).isDirectory())
    fs.mkdirSync(Profile)

  let lastXMLRootDirectory = path.join(Profile, 'lastXMLRootDirectory.txt')
  if (fs.existsSync(lastXMLRootDirectory)) {
    let lastDirectory = fs.readFileSync(lastXMLRootDirectory, 'utf8')
    if (fs.statSync(lastDirectory).isDirectory())
      changeXMLRootDirectory(lastDirectory)
  } else {
    changeXMLRootDirectory()
  }
});

const remote = require('electron').remote
const dialog = remote.dialog
const currentWindow = remote.getCurrentWindow()

ipc.on('Change XML Root Directory', _ => (changeXMLRootDirectory()))

function changeXMLRootDirectory(folder) {
  folder = folder || dialog.showOpenDialog(currentWindow, {
    title: 'Select Country Folder for CMS',
    properties: ['openDirectory'],
    multiSelections: false
  })

  if (!folder && !XMLRootDirectory) {
    currentWindow.close()
    return
  }

  XMLRootDirectory = folder
  fs.writeFileSync(path.join(Profile, 'lastXMLRoot.txt'), XMLRootDirectory, 'utf8')

  let lastDatabaseServer = path.join(Profile, 'lastDatabaseServer.txt')
  changeMySQLDatabase(!MySQL_Pool && fs.existsSync(lastDatabaseServer) ?
    fs.readFileSync(lastDatabaseServer, 'utf8') : false
  )
}

const mysql = require('mysql')

ipc.on('Change MySQL Database', _ => (changeMySQLDatabase()))

function changeMySQLDatabase(server) {
  let basename = path.basename(XMLRootDirectory)
  let connectionObject = {
    host: server || prompt("Please enter the name of MySQL database server", "Server Name:"),
    database: basename,
    user: `${basename}_Admin`,
    password: require('md5')(`${basename}_Admin`),
    supportBigNumbers: true,
    multipleStatements: true
  }
  mysql.createConnection(connectionObject).connect(error => {
    if (error) throw error
    let oldPool = new Boolean(MySQL_Pool)
    if (oldPool)
      MySQL_Pool.end()
    MySQL_Pool = mysql.createPool(connectionObject)
    fs.writeFileSync(path.join(Profile, 'lastDatabaseServer.txt'), connectionObject.host, 'utf8')
    if (oldPool)
      currentWindow.loadFile('src/index.html')
  })
}

function openNewWindow(folder, filename) {
  ipc.send('New Window', folder, filename)
}

function listDirectory(folder) {
  let entries = fs.readdirSync(path.join(XMLRootDirectory, folder))
  let filenames = []
  for (let entry of entries)
    if (fs.statSync(path.join(XMLRootDirectory, folder, entry)).isFile())
      filenames.push(entry)
  return filenames
}

function readXMLFile(folder, filename) {
  let xmlString = fs.readFileSync(path.join(XMLRootDirectory, folder, filename), 'utf8')
  return new DOMParser().parseFromString(
    xmlString.charCodeAt(0) === 0xFEFF ? // BOM
    xmlString.substring(1) : xmlString, 'text/xml')
}

function runSQLQueries(queries, output, dsn = '', user = '', pass = '') {
  if (!dsn || !user || !pass) { // MySQL queries
    MySQL_Pool.getConnection((error, cmdb) => {
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