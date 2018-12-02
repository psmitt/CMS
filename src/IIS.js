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

function readXMLFile(folder, filename, callback) {
  let httpRequest = new XMLHttpRequest()
  httpRequest.onreadystatechange = function () {
    if (httpRequest.readyState == 4) {
      if (httpRequest.status == 200) {
        callback(new DOMParser().parseFromString(httpRequest.responseText, 'text/xml'))
      } else
        console.log('HTTP status: ', httpRequest.status,
          '\nResponse: ', httpRequest.responseText)
    }
  }
  httpRequest.open('POST', '/CMS5/src/IIS.php')
  httpRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
  httpRequest.send(`readXMLFile=${folder}/${filename}`)
}

function runSQLQuery(query, callback, dsn = '', user = '', pass = '') {
  let get = attribute => query.attributes[attribute].value
  let connectionObject = {}
  if (query.attributes['dsn']) {
    let dsn = get('dsn').match(/Server=(\w+);Database=(\w+)/)
    connectionObject = {
      user: get('username'),
      password: get('password'),
      server: dsn[1],
      database: dsn[2]
    }
  }
  let httpRequest = new XMLHttpRequest()
  httpRequest.onreadystatechange = function () {
    if (httpRequest.readyState == 4) {
      if (httpRequest.status == 200) {
        callback(JSON.parse(httpRequest.responseText))
      } else
        console.log('HTTP status: ', httpRequest.status,
          '\nResponse: ', httpRequest.responseText)
    }
  }
  httpRequest.open('POST', '/CMS5/src/IIS.php')
  httpRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
  httpRequest.send(`runSQLQueries=${encodeURIComponent(JSON.stringify(connectionObject))}`)
}

function load_link(URL) {
  open(URL, '_blank')
}