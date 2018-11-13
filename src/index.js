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

/* ROOT DIRECTORY AND DATABASE */

var rootDir
var mysql_pool

ipc.on('Change Root', _ => (changeRoot()))

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
  else
    fs.writeFileSync(path.join(os.homedir(), '.cms', 'lastRoot.txt'), rootDir, 'utf8')

  loadMenuFiles(path.join(rootDir, 'Menu'))
}

ipc.on('Change Database', _ => (changeDatabase()))

function changeDatabase(server) {
  if (!server)
    server = prompt("Please enter the name of database server", "Server Name:");
  if (server)
    fs.writeFileSync(path.join(os.homedir(), '.cms', 'lastDatabase.txt'), server, 'utf8')
  mysql_pool = mysql.createPool({
    "host": server,
    "database": rootDir,
    "user": `${rootDir}_Admin`,
    "password": md5(`${rootDir}_Admin`),
    "supportBigNumbers": true
  })
}

/* SECTIONS AND TABS */

const main = document.querySelector('main')
const tabs = main.querySelector('header')
let Sections = [] // array of sections

function createSection(title) {
  let id = new Date().getTime()
  if (document.getElementById(id)) // not unique id
    id = new Date().getTime()

  let newSection = document.createElement('section')
  newSection.id = id
  newSection.innerHTML = `<article>
                            <iframe class="Task"></iframe>
                            <iframe class="View"></iframe>
                          </article>
                          <iframe class="Form"></iframe>`

  let tab = document.createElement('div')
  tab.dataset.id = id
  tab.innerHTML = `<span>${title}</span><span class="close">&#128473;</span>`

  tabs.appendChild(tab)
  main.appendChild(newSection) // iframes gets contentDocument here

  Sections[id] = {}
  for (let iframe of ['Task', 'View', 'Form']) {
    let doc = new DOMParser().parseFromString(fs.readFileSync(`src/${iframe}/${iframe}.html`, 'utf8'), 'text/html')
    let iDoc = newSection.querySelector(`.${iframe}`).contentDocument
    iDoc.head.innerHTML = doc.head.innerHTML
    iDoc.body.innerHTML = doc.body.innerHTML
    Sections[id][iframe] = iDoc.body
  }

  showTab(tab)
  return id
}

/*
  Sections[id].article = newSection.querySelector('div.content>article')
  Sections[id].footer = newSection.querySelector('div.content>footer')

  let header = newSection.querySelector('div.content>footer>header')
  Sections[id].view = header.querySelector('h1')
  Sections[id].message = header.querySelector('span.message')
  Sections[id].tool = header.querySelector('svg.tool')
  Sections[id].tools = header.querySelector('div.tools')

  Sections[id].tool.addEventListener('click', _ => {
    Sections[id].tools.style.display = Sections[id].tools.style.display !== 'block' ? 'block' : 'none'
  })

  let scrollbox = newSection.querySelector('div.content>footer>div.scrollbox')

  scrollbox.addEventListener('scroll', function () {
    if (this.scrollTop - Sections[id].prevScrollTop > 0)
      appendRow(id)
    Sections[id].prevScrollTop = this.scrollTop
    console.log(Sections[id].tbody.children.length);
  })

  Sections[id].table = scrollbox.querySelector('table')
  Sections[id].colgroup = scrollbox.querySelector('colgroup')
  Sections[id].thead = scrollbox.querySelector('thead')
  Sections[id].tbody = scrollbox.querySelector('tbody')

  Sections[id].thead.addEventListener('input', event => {
    if (event.target.matches('input'))
      filterData(id)
  })
*/

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

// Show section on clicking tab
// Remove section on closing tab
tabs.addEventListener('click', event => {
  let target = event.target
  let tab = target.matches('div') ? target : target.parentNode
  if (target.matches('.close')) {
    let section = document.getElementById(tab.dataset.id)
    let display = (section.style.display !== 'none')
    main.removeChild(section)
    tabs.removeChild(target.parentNode)
    delete Sections[section.id]
    if (display && tabs.firstChild)
      showTab(tabs.firstChild)
  } else {
    showTab(tab)
  }
})