const ViewTitle = document.getElementById('view')
const Message = document.getElementById('message')
const Tool = document.getElementById('tool')
const Tools = document.getElementById('tools')
const DataPanel = document.getElementById('data')

/* LOAD TABULAR REPORT DATA */

var columnTitles, queries, dataArray, rowTemplate;
var table, colgroup, thead, tbody, cols;
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

  columnTitles = []
  queries = []
  if (isTable)
    queries = tableQuery(xmlDoc) // ["<query><![CDATA[ ... ]]></query>"]
  else {
    for (let column of columns)
      columnTitles.push(column.attributes['title'].value)
    queries = xmlDoc.querySelectorAll('query')
  }

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
  let result0, result1;
  const getResult0 = result => result0 = result
  const getResult1 = result => result1 = result
  const displayData = result => {
    dataArray = result
    for (let row of dataArray)
      row.push(true)
    filterData()
  }
  let promise0 = queries[0].querySelector('query') ?
    compoundQuery(queries[0]) : runSQLQuery(queries[0], getResult0)
  if (queries.length > 1) {
    let promise1 = queries[1].querySelector('query') ?
      compoundQuery(queries[1]) : runSQLQuery(queries[1], getResult1)
    Promise.all([promise1, promise1])
      .then(_ => displayData(gapAnalysis(result0, result1)))
  } else {
    promise0.then(_ => displayData(result0))
  }
}

function compoundQuery(query) {
  let baseResult;
  const addResult = result => {}
}

function gapAnalysis(result1, result2) {
  result1.sort((a, b) => a[0].localeCompare(b[0]))
  result2.sort((a, b) => a[0].localeCompare(b[0]))
  console.log(result1);
  console.log(result2);
  let result = []
  let i = 0
  let j = 0
  const push1 = index =>
    result.push([result1[index][0], '*',
      `<span title="${result1[index].join('\n')}">*</span>`, ''])
  const push2 = index =>
    result.push([result2[index][0], '*', '',
      `<span title="${result2[index].join('\n')}">*</span>`])
  while (i < result1.length && j < result2.length) {
    let comparison = result1[i][0].localeCompare(result2[j][0])
    if (comparison < 0) push1(i++)
    if (comparison > 0) push2(j++)
    if (comparison == 0) { // first_key == second_key
      for (let k = 1; k < result1[i].length; k++) {
        let firstData = result1[i][k].toString()
        let secondData = result2[j][k].toString()
        if (firstData.localeCompare(secondData))
          result.push([result1[i][0], columnTitles[k], firstData, secondData])
      }
      i++
      j++
    }
  }
  while (i < result1.length) push1(i++)
  while (j < result2.length) push2(j++)
  return result
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
    if (i < dataArray[0].length - 2) {
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
      scrollToTop()
    }
  }
})

/* VIRTUAL SCROLLING */

const screenSize = Math.max(window.screen.availWidth, window.screen.availHeight)
let firstRowIndex, lastRowIndex;

function scrollToTop() {
  while (tbody.firstChild)
    tbody.removeChild(tbody.firstChild)
  lastRowIndex = -1
  appendRow()
  firstRowIndex = lastRowIndex
  while (screenSize > table.offsetHeight - DataPanel.scrollTop && appendRow());
}

function scrollToBottom() {
  while (tbody.firstChild)
    tbody.removeChild(tbody.firstChild)
  firstRowIndex = dataArray.length
  prependRow()
  lastRowIndex = firstRowIndex
  while (table.offsetHeight < screenSize && prependRow());
  DataPanel.scrollTop = table.offsetHeight
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
    return true;
  }
  return false;
}

DataPanel.addEventListener('scroll', _ => {
  while ((screenSize > DataPanel.scrollTop && prependRow()) ||
    (table.offsetHeight - DataPanel.scrollTop < screenSize && appendRow()));
})

/* HEADER TOOLS */

ViewTitle.addEventListener('click', event => {
  if (!event.target.matches('a') && !getSelection().toString() && innerWidth > 720)
    growFrame(Section)
})

Tool.addEventListener('click', _ =>
  Tools.style.display = Tools.style.display !== 'block' ? 'block' : 'none'
)