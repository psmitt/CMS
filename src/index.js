// GLOBAL DECLARATIONS
const os = require('os')
const fs = require('fs')
const path = require('path')
const mysql = require('mysql')
const md5 = require('md5')
const remote = require('electron').remote
const ipc = require('electron').ipcRenderer
const dialog = remote.dialog
const currentWindow = remote.getCurrentWindow()

var rootDir
var mysql_pool

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
    fs.readFile(path.join(rootDir, 'cmdb'), 'utf8', (error, cmdb) => {
      if (error) throw error
      let server = JSON.parse(cmdb)
      server.user = server.database.toUpperCase() + '_Admin'
      server.password = md5(server.user)
      server.supportBigNumbers = true
      mysql_pool = mysql.createPool(server)
    })
    loadMenuFiles(path.join(rootDir, 'Menu'))
  }
}

ipc.on('Change Root', changeRoot)

$(document).ready(_ => {
  if (fs.existsSync(path.join(os.homedir(), '.cms', 'lastpath.txt'))) {
    changeRoot(fs.readFileSync(path.join(os.homedir(), '.cms', 'lastpath.txt'), 'utf8'))
  } else {
    fs.mkdir(path.join(os.homedir(), '.cms'), (error) => {
      if (error) throw error
    })
    changeRoot()
  }
})

$(document).on('keypress', event => {
  if (event.ctrlKey && event.originalEvent.code === 'KeyF')
    $('#search').focus()
});

const main = document.querySelector('main')
const tabs = main.querySelector('header')

function showTab(tab) {
  tabs.querySelectorAll('div').forEach(div => {
    div.classList.remove('highlight')
  })
  tab.classList.add('highlight')
  main.querySelectorAll('section').forEach(section => {
    section.style.display = 'none'
    if (section.id === tab.dataset.id)
      section.style.display = ''
  })
}

tabs.addEventListener('click', event => {
  let target = event.target
  let tab = target.matches('div') ? target : target.parentNode
  if (target.matches('.close')) {
    let section = document.getElementById(tab.dataset.id)
    let display = (section.style.display !== 'none')
    main.removeChild(section)
    tabs.removeChild(target.parentNode)
    if (display && tabs.firstChild)
      showTab(tabs.firstChild)
  } else {
    showTab(tab)
  }
})

function createSection() {
  let id = new Date().getTime()
  if (document.getElementById(id)) // not unique id
    id = new Date().getTime()

  let newSection = document.createElement('section')
  newSection.id = id
  newSection.innerHTML = fs.readFileSync('src/section.html', 'utf8')

  let tab = document.createElement('div')
  tab.dataset.id = id
  tab.innerHTML = `<span>${id}</span><span class="close">&#128473;</span>`

  tabs.appendChild(tab)
  main.appendChild(newSection)
  showTab(tab)
  return newSection
}