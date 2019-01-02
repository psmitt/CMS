const Electron = true
const IIS = false

const os = require('os')
const fs = require('fs')
const path = require('path')
const shell = require("electron").shell
const ipc = require('electron').ipcRenderer
const powershell = require('node-powershell')

let UserName = os.userInfo().username
var ServerName // MySQL server
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

  ipc.on('New Window', (callback, argument) => console.log(callback, argument))
});

const remote = require('electron').remote
const dialog = remote.dialog
const currentWindow = remote.getCurrentWindow()

function saveFavoritesToXML(xmlString, title) {
  fs.writeFileSync(path.join(XMLRootDirectory, 'Favorites', `${UserName}.xml`),
    `<?xml version="1.0" encoding="UTF-8"?>
     <!DOCTYPE menu SYSTEM "../../DTD/Menu.dtd">
     <menu title="${title || 'FAVORITES'}">
     ${xmlString}
     </menu>`, 'utf8')
}

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
  if (!fs.existsSync(path.join(XMLRootDirectory, 'Favorites', `${UserName}.xml`)))
    saveFavoritesToXML('')
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

    document.title = `CMS ${path.basename(XMLRootDirectory)} ( ${ServerName = server} )`

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

        cleanupSubtasks()
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

let XLSX = require('xlsx')
async function readXLSXFile(query, callback) {
  let parameters = query.textContent.trim().split('\n')
  // Create proper access path
  let prefix = 'C:\\\\inetpub\\\\xmlroot\\\\' + path.basename(XMLRootDirectory)
  let filePath = path.join(XMLRootDirectory,
    parameters[0].trim().replace(new RegExp('^' + prefix), ''))
  let columns = parameters[1] ? parameters[1].trim().split(',') : []
  return new Promise((resolve, reject) => {
    let xlsx = XLSX.readFile(filePath, {
      type: 'array',
      cellFormula: false,
      cellHTML: false
    })
    resolve(callback(xlsxToArray(xlsx, columns)))
  })
}

async function readXMLFile(folder, filename, callback) {
  return new Promise((resolve, reject) => {
    let specific = path.join(XMLRootDirectory, folder, filename).replace(/\.xml/, '_Electron.xml')
    fs.readFile(fs.existsSync(specific) ? specific :
      path.join(XMLRootDirectory, folder, filename), 'utf8', (error, xmlString) => {
        if (error) throw error
        resolve(callback(new DOMParser().parseFromString(
          xmlString.charCodeAt(0) === 0xFEFF ? // BOM
          xmlString.substring(1) : xmlString, 'text/xml')))
      })
  })
}

async function runPSQuery(query, callback) { // query is XML object
  let psQuery = `Import-Module ActiveDirectory;
           Import-Module Microsoft.PowerShell.Utility;
           [Console]::OutputEncoding = [System.Text.Encoding]::UTF8;
           ${query.textContent.replace(/;+$/, '')} | ConvertTo-HTML -Fragment
          `.replace(/(?:\r\n|\r|\n)/g, ' ')
  let ps = new powershell({
    debugMsg: false,
    executionPolicy: 'Bypass',
    noProfile: true
  })
  ps.addCommand(psQuery)
  return new Promise((resolve, reject) => {
    ps.invoke()
      .then(output => {
        let xmlDoc = new DOMParser().parseFromString(output, 'text/xml')
        let result = []
        xmlDoc.querySelectorAll('tr').forEach(tr => {
          let row = []
          for (let cell of tr.children)
            row.push(cell.textContent)
          result.push(row)
        })
        result.shift()
        callback(result)
        resolve(ps.dispose())
      })
      .catch(error => {
        console.error(error)
        reject(error)
        ps.dispose()
      })
  })
}

async function runSQLQuery(query, callback, loadFieldTypes = false) { // query is XML object
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
            reject(error)
            client.end()
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
            reject(error)
            mssql.close()
            throw error
          }
          new mssql.Request().query(query.textContent, (error, result) => {
            if (error) {
              reject(error)
              mssql.close()
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
            reject(error)
            cmdb.release()
            throw error
          }
          cmdb.query({
            sql: query.textContent,
            nestTables: '.'
          }, (error, result, fields) => {
            if (error) {
              reject(error)
              cmdb.release()
              throw error
            }
            if (loadFieldTypes) {
              result = []
              fields.forEach(field => {
                result[field.name] = {}
                if (field.type < 10)
                  result[field.name].type = 'number'
                else switch (field.type) {
                  case 16: // BIT
                  case 17: // TIMESTAMP2
                  case 246: // NEWDECIMAL
                    result[field.name].type = 'number'
                    break;
                  case 10: // DATE
                  case 13: // YEAR
                  case 14: // NEWDATE
                    result[field.name].type = 'date'
                    break;
                  case 11: // TIME
                  case 19: // TIME2
                    result[field.name].type = 'time'
                    break;
                  case 12: // DATETIME
                  case 18: // DATETIME2
                    result[field.name].type = 'datetime'
                    break;
                  case 250: // MEDIUMBLOB, MEDIUMTEXT
                  case 251: // LONGBLOG, LONGTEXT
                  case 252: // BLOB, TEXT
                    result[field.name].type = 'multiline'
                    break;
                  default: // anything else --> text
                    result[field.name].type = ''
                    break;
                }
                if (field.flags & 256) result[field.name].type = 'enum'
                result[field.name].required = Boolean(field.flags & 1) // NOT NULL
                result[field.name].disabled = Boolean(field.flags & 512) // AUTO INCREMENT
              })
            } else if (result.constructor.name !== 'OkPacket') {
              queryResultToArray(result)
            }
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

  for (let row = 0; row < result.length; row++) {
    let packet = result[row]
    let dataRow = []
    for (let data in packet) {
      if (packet[data] === null ||
        (typeof packet[data] === 'object' && !Object.keys(packet[data]).length))
        dataRow.push('')
      else if (packet[data] instanceof Date)
        dataRow.push(normalize(packet[data]))
      else
        dataRow.push(packet[data].toString())
    }
    result[row] = dataRow
  }
}

Load['link'] = URL => {
  if (/^\w+\//.test(URL))
    shell.openItem(URL.replace(/^\w+\//, path.join(XMLRootDirectory, 'File/')))
  else
    open(URL, '_blank')
}