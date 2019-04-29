'use strict'

const Electron = false
const IIS = true
var UserName

async function post(parameter, value, callback) {
  return new Promise((resolve, reject) => {
    let httpRequest = new XMLHttpRequest()
    httpRequest.onreadystatechange = function () {
      if (httpRequest.readyState == 4) {
        if (httpRequest.status == 200)
          resolve(callback(httpRequest.responseText))
        else
          reject(`${httpRequest.status}: ${httpRequest.responseText}`)
      }
    }
    httpRequest.open('POST', '/CMS5/src/IIS.php')
    httpRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
    httpRequest.send(parameter + '=' + encodeURIComponent(value))
  })
}

document.addEventListener('DOMContentLoaded', async function () {
  await post('getUserName', '', response => UserName = response)
  loadMenuFiles()
  cleanupSubtasks()
  post('getTitle', '', response => document.title = response)
})

function openNewWindow(folder, filename) {
  open('/CMS5/src/index.php', '_blank')
}

function listDirectory(folder, callback, full) {
  if (full)
    post('listFullDirectory', folder, response => callback(JSON.parse(response)))
  else
    post('listDirectory', folder, response => callback(JSON.parse(response)))
}

async function readXLSXFile(query, callback) {
  let parameters = query.textContent.trim().split('\n')
  let path = parameters[0].trim()
  let columns = parameters[1] ? parameters[1].trim().split(',') : []
  return new Promise((resolve, reject) => {
    let httpRequest = new XMLHttpRequest()
    httpRequest.responseType = 'arraybuffer'
    httpRequest.onreadystatechange = function () {
      if (httpRequest.readyState == 4) {
        if (httpRequest.status == 200) {
          let xlsx = XLSX.read(new Uint8Array(httpRequest.response), {
            type: 'array',
            cellDates: true,
            cellFormula: false,
            cellHTML: false
          })
          resolve(callback(xlsxToArray(xlsx, columns)))
        } else {
          reject(`${httpRequest.status}: ${httpRequest.responseText}`)
        }
      }
    }
    httpRequest.open('POST', '/CMS5/src/IIS.php')
    httpRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
    httpRequest.send('readXLSXFile=' + encodeURIComponent(path))
  })
}

async function readXMLFile(folder, filename, callback) {
  return post('readXMLFile', folder + '/' + filename, response =>
    callback(new DOMParser().parseFromString(response, 'text/xml')))
}

async function saveFavoritesToXML(xmlString) {
  post('menu_save_favorites', xmlString, response => null)
}

async function runPSQuery(query, callback) {
  return post('runPSQuery', query.textContent,
    response => callback(JSON.parse(response)))
}

async function runSQLQuery(query, callback, loadFields = false) {
  let get = attribute => query.attributes[attribute].value
  let connectionObject = {
    query: query.textContent.replace(new RegExp(`\\$SESSION_USER\\$`, 'g'), `'${UserName}'`),
    loadFields: loadFields
  }
  if (query.attributes['dsn']) {
    connectionObject.dsn = get('dsn')
    connectionObject.user = get('username')
    connectionObject.pass = get('password')
  }
  return post('runSQLQuery', JSON.stringify(connectionObject),
    response => callback(JSON.parse(response)))
}

Load['link'] = URL => {
  open(URL.replace(/^(\w+)\//g, '/CMS/$1/'), '_blank')
}