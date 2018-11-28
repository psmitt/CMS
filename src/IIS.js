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

function runSQLQueries(queries, callback, dsn = '', user = '', pass = '') {
  let parameters = {
    queries: queries,
    dsn: dsn,
    user: user,
    pass: pass
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
  httpRequest.send(`runSQLQueries=${encodeURIComponent(JSON.stringify(parameters))}`)
}

function load_link(URL) {
  open(URL, '_blank')
}