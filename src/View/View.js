/*
const footer = document.querySelector('main>section>div.content>footer')

const header = footer.querySelector('header')
const title = header.querySelector('h1')
const message = header.querySelector('span.message')
const tool = header.querySelector('svg.tool')
const tools = header.querySelector('div.tools')

const table = footer.querySelector('div.scrollbox>table')
const colgroup = table.querySelector('colgroup')
const thead = table.querySelector('thead')
const tbody = table.querySelector('tbody')

let cols // column number
let queries // actual XML queries
let dataTable // memory array of data rows with display property
let rowTemplate // empty row template
*/
function loadView(file) {
  fs.readFile(file, 'utf8', (error, xmlString) => {
    if (error) throw error
    message.textContent = '...'
    const xmlDoc = new DOMParser().parseFromString(
      xmlString.charCodeAt(0) === 0xFEFF ? // BOM
      xmlString.substring(1) : xmlString, 'text/xml')
    title.textContent = title.title =
      xmlDoc.querySelector('view').attributes['title'].value
    while (colgroup.firstChild)
      colgroup.removeChild(colgroup.firstChild)
    while (thead.firstChild)
      thead.removeChild(thead.firstChild)
    while (tbody.firstChild)
      tbody.removeChild(tbody.firstChild)

    let columns = xmlDoc.querySelectorAll('column')
    let rightColumn = document.createElement('col')
    rightColumn.style.width = '44px'

    let filterRow = document.createElement('tr')
    let filterCell = document.createElement('th')
    let filter = document.createElement('input')
    filter.type = 'search'
    filterCell.appendChild(filter)

    let scrollToTop = document.createElement('th')
    scrollToTop.textContent = 'A'

    let titleRow = document.createElement('tr')
    let scrollToBottom = document.createElement('td')
    scrollToBottom.textContent = 'V'

    queries = xmlDoc.querySelectorAll('query')
    rowTemplate = document.createElement('tr')
    let rowEditTool = document.createElement('td')
    rowEditTool.textContent = '>'

    if (queries.length > 1) { // gap analysis

      table.style.width = '1044px'
      cols = 4
      colgroup.innerHTML = `${'<col style="width:200px"/>'.repeat(2)}
                            ${'<col style="width:300px"/>'.repeat(2)}`

      for (let col = 0; col < 4; col++)
        filterRow.appendChild(filterCell.cloneNode(true))

      titleRow.innerHTML = `
          <td>${columns[0].attributes['title'].value}</td>
          <td data-title="Data">Data</td>
          <td>${queries[0].attributes['title'].value}</td>
          <td>${queries[1].attributes['title'].value}</td>`

      rowTemplate.innerHTML = `<td style="font-weight:bold"></td>
                               <td style="font-style:italic"></td>
                               <td></td><td></td>`

    } else { // simple or compound view

      let tableWidth = 44
      cols = columns.length
      for (let column of columns) {
        const get = attribute => // read attribute
          column.attributes[attribute] ?
          column.attributes[attribute].value : null

        filterRow.appendChild(filterCell.cloneNode(true))

        let title = document.createElement('td')
        title.textContent = get('title')
        titleRow.appendChild(title)

        let datacell = document.createElement('td')
        let align = get('type') === 'number' ? 'right' : ''
        let font = ''
        let width = '170'
        switch (get('type')) {
          case 'date':
          case 'time':
          case 'datetime':
            align = 'center'
          case 'number':
            font = 'mono'
            width = '110'
        }
        datacell.style.textAlign = get('align') || align
        datacell.className = font
        rowTemplate.appendChild(datacell)

        let col = document.createElement('col')
        tableWidth += parseInt(col.style.width = (get('width') || width) + 'px')
        colgroup.appendChild(col)
      }
      table.style.width = tableWidth + 'px'
    }
    colgroup.appendChild(rightColumn)
    filterRow.appendChild(scrollToTop)
    thead.appendChild(filterRow)
    titleRow.appendChild(scrollToBottom)
    thead.appendChild(titleRow)
    rowTemplate.appendChild(rowEditTool)
    reloadData()
  })
}

// refresh dataTable in memory
function reloadData() {
  mysql_pool.getConnection((error, cmdb) => {
    if (error) throw error
    cmdb.query({
      sql: queries[0].textContent,
      nestTables: '.'
    }, (error, result, fields) => {
      if (error) throw error
      message.textContent = '...'
      dataTable = []
      for (let row of result) {
        let dataRow = []
        for (let data in row) {
          if (row[data]) {
            if (row[data] instanceof Date)
              dataRow.push(row[data].toISOString().substring(0, 10))
            else
              dataRow.push(row[data].toString())
          } else { // null or emtpy string
            dataRow.push('')
          }
        }
        dataRow.push(true) // display
        dataTable.push(dataRow)
      }
      cmdb.release();
      filterData()
    })
  })
}

function filterData() {
  message.textContent = '...'
  let filters = []
  thead.querySelectorAll('input').forEach((input, index) => {
    if (input.value)
      filters.push({
        column: index,
        filter: new RegExp(input.value.replace(/ /g, '.*'), 'im')
      })
  })
  let counter = 0
  for (let row of dataTable)
    row[cols] = true;
  for (let f = 1; f < filters.length - 1; f++) {
    i = filters[f].column
    for (let row of dataTable)
      row[cols] = row[cols] && filters[f].filter.test(row[i].replace(/\n/g, ' '))
  }
  if (filters.length) {
    i = filters[filters.length - 1].column
    for (let row of dataTable)
      counter += row[cols] = row[cols] && filters[f].filter.test(row[i].replace(/\n/g, ' '))
  } else {
    counter = dataTable.length
  }
  message.textContent = counter
  displayData()
}

let firstRowIndex // dataTable index of the first row in tbody
let lastRowIndex // dataTable index of the last row in tbody
function displayData() {
  lastRowIndex = -1
  appendRow()
  firstRowIndex = lastRowIndex
  for (let row = 1; row < 20; row++)
    appendRow()
}

function appendRow() {
  let lastIndex = lastRowIndex
  while (++lastIndex < dataTable.length)
    if (dataTable[lastIndex][cols])
      break
  if (lastIndex < dataTable.length && dataTable[lastIndex][cols]) {
    let newRow = rowTemplate.cloneNode(true)
    newRow.dataset.index = lastRowIndex = lastIndex
    for (let cell = 0; cell < cols; cell++)
      newRow.children[cell].innerHTML = dataTable[lastIndex][cell]
    tbody.appendChild(newRow)
    return true
  }
  return false
}

function prependRow() { // return success
}
/*
tool.addEventListener('click', _ => {
  tools.style.display = tools.style.display !== 'block' ? 'block' : 'none'
})

thead.addEventListener('input', event => {
  if (event.target.matches('input'))
    filterData()
})

let prevScrollTop = 0
footer.querySelector('div.scrollbox').addEventListener('scroll', function () {
  if (this.scrollTop - prevScrollTop > 0)
    appendRow()
  prevScrollTop = this.scrollTop
  console.log(tbody.children.length);
})

*/

function showFooter(header) {
  minimizeNavigationBar()
  let footer = header.parentNode
  if (footer.style.height === 'auto')
    footer.style.height = '50%'
  else
    footer.style.height = 'calc(100% - var(--header-height))'
}