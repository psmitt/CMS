const Electron = true
const IIS = false

const os = require('os')
const fs = require('fs')
const path = require('path')
const shell = require("electron").shell
const ipc = require('electron').ipcRenderer

var Profile // Local CMS profile folder
var XMLRootDirectory // CMS country folder with XML subfolders
var MySQL_Pool // CMDB connection pool

document.addEventListener('DOMContentLoaded', _ => {
  Profile = path.join(os.homedir(), '.cms')
  if (!fs.existsSync(Profile) || !fs.statSync(Profile).isDirectory())
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
    properties: ['openDirectory']
  })[0]

  if (!folder && !XMLRootDirectory) {
    currentWindow.close()
    return
  }

  XMLRootDirectory = folder
  fs.writeFileSync(path.join(Profile, 'lastXMLRootDirectory.txt'), XMLRootDirectory, 'utf8')
  loadMenuFiles()

  let lastDatabaseServer = path.join(Profile, 'lastDatabaseServer.txt')
  changeMySQLDatabase(!MySQL_Pool && fs.existsSync(lastDatabaseServer) ?
    fs.readFileSync(lastDatabaseServer, 'utf8') : false
  )
}

const mysql = require('mysql')
const prompt = require('electron-prompt')

ipc.on('Change MySQL Database', _ => (changeMySQLDatabase()))

function changeMySQLDatabase(server) {
  if (server)
    resetConnectionPool(server)
  else
    prompt({
      title: 'Server Name',
      label: 'Enter the name of MySQL database server:',
      height: 150
    }, currentWindow)
    .then(server => {
      if (server) resetConnectionPool(server)
    })
    .catch(console.error)

  function resetConnectionPool(server) {
    let basename = path.basename(XMLRootDirectory)
    let connectionObject = {
      host: server,
      database: basename,
      user: `${basename}_Admin`,
      password: require('md5')(`${basename}_Admin`),
      supportBigNumbers: true,
      multipleStatements: true
    }
    mysql.createConnection(connectionObject).connect(error => {
      if (error) {
        alert(error)
      } else {
        let oldPool = Boolean(MySQL_Pool)
        if (oldPool)
          MySQL_Pool.end()
        MySQL_Pool = mysql.createPool(connectionObject)
        fs.writeFileSync(path.join(Profile, 'lastDatabaseServer.txt'), connectionObject.host, 'utf8')
        if (oldPool)
          currentWindow.loadFile('src/index.html')
      }
    })
  }
}

function listDirectory(folder, callback) {
  fs.readdir(path.join(XMLRootDirectory, folder), (error, entries) => {
    if (error) throw error
    let filenames = []
    for (let entry of entries)
      if (fs.statSync(path.join(XMLRootDirectory, folder, entry)).isFile())
        filenames.push(entry)
    callback(filenames)
  })
}

async function readXMLFile(folder, filename, callback) {
  return new Promise((resolve, reject) => {
    fs.readFile(path.join(XMLRootDirectory, folder, filename), 'utf8', (error, xmlString) => {
      if (error) throw error
      resolve(callback(new DOMParser().parseFromString(
        xmlString.charCodeAt(0) === 0xFEFF ? // BOM
        xmlString.substring(1) : xmlString, 'text/xml')))
    })
  })
}

async function runSQLQuery(query, callback) { // query is XML object
  let get = attribute => query.attributes[attribute].value
  let connectionObject = {}
  let dbType = query.attributes['dsn'] ?
    get('dsn').substr(0, get('dsn').indexOf(':')) : 'MySQL'
  switch (dbType) {
    case 'pgsql':
      let pgDSN = get('dsn').match(/host=(\w+);port=(\w+);dbname=(\w+)/)
      connectionObject = {
        user: get('username'),
        password: get('password'),
        host: pgDSN[1],
        port: pgDSN[2],
        database: pgDSN[3]
      }
      break;
    case 'sqlsrv':
      let dsn = get('dsn').match(/Server=(\w+);Database=(\w+)/)
      connectionObject = {
        user: get('username'),
        password: get('password'),
        server: dsn[1],
        database: dsn[2]
      }
      break;
    default: // MySQL
      break;
  }
  if (query.attributes['dsn']) {
    let dsn = get('dsn')
    switch (dsn.substr(0, dsn.indexOf(':'))) {}
  }
  return new Promise((resolve, reject) => {
    switch (dbType) {
      case 'pgsql':
        const Client = require('pg').Client
        let client = new Client(connectionObject)
        client.connect()
        client.query(query.textContent, (error, result) => {
          if (error) {
            reject(client.end())
            throw error
          }
          queryResultToArray(result.rows)
          callback(result.rows)
          resolve(client.end())
        })
        break;
      case 'sqlsrv':
        let mssql = require('mssql')
        mssql.connect(connectionObject, error => {
          if (error) {
            reject(mssql.close())
            throw error
          }
          new mssql.Request().query(query.textContent, (error, result) => {
            if (error) {
              reject(mssql.close())
              throw error
            }
            queryResultToArray(result.recordset)
            callback(result.recordset)
            resolve(mssql.close())
          })
        })
        break;
      default: // MySQL
        MySQL_Pool.getConnection((error, cmdb) => {
          if (error) {
            reject(cmdb.release())
            throw error
          }
          cmdb.query({
            sql: query.textContent,
            nestTables: '.'
          }, (error, result, fields) => {
            if (error) {
              reject(cmdb.release())
              throw error
            }
            if (result.constructor.name !== 'OkPacket')
              queryResultToArray(result)
            callback(result)
            resolve(cmdb.release())
          })
        })
        break;
    }
  })
}

function queryResultToArray(result) {
  let pad = number => number <= 9 ? '0' + number : number
  let normalize = date => date.getFullYear() + '-' +
    pad(date.getMonth() + 1) + '-' + pad(date.getDate())

  for (row = 0; row < result.length; row++) {
    let packet = result[row]
    let dataRow = []
    for (let data in packet) {
      if (packet[data]) {
        if (packet[data] instanceof Date)
          dataRow.push(normalize(packet[data]))
        else
          dataRow.push(packet[data].toString())
      } else { // null or emtpy string
        dataRow.push('')
      }
    }
    result[row] = dataRow
  }
}

function load_link(URL) {
  if (URL.indexOf('HUN/') >= 0)
    shell.openItem(URL.replace('HUN', path.join(XMLRootDirectory, 'File')))
  else
    shell.openExternal(URL)
}