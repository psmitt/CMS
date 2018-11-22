const ViewTitle = document.getElementById('view')
const Message = document.getElementById('message')
const Tool = document.getElementById('tool')
const Tools = document.getElementById('tools')
const DataPanel = document.getElementById('data')

/* TABULAR REPORT */

var table, colgroup, thead, tbody, cols, queries, dataArray, rowTemplate
const rightColumnWidth = 44

function load_view(viewname) {
  Message.textContent = '...'
  while (DataPanel.firstChild)
    DataPanel.removeChild(DataPanel.firstChild)
  let xmlDoc = readXMLFile('View', viewname + '.xml')
  ViewTitle.textContent = xmlDoc.querySelector('view').attributes['title'].value
  DataPanel.innerHTML = `<table>
                          <colgroup></colgroup>
                          <thead></thead>
                          <tbody></tbody>
                         </table>`

  table = DataPanel.querySelector('table')
  colgroup = table.querySelector('colgroup')
  thead = table.querySelector('thead')
  tbody = table.querySelector('tbody')

  let columns = xmlDoc.querySelectorAll('column')
  let rightColumn = document.createElement('col')
  rightColumn.style.width = rightColumnWidth + 'px'

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
  let rowEditCell = document.createElement('td')
  rowEditCell.textContent = '>'

  if (queries.length > 1) { // gap analysis

    table.style.width = '1044px'
    cols = 4
    colgroup.innerHTML = `${'<col style="width:200px"/>'.repeat(2)}
                          ${'<col style="width:300px"/>'.repeat(2)}`

    for (let col = 0; col < cols; col++)
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

    let tableWidth = rightColumnWidth
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
  rowTemplate.appendChild(rowEditCell)
  reloadData()
}

// refresh dataArray in memory
function reloadData() {
  runSQLQueries(queries[0].textContent, loadDataArray)
}

function loadDataArray(result) {
  dataArray = []
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
    dataArray.push(dataRow)
  }
  filterData()
}

function filterData() {
  Message.textContent = '...'
  let filters = []
  thead.querySelectorAll('input').forEach((input, index) => {
    if (input.value)
      filters.push({
        column: index,
        filter: new RegExp(input.value.replace(/ /g, '.*'), 'im')
      })
  })
  let counter = 0
  for (let row of dataArray)
    row[cols] = true;
  for (let f = 1; f < filters.length - 1; f++) {
    i = filters[f].column
    for (let row of dataArray)
      row[cols] = row[cols] && filters[f].filter.test(row[i].replace(/\n/g, ' '))
  }
  if (filters.length) {
    i = filters[filters.length - 1].column
    for (let row of dataArray)
      counter += row[cols] = row[cols] && filters[f].filter.test(row[i].replace(/\n/g, ' '))
  } else {
    counter = dataArray.length
  }
  Message.textContent = counter
  displayData()
}

let prevScrollTop, firstRowIndex, lastRowIndex

function displayData() {
  prevScrollTop = 0
  lastRowIndex = -1
  appendRow()
  firstRowIndex = lastRowIndex
  for (let row = 1; row < 20; row++)
    appendRow()
}

function appendRow() {
  let lastIndex = lastRowIndex
  while (++lastIndex < dataArray.length)
    if (dataArray[lastIndex][cols])
      break
  if (lastIndex < dataArray.length && dataArray[lastIndex][cols]) {
    let newRow = rowTemplate.cloneNode(true)
    newRow.dataset.index = lastRowIndex = lastIndex
    for (let cell = 0; cell < cols; cell++)
      newRow.children[cell].innerHTML = dataArray[lastIndex][cell]
    tbody.appendChild(newRow)
    return true
  }
  return false
}

function prependRow() { // return ;urn success
}

function showView(header) {
  closeForm()
  minimizeNavigationBar()
  let footer = header.parentNode
  if (footer.previousElementSibling.style.display === 'none')
    footer.style.height = '100%'
  else if (footer.style.height === 'auto')
    footer.style.height = '50%'
  else
    footer.style.height = 'calc(100% - var(--header-height))'
}

function decreaseView() {
  if (footer) {
    if (footer.style.height === 'calc(100% - var(--header-height))')
      footer.style.height = '50%'
    else
      footer.style.height = 'auto'
  }
}