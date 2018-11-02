const header = document.querySelector('main>section>.content>footer>header')
const title = header.querySelector('h1')
const message = header.querySelector('.message')
const tool = header.querySelector('.tool')
const tools = header.querySelector('.tools')

const scrollbox = document.querySelector('main>section>.content>footer>div.scrollbox.horizontal')
const scrollbar = document.querySelector('main>section>.content>footer>div.scrollbox.vertical')
const table = scrollbox.querySelector('table')
const colgroup = table.querySelector('colgroup')
const thead = table.querySelector('thead')
const tbody = table.querySelector('tbody')

let queries // actual XML queries
let dataTable // memory array of data rows with display property
let rowTemplate // empty row template

function loadView(file) {
  fs.readFile(file, 'utf8', (error, xmlString) => {
    if (error) throw error
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

    let filterRow = document.createElement('tr')
    let filterCell = document.createElement('th')
    let filter = document.createElement('input')
    filter.type = 'search'
    filterCell.appendChild(filter)

    let titleRow = document.createElement('tr')

    queries = xmlDoc.querySelectorAll('query')
    rowTemplate = document.createElement('tr')

    if (queries.length > 1) { // gap analysis

      table.style.width = '1000px'
      colgroup.innerHTML = `${'<col style="width:200px"/>'.repeat(2)}
                            ${'<col style="width:300px"/>'.repeat(2)}
                            <col style="width:44px">`

      for (let col = 0; col < 4; col++)
        filterRow.appendChild(filterCell.cloneNode(true))
      let scrollUpTool = document.createElement('th')
      scrollupTool.textContent = 'A'
      filterRow.appendChild(scrollUpTool)
      thead.appendChild(filterRow)

      titleRow.innerHTML = `
          <td>${columns[0].attributes['title'].value}</td>
          <td data-title="Data">Data</td>
          <td>${queries[0].attributes['title'].value}</td>
          <td>${queries[1].attributes['title'].value}</td>
          <td>V</td>`
      thead.appendChild(titleRow)

      rowTemplate.innerHTML = `<td style="font-weight:bold"></td>
                               <td style="font-style:italic"></td>
                               <td></td><td></td><td>&gt;</td>`

    } else { // simple or compound view

      let tableWidth = 0
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
      let col = document.createElement('col')
      tableWidth += parseInt(col.style.width = '44px')
      colgroup.appendChild(col)

      table.style.width = tableWidth + 'px'

      let scrollUpTool = document.createElement('th')
      scrollUpTool.textContent = 'A'
      filterRow.appendChild(scrollUpTool)
      thead.appendChild(filterRow)

      let scrollDownTool = document.createElement('td')
      scrollDownTool.textContent = 'V'
      titleRow.appendChild(scrollDownTool)
      thead.appendChild(titleRow)


      let rowEditTool = document.createElement('td')
      rowEditTool.textContent = '>'
      rowTemplate.appendChild(rowEditTool)

      reloadData()
    }
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
      dataTable = []
      for (let row of result) {
        let dataRow = [true] // display
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
        column: index + 1,
        filter: new RegExp(input.value.replace(/ /g, '.*'), 'im')
      })
  })
  let counter = 0
  let i // column index
  switch (filters.length) {
    case 0:
      for (let row of dataTable)
        row[0] = true;
      counter = dataTable.length;
      break
    case 1:
      i = filters[0].column
      for (let row of dataTable)
        if (row[0] = filters[0].filter.test(row[i].replace(/\n/g, ' ')))
          counter++
      break
    default:
      i = filters[0].column
      for (let row of dataTable)
        row[0] = filters[0].filter.test(row[i].replace(/\n/g, ' '))
      let last = filters.length - 1
      for (let f = 1; f < last; f++) {
        i = filters[f].column
        for (let row of dataTable)
          row[0] = row[0] && filters[f].filter.test(row[i].replace(/\n/g, ' '))
      }
      i = filters[last].column
      for (let row of dataTable)
        if (row[0] = row[0] && filters[last].filter.test(row[i].replace(/\n/g, ' ')))
          counter++
      break
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
  /*
    appendRow()
    virtualScroll()
  */
  for (let row = 1; row < 2; row++)
    appendRow()
}

