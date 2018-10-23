const streamTransform = require('stream').Transform

const footer = $('main>section>footer')[0]

let $queries // actual XML queries
let dataTable // memory array of data rows with display property
let rowTemplate // empty row template

function loadView(file) {
  footer.innerHTML = fs.readFileSync('src/View/View.html', 'utf8') // emtpy template
  fs.readFile(file, 'utf8', (error, xmlString) => {
    if (error) throw error
    const xmlDoc = xmlString.charCodeAt(0) === 0xFEFF ? // BOM
      $.parseXML(xmlString.substring(1)) : $.parseXML(xmlString)

    $('h1>span:first-child')[0].title = $(xmlDoc).find('view').attr('title')
    $('h1>span:first-child').text($(xmlDoc).find('view').attr('title'))

    $queries = $(xmlDoc).find('query')
    rowTemplate = document.createElement('tr')
    let $columns = $(xmlDoc).find('column')

    if ($queries.length > 1) { // gap analysis
      $('table', footer).css('width', '1000px')
      $('colgroup', footer).append(`
        ${'<col width="200"/>'.repeat(2)}
        ${'<col width="300"/>'.repeat(2)}
      `)
      $('thead', footer).append(`
        <tr>${'<th><input type="search"></th>'.repeat(4)}</tr>
        <tr>
          <td>${$columns[0].getAttribute('title')}</td>
          <td data-title="Data">Data</td>
          <td>${$queries[0].getAttribute('title')}</td>
          <td>${$queries[1].getAttribute('title')}</td>
        </tr>
      `)
      tableRow.innerHTML = `
        <td style="font-weight:bold"></td>
        <td style="font-style:italic"></td>
        <td></td><td></td>`
    } else { // simple or compound view
      let tableWidth = 0
      let titleRow = document.createElement('tr')
      $columns.each(function (i) {
        $(titleRow).append(`<td>${$(this).attr('title')}</td>`)
        let align = $(this).attr('type') === 'number' ? 'right' : ''
        let font = ''
        let width = '170'
        switch ($(this).attr('type')) {
          case 'date':
          case 'time':
          case 'datetime':
            align = 'center'
          case 'number':
            font = ' class="mono"'
            width = '110'
        }
        align = $(this).attr('align') || align
        if (align)
          align = ` style="text-align:${align}"`
        if ($(this).attr('font') === 'mono')
          font = ' class="mono"'
        width = $(this).attr('width') || width

        tableWidth += parseInt(width)
        $('footer colgroup').append(`<col width="${width}">`)
        $(rowTemplate).append(`<td${font}${align}></td>`)
      })
      $('footer table').css('width', tableWidth + 'px')
      $('footer thead').append(`<tr>${'<th><input type="search"></th>'.repeat($columns.length)}</tr>`)
      $('footer thead').append(titleRow)

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
      sql: $queries.text(),
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

// refresh dataTable in memory
function reloadDataStream() {
  if ($queries.length > 1) { // gap analysis
  } else {
    mysql_pool.getConnection((error, cmdb) => {
      if (error) throw error
      dataTable = []
      cmdb.query({
          sql: $queries.text(),
          nestTables: '.'
        }).stream().pipe(streamTransform({
          objectMode: true,
          transform: function (record, encoding, callback) {
            let dataRow = [true] // display
            $.each(record, (field, data) => {
              if (data) {
                if (data instanceof Date)
                  dataRow.push(data.toISOString().substring(0, 10))
                else
                  dataRow.push(data.toString())
              } else { // null or emtpy string
                dataRow.push('')
              }
            })
            dataTable.push(dataRow)
            callback()
          }
        }))
        .on('finish', () => {
          cmdb.release()
          filterData()
        })
    })
  }
}

function filterData() {
  $('#message').text('...')
  $('tbody', footer).empty()
  let filters = []
  $('thead input', footer).each(function (i) {
    if (this.value) {
      filters.push({
        column: i + 1,
        filter: new RegExp(this.value.replace(/ /g, '.*'), 'im')
      })
    }
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

function displayData() {
  let tbody = document.createElement('tbody')
  let countRows = 0
  for (let row of dataTable) {
    if (row[0]) {
      let dataRow = rowTemplate.cloneNode(true)
      $(dataRow).children().each(function (i) {
        $(this).text(row[i + 1])
      })
      tbody.appendChild(dataRow)
      if (countRows++ > 100)
        break;
    }
  }
  $('tbody', footer).replaceWith(tbody)
}

$(document.body).on('click', '#tool', function () {
  let tools = document.getElementById('tools')
  tools.style.display = tools.style.display !== 'block' ? 'block' : 'none'
})

$(document.body).on('input', 'main>section>footer input[type="search"]', filterData)