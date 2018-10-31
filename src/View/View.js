const title = document.querySelector('main>section>header>h1')
const table = document.querySelector('main>section>div.scrollbox>table')
const colgroup = document.querySelector('main>section>div.scrollbox>table>colgroup')
const thead = document.querySelector('main>section>div.scrollbox>table>thead')
const tbody = document.querySelector('main>section>div.scrollbox>table>tbody')

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
      colgroup.innerHTML = `${'<col width="200"/>'.repeat(2)}
                            ${'<col width="300"/>'.repeat(2)}`

      for (let col = 0; col < 4; col++)
        filterRow.appendChild(filterCell.cloneNode(true))
      thead.appendChild(filterRow)

      titleRow.innerHTML = `
          <td>${columns[0].attributes['title'].value}</td>
          <td data-title="Data">Data</td>
          <td>${queries[0].attributes['title'].value}</td>
          <td>${queries[1].attributes['title'].value}</td>`
      thead.appendChild(titleRow)

      rowTemplate.innerHTML = `<td style="font-weight:bold"></td>
                               <td style="font-style:italic"></td>
                               <td></td><td></td>`

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
      table.style.width = tableWidth + 'px'
      thead.appendChild(filterRow)
      thead.appendChild(titleRow)

      reloadData()
      // reloadDataStream()
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
  $('#message').text('...')
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
      for (let row of dataTable) {
        row[0] = true;
      }
      counter = dataTable.length;
      break;
    case 1:
      i = filters[0].column
      for (let row of dataTable) {
        if (row[0] = filters[0].filter.test(row[i].replace(/\n/g, ' ')))
          counter++
      }
      break;
    default:
      i = filters[0].column
      for (let row of dataTable) {
        row[0] = filters[0].filter.test(row[i].replace(/\n/g, ' '));
      }
      let last = filters.length - 1
      for (let f = 1; f < last; f++) {
        i = filters[f].column
        for (let row of dataTable) {
          row[0] = row[0] && filters[f].filter.test(row[i].replace(/\n/g, ' '));
        }
      }
      i = filters[last].column
      for (let row of dataTable) {
        if (row[0] = row[0] && filters[last].filter.test(row[i].replace(/\n/g, ' ')))
          counter++
      }
      break;
  }
  $('#message').text(counter)
  displayData()
}


let firstRowIndex // dataTable index of the first row in tbody
let lastRowIndex // dataTable index of the last row in tbody
function virtualScroll() {
  let boxTop = document.querySelector('section>div.scrollbox.horizontal')
}

function displayData() {
  let start = new Date().getTime();
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
  console.log(title.title, (new Date().getTime()) - start);
}

$(document.body).on('click', '#tool', function () {
  let tools = document.getElementById('tools')
  tools.style.display = tools.style.display !== 'block' ? 'block' : 'none'
})

$(document.body).on('input', 'main>section>footer input[type="search"]', filterData)

$('section>div.scrollbox.horizontal').on('scroll', function () {
  let posS = this.parentNode.getBoundingClientRect()
  let posT = table.getBoundingClientRect()
  console.log(posT.top - posS.top, posT.bottom - posS.bottom);
})