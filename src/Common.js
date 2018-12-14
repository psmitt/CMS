// LAYOUT STYLES
const Nav = document.querySelector('nav').style
const Article = document.querySelector('article').style
const Section = document.querySelector('section').style
const Aside = document.querySelector('aside').style

// MENU
const Search = document.getElementById('Search')
const Menu = document.getElementById('Menu')

// TASK
const TaskTitle = document.getElementById('TaskTitle') // title
const BackToMain = document.getElementById('BackToMain').style
const CloseArticle = document.getElementById('CloseArticle').style
const Procedure = document.getElementById('Procedure')
const Task = {
  id: 0,
  fileName: '',
  main: 0,
  openTime: null,
  checkString: '0',
  displayString: '1',
  scrollPosition: 0
}

// VIEW
const ViewTitle = document.getElementById('ViewTitle')
const Message = document.getElementById('Message')
const Tool = document.getElementById('Tool')
const Tools = document.getElementById('Tools')
const DataPanel = document.getElementById('Data')

const progressGif = document.createElement('img')
progressGif.src = 'View/progress.gif'

const screenSize = Math.max(window.screen.availWidth, window.screen.availHeight)

const View = { /* global properties for tabular view */
  isTable: false,
  titles: [],
  queries: [],
  rows: [], // { data: [], display: true, tr: null }
  rowTemplate: document.createElement('tr'),
  first: 0, // index of first displayed data row when scrolling
  last: 0, // index of last data displayed row when scrolling
  table: null, // the data table
  tbody: null // the data table body
}

const rigthColumnWidth = 47

// FORM
const FormTitle = document.getElementById('FormTitle')
const FormTable = document.querySelector('form > table')
var Options = {} // input field name -> [value -> text]

// TABLE
var Table = {
  name: '', // XML file name
  record: null, // the actual row to edit in View.rows
  clause: [], // record identifier conditions for DELETE and UPDATE
  fields: [] // field name -> { type, required, disabled }
}
var ColumnOptions = {} // index -> [ value -> text ]

// UTILITIES

function empty(node) {
  while (node.firstChild)
    node.removeChild(node.firstChild)
}

function get(node, attribute) {
  return node.attributes[attribute] ? node.attributes[attribute].value : null
}