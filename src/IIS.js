const Electron = false
const IIS = true

document.addEventListener('DOMContentLoaded', _ => {
  loadMenuFiles()
})

function openNewWindow(folder, filename) {
  open('/CMS5/src/index.php', '_blank')
}

function listDirectory(folder, callback) {
  let httpRequest = new XMLHttpRequest()
  httpRequest.onreadystatechange = function () {
    if (httpRequest.readyState == 4) {
      if (httpRequest.status == 200)
        callback(JSON.parse(httpRequest.responseText))
      else
        console.log('\nHTTP status: ', httpRequest.status,
          '\nResponse: ', httpRequest.responseText)
    }
  }
  httpRequest.open('POST', '/CMS5/src/IIS.php')
  httpRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
  httpRequest.send(`listDirectory=${folder}`)
}

async function readXMLFile(folder, filename, callback) {
  return new Promise((resolve, reject) => {
    let httpRequest = new XMLHttpRequest()
    httpRequest.onreadystatechange = function () {
      if (httpRequest.readyState == 4) {
        if (httpRequest.status == 200) {
          resolve(callback(new DOMParser().parseFromString(httpRequest.responseText, 'text/xml')))
        } else
          reject(console.log('HTTP status: ', httpRequest.status,
            '\nResponse: ', httpRequest.responseText))
      }
    }
    httpRequest.open('POST', '/CMS5/src/IIS.php')
    httpRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
    httpRequest.send(`readXMLFile=${folder}/${filename}`)
  })
}

async function runSQLQuery(query, callback, loadFieldTypes = false) {
  let get = attribute => query.attributes[attribute].value
  let connectionObject = {
    query: query.textContent,
    loadFieldTypes: loadFieldTypes
  }
  if (query.attributes['dsn']) {
    connectionObject.dsn = get('dsn')
    connectionObject.user = get('username')
    connectionObject.pass = get('password')
  }
  return new Promise((resolve, reject) => {
    let httpRequest = new XMLHttpRequest()
    httpRequest.onreadystatechange = function () {
      if (httpRequest.readyState == 4) {
        if (httpRequest.status == 200) {
          resolve(callback(JSON.parse(httpRequest.responseText)))
        } else
          reject(console.log('HTTP status: ', httpRequest.status,
            '\nResponse: ', httpRequest.responseText))
      }
    }
    httpRequest.open('POST', '/CMS5/src/IIS.php')
    httpRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
    httpRequest.send(`runSQLQuery=${encodeURIComponent(JSON.stringify(connectionObject))}`)
  })
}

function load_link(URL) {
  open(URL, '_blank')
}