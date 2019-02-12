'use strict'

// LAYOUT STYLES
const Nav = document.querySelector('nav').style
const Article = document.querySelector('article').style
const Section = document.querySelector('section').style
const Aside = document.querySelector('aside').style

// MENU
const Search = document.getElementById('Search')
const MenuPanel = document.getElementById('MenuPanel')
var Load = [] // loader functions
var Favorites = null
var draggedFavorite = null

// TASK
const TaskTitle = document.getElementById('TaskTitle') // title
const BackToMain = document.getElementById('BackToMain').style
const CloseArticle = document.getElementById('CloseArticle').style
const TaskPanel = document.getElementById('TaskPanel')
const Task = {
  id: 0,
  fileName: '',
  main: 0,
  openTime: null,
  checkString: '0',
  displayString: '1',
  scrollPosition: 0
}

// TREE
const TreePanel = document.getElementById('TreePanel')
const TreeSearch = document.getElementById('TreeSearch')
const Tree = {
  filename: ''
}

// VIEW
const ViewTitle = document.getElementById('ViewTitle')
const Message = document.getElementById('Message')
const Tool = document.getElementById('Tool')
const Tools = document.getElementById('Tools')
const ViewPanel = document.getElementById('ViewPanel')

const progressGif = document.createElement('img')
progressGif.src = 'View/progress.gif'

const screenSize = Math.max(window.screen.availWidth, window.screen.availHeight)

const View = { /* global properties for tabular view */
  isTable: false,
  titles: [],
  columns: 0, // number of columns, can be different of number of titles
  queries: [],
  rows: [], // { data: [], display: true, tr: null }
  rowTemplate: document.createElement('tr'),
  first: 0, // index of first displayed data row when scrolling
  last: 0, // index of last data displayed row when scrolling
  table: null, // the data table
  tbody: null, // the data table body
  processRecord: record => null // triggered by side-click
}

const rigthColumnWidth = 47

// FORM
const FormTitle = document.getElementById('FormTitle')
const FormPanel = document.getElementById('FormPanel')
const FormProcess = document.getElementById('FormProcess').style
var AsideForm // the form
var FormTable // firstElementChild of AsideForm
var isForm // or Table? identified when loading a form
var FormFields = [] // input field name -> {label, editor}

// TABLE
var Table = {
  filename: '', // XML file name
  name: '',
  record: null, // the actual row to edit in View.rows
  clause: [], // record identifier conditions for DELETE and UPDATE
  fields: [] // field name -> { type, required, disabled }
}
const MySQLFieldType = {
  '16': 'number', // BIT
  '17': 'number', // TIMESTAMP2
  '246': 'number', // NEWDECIMAL
  '10': 'date', // DATE
  '13': 'date', // YEAR
  '14': 'date', // NEWDATE
  '11': 'time', // TIME
  '19': 'time', // TIME2
  '12': 'datetime', // DATETIME
  '18': 'datetime', // DATETIME2
  '250': 'multiline', // MEDIUMBLOB, MEDIUMTEXT
  '251': 'multiline', // LONGBLOG, LONGTEXT
  '252': 'multiline', // BLOB, TEXT
}
var ColumnOptions = {} // index -> [ value -> text ]

// UTILITIES

function empty(node) {
  while (node.firstChild)
    node.removeChild(node.firstChild)
}

function get(node, attribute) {
  return node.attributes[attribute] ? node.attributes[attribute].value : ''
}

function myQuery(text) {
  let query = document.createElement('query')
  query.textContent = text
  return query
}

function normalizeDate(date) {
  let pad = number => number <= 9 ? '0' + number : number
  return date.getFullYear() + '-' +
    pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

function cleanupSubtasks() {
  runSQLQuery(myQuery(
    `DELETE FROM subtask WHERE subtask_id NOT IN
     (SELECT task_id FROM task) AND subtask_opentime <
     ${Math.floor(Date.now() / 1000) - 1000000}`), () => 0)
}

function xlsxToArray(xlsx, columns) {
  let cells = xlsx.Sheets[xlsx.SheetNames[0]]
  let range = XLSX.utils.decode_range(cells['!ref'])
  if (!columns.length)
    columns = [...Array(range.e.c).keys()]
  let result = []
  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    let row = []
    for (let C = range.s.c; C <= columns.length; C++) {
      let cell = cells[XLSX.utils.encode_cell({
        c: columns[C],
        r: R
      })]
      row.push(cell ?
        cell.w.toString() ?
        cell.v instanceof Date ?
        normalizeDate(cell.v) : cell.v.toString() : '' : '')
    }
    result.push(row)
  }
  return result
}

function loadReport(type, filename) {
  while (TreePanel.lastElementChild !== TreePanel.firstElementChild)
    TreePanel.removeChild(TreePanel.lastElementChild)
  empty(ViewPanel)
  TreePanel.style.display = type === 'Tree' ? 'block' : 'none'
  ViewPanel.style.display = type === 'Tree' ? 'none' : 'block'
  document.getElementById('AddNew').style.display = type === 'Table' ? 'table-row' : 'none'
  empty(Message)
  Message.appendChild(progressGif)
  readXMLFile(type, filename + '.xml', type === 'Tree' ? loadTree : loadView)
  showFrame(Section)
}