function appendRow() {
  let lastIndex = lastRowIndex
  while (++lastIndex < dataTable.length)
    if (dataTable[lastIndex][0])
      break
  if (lastIndex < dataTable.length && dataTable[lastIndex][0]) {
    let newRow = rowTemplate.cloneNode(true)
    newRow.dataset.index = lastRowIndex = lastIndex
    for (let cell = 0; cell < newRow.children.length - 1; cell++)
      newRow.children[cell].innerHTML = dataTable[lastIndex][cell + 1]
    tbody.appendChild(newRow)
    return true
  }
  return false
}

function prependRow() { // return success
  let firstIndex = firstRowIndex
  while (--firstIndex >= 0)
    if (dataTable[firstIndex][0])
      break
  if (firstIndex >= 0 && dataTable[firstIndex][0]) {
    let newRow = rowTemplate.cloneNode(true)
    newRow.dataset.index = firstRowIndex = firstIndex
    for (let cell = 0; cell < newRow.children.length; cell++)
      newRow.children[cell].innerHTML = dataTable[firstIndex][cell + 1]
    tbody.insertBefore(newRow, tbody.firstElementChild)
    return true
  }
  return false
}

function virtualScroll() {
  if (tbody.children.lenght <= 1)
    return
  // when table has multiple rows...
  let viewPort = scrollbox.getBoundingClientRect()
  viewPort.top += thead.getBoundingClientRect().height
  if (viewPort.top >= viewPort.bottom)
    return
  // fill down
  let bottomRow = tbody.lastElementChild.getBoundingClientRect()
  while (bottomRow.top <= viewPort.bottom) {
    if (appendRow()) {
      bottomRow = tbody.lastElementChild.getBoundingClientRect()
    } else {
      // fill up
      topRow = tbody.firstElementChild.getBoundingClientRect()
      while (bottomRow.bottom < viewPort.bottom) {
        if (prependRow()) {
          topRow = tbody.firstElementChild.getBoundingClientRect()
        } else {
          // table.height < scrollbox.height => no need for scrolling
          return
        }
      }
      // scroll to bottom
      scrollbox.scrollTop = scrollbox.scrollHeight - scrollbox.clientHeight
      break
    }
  }
  return
  // adjust top padding rows
  let secondRow = tbody.firstElementChild.nextSibling.getBoundingClientRect()
  while (secondRow.bottom < viewPort.top) { // remove top padding rows
    tbody.removeChild(tbody.firstElementChild)
    firstRowIndex = tbody.firstElementChild.dataset.index
    secondRow = tbody.firstElementChild.nextSibling.getBoundingClientRect()
    // adjust scrolling?
  }
  if (secondRow.top >= viewPort.top) { // insert top padding row
    prependRow()
    // adjust scrolling?
  }
  // adjust (remove) bottom padding rows
  secondRow = tbody.lastElementChild.previousSibling.getBoundingClientRect()
  while (secondRow.bottom > viewPort.bottom) {
    tbody.removeChild(tbody.lastElementChild)
    lastRowIndex = tbody.lastElementChild.dataset.index
    secondRow = tbody.lastElementChild.previousSibling.getBoundingClientRect()
    // adjust scrolling?
  }
  console.log(firstRowIndex, lastRowIndex, tbody.children.length);
}

/*
function displayData() {
  while (tbody.firstChild)
    tbody.removeChild(tbody.firstChild)
  let fragment = document.createDocumentFragment()
  let row = 0
  while (row < dataTable.length) {
    while (row < dataTable.length && !dataTable[row][0]) {
      row++
    }
    if (row >= dataTable.length) {
      break
    } else {
      let dataRow = rowTemplate.cloneNode(true)
      let node = dataRow.firstChild
      let columns = colgroup.children.length
      for (let i = 1; i <= columns; i++) {
        node.innerHTML = dataTable[row][i]
        node = node.nextSibling
      }
      fragment.appendChild(dataRow)
      row++
    }
  }
  tbody.appendChild(fragment)
}
*/

tool.addEventListener('click', _ => {
  tools.style.display = tools.style.display !== 'block' ? 'block' : 'none'
})

thead.addEventListener('input', event => {
  if (event.target.matches('input'))
    filterData()
})

let prevScrollTop = 0
scrollbox.addEventListener('scroll', event => {
  if (scrollbox.scrollTop - prevScrollTop > 0)
    appendRow()
  prevScrollTop = scrollbox.scrollTop
  console.log(tbody.children.length);
})