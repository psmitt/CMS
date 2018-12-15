const Electron = false
const IIS = true

async function post(parameter, value, callback) {
  return new Promise((resolve, reject) => {
    let httpRequest = new XMLHttpRequest()
    httpRequest.onreadystatechange = function () {
      if (httpRequest.readyState == 4) {
        if (httpRequest.status == 200) {
          resolve(callback(httpRequest.responseText))
        } else
          reject(console.log('HTTP status: ', httpRequest.status,
            '\nResponse: ', httpRequest.responseText))
      }
    }
    httpRequest.open('POST', '/CMS5/src/IIS.php')
    httpRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
    httpRequest.send(parameter + '=' + encodeURIComponent(value))
  })
}

document.addEventListener('DOMContentLoaded', _ => {
  loadMenuFiles()

  // cleanup subtask table
  let query = document.createElement('query')
  query.textContent = `DELETE FROM subtask WHERE subtask_id NOT IN
                      (SELECT task_id FROM task) AND subtask_opentime <
                      ${Math.floor(Date.now() / 1000) - 1000000}`
  runSQLQuery(query, result => null)

  post('getTitle', '', response => document.title = response)
})

function openNewWindow(folder, filename) {
  open('/CMS5/src/index.php', '_blank')
}

function listDirectory(folder, callback) {
  post('listDirectory', folder, response => callback(JSON.parse(response)))
}

async function readXMLFile(folder, filename, callback) {
  return post('readXMLFile', folder + '/' + filename, response =>
    callback(new DOMParser().parseFromString(response, 'text/xml')))
}

async function runSQLQuery(query, callback, loadFields = false) {
  let get = attribute => query.attributes[attribute].value
  let connectionObject = {
    query: query.textContent,
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

function load_link(URL) {
  open(URL, '_blank')
}