const ViewTitle = document.getElementById('view')
const Message = document.getElementById('message')
const Tool = document.getElementById('tool')
const Tools = document.getElementById('tools')
const DataPanel = document.getElementById('data')

/* LOAD TABULAR REPORT DATA */

var table, colgroup, thead, tbody, cols, queries, dataArray, rowTemplate;
const rightColumnWidth = 47

function load_view(viewname) {
  Message.textContent = '...'
  while (DataPanel.firstChild)
    DataPanel.removeChild(DataPanel.firstChild)
  readXMLFile('View', viewname + '.xml', loadView)
  showFrame(Section)
}

function loadView(xmlDoc) {
  let isTable = Boolean(xmlDoc.querySelector('table'))
  let get = attribute =>
    xmlDoc.querySelector(isTable ? 'table' : 'view').attributes[attribute].value
  ViewTitle.innerHTML = get('title')
  queries = []
  if (isTable)
    queries.push(tableQuery(xmlDoc))
  else
    xmlDoc.querySelectorAll('query').forEach(query =>
      queries.push(query.textContent))

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

  let topScroller = document.createElement('th')
  topScroller.textContent = '⭱'
  topScroller.addEventListener('click', scrollToTop)

  let titleRow = document.createElement('tr')
  let bottomScroller = document.createElement('td')
  bottomScroller.textContent = '⭳'
  bottomScroller.addEventListener('click', scrollToBottom)

  rowTemplate = document.createElement('tr')
  let rowEditCell = document.createElement('td')
  rowEditCell.textContent = '✐'

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
        column.attributes[attribute].value : ''

      filterRow.appendChild(filterCell.cloneNode(true))

      let title = document.createElement('td')
      title.textContent = get('title')
      titleRow.appendChild(title)

      let col = document.createElement('col')
      let datacell = document.createElement('td')
      let align = get('type') === 'number' ? 'right' : ''
      let font = ''
      let width = '200'
      switch (get('type')) {
        case 'date':
        case 'time':
        case 'datetime':
          align = 'center'
        case 'number':
          font = 'mono'
          width = '128'
          col.className = get('type')
      }
      tableWidth += parseInt(col.style.width = (get('width') * 1.175 || width) + 'px')
      colgroup.appendChild(col)
      datacell.style.textAlign = get('align') || align
      datacell.className = font || get('font')
      rowTemplate.appendChild(datacell)
    }
    table.style.width = tableWidth + 'px'
  }
  colgroup.appendChild(rightColumn)
  filterRow.appendChild(topScroller)
  thead.appendChild(filterRow)
  titleRow.appendChild(bottomScroller)
  thead.appendChild(titleRow)
  rowTemplate.appendChild(rowEditCell)
  reloadData()
}

function reloadData() {
  runSQLQueries(queries[0], loadDataArray)
}

function loadDataArray(result) {
  for (let row of result)
    row.push(true) // display
  dataArray = result
  filterData()
}

/* FILTER AND SORT TABLE */

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
  for (let f = 0; f < filters.length - 1; f++) {
    let c = filters[f].column
    for (let row of dataArray)
      row[cols] = row[cols] && filters[f].filter.test(row[c].replace(/\n/g, ' '))
  }
  if (filters.length) {
    let f = filters.length - 1
    let c = filters[f].column
    for (let row of dataArray)
      counter += row[cols] = row[cols] && filters[f].filter.test(row[c].replace(/\n/g, ' '))
  } else {
    counter = dataArray.length
  }
  Message.textContent = counter
  scrollToTop()
}

DataPanel.addEventListener('input', filterData)

DataPanel.addEventListener('click', event => {
  if (event.target.matches('thead td') && !getSelection().toString()) {
    let i = event.target.cellIndex
    if (i < dataArray[0].length - 1) {
      if (event.target.classList.length) {
        dataArray.reverse()
        event.target.classList.toggle('sortedUp')
        event.target.classList.toggle('sortedDown')
      } else {
        thead.querySelectorAll('td').forEach(td => td.className = '')
        let cols = document.getElementsByTagName('col')
        if (cols[i].className === 'number') {
          dataArray.sort((a, b) => a[i] - b[i])
        } else {
          dataArray.sort((a, b) => a[i].localeCompare(b[i]))
        }
        event.target.classList.toggle('sortedUp')
      }
    }
    scrollToTop()
  }
})

/* VIRTUAL SCROLLING */

let prevScrollTop, firstRowIndex, lastRowIndex;

function scrollToTop() {
  while (tbody.firstChild)
    tbody.removeChild(tbody.firstChild)
  DataPanel.scrollTop = prevScrollTop = 0
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
  }
}

DataPanel.addEventListener('scroll', _ => {
  if (prevScrollTop < DataPanel.scrollTop)
    appendRow()
  else
    prependRow()
  prevScrollTop = DataPanel.scrollTop
})

function prependRow() { // return success
  let firstIndex = firstRowIndex
  while (--firstIndex >= 0)
    if (dataArray[firstIndex][cols])
      break
  if (firstIndex >= 0 && dataArray[firstIndex][cols]) {
    let newRow = rowTemplate.cloneNode(true)
    newRow.dataset.index = firstRowIndex = firstIndex
    for (let cell = 0; cell < cols; cell++)
      newRow.children[cell].innerHTML = dataArray[firstIndex][cell]
    if (tbody.firstChild)
      tbody.insertBefore(newRow, tbody.firstChild)
    else
      tbody.appendChild(newRow)
  }
}

function scrollToBottom() {
  while (tbody.firstChild)
    tbody.removeChild(tbody.firstChild)
  DataPanel.scrollTop = prevScrollTop = 0
  firstRowIndex = dataArray.length
  prependRow()
  lastRowIndex = firstRowIndex
  for (let row = 1; row < 20; row++)
    prependRow()
  DataPanel.scrollTop = prevScrollTop =
    table.offsetHeight - DataPanel.offsetHeight + 20 // horizontal scrollbar
}

/* HEADER TOOLS */

ViewTitle.addEventListener('click', event => {
  if (!event.target.matches('a') && !getSelection().toString() && innerWidth > 720)
    growFrame(Section)
})

Tool.addEventListener('click', _ =>
  Tools.style.display = Tools.style.display !== 'block' ? 'block' : 'none'
)