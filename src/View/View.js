'use strict'

Load['view'] = filename => loadReport('View', filename)

async function loadView(xmlDoc) {

  View.isTable = Boolean(xmlDoc.querySelector('table'))
  if (View.isTable) Table.name = get(xmlDoc.firstElementChild, 'name')

  View.titles = []
  xmlDoc.querySelectorAll('column').forEach(column =>
    View.titles.push(get(column, 'title') || get(column, 'field'))
  )

  View.queries = View.isTable ?
    await tableQuery(xmlDoc) : xmlDoc.querySelectorAll('view > query')

  View.rowTemplate = document.createElement('tr')

  ViewTitle.innerHTML =
    get(xmlDoc.querySelector(View.isTable ? 'table' : 'view'), 'title')

  let automation = xmlDoc.querySelector('automation')
  let editorCell = View.isTable ? '<td class="editor">✐</td>' :
    `<td class="editor" title="${automation ? get(automation, 'title') : ''}">⚙</td>`

  if (View.queries.length > 1) { // gap analysis

    View.columns = 4

    ViewPanel.innerHTML = `<table style="width:${1000 + rigthColumnWidth}px">
                            <colgroup>
                              <col style="width:200px"/>
                              <col style="width:200px"/>
                              <col style="width:300px"/>
                              <col style="width:300px"/>
                              <col style="width:${rigthColumnWidth}px"/>
                            </colgroup>
                            <thead>
                              <tr>
                                <th><input type="search" placeholder="Filter..."/></th>
                                <th><input type="search" placeholder="Filter..."/></th>
                                <th><input type="search" placeholder="Filter..."/></th>
                                <th><input type="search" placeholder="Filter..."/></th>
                                <th onclick="scrollToTop()">⭱</th>
                              </tr>
                              <tr>
                                <td>${View.titles[0]}</td>
                                <td data-title="Data">Data</td>
                                <td>${get(View.queries[0], 'title')}</td>
                                <td>${get(View.queries[1], 'title')}</td>
                                <td onclick="scrollToBottom()">⭳</td>
                              </tr>
                            </thead>
                            <tbody></tbody>
                           </table>`

    View.rowTemplate.innerHTML = `<td style="font-weight:bold"></td>
                          <td style="font-style:italic"></td>
                          <td></td><td></td>${editorCell}`

  } else { // simple or compound view, or table

    View.columns = View.titles.length

    ViewPanel.innerHTML = `<table>
                            <colgroup>
                              <col style="width:${rigthColumnWidth}px">
                            </colgroup>
                            <thead>
                              <tr><th onclick="scrollToTop()">⭱</th></tr>
                              <tr><td onclick="scrollToBottom()">⭳</td></tr>
                            </thead>
                            <tbody></tbody>
                           </table>`

    let tableWidth = rigthColumnWidth
    let colgroup = ViewPanel.querySelector('colgroup')
    let filterRow = ViewPanel.querySelectorAll('tr')[0]
    let titleRow = ViewPanel.querySelectorAll('tr')[1]
    View.rowTemplate.innerHTML = editorCell
    xmlDoc.querySelectorAll('column').forEach(column => {
      const get = attribute =>
        column.attributes[attribute] ?
        column.attributes[attribute].value : ''

      let filter = document.createElement('th')
      filter.innerHTML = '<input type="search" placeholder="Filter..."/>'
      filterRow.insertBefore(filter, filterRow.lastElementChild)
      let title = document.createElement('td')
      title.textContent = get('title') || get('field')
      title.dataset.field = get('field')
      titleRow.insertBefore(title, titleRow.lastElementChild)

      let type = get('type') || (View.isTable ?
        (column.querySelector('options') ? '' : Table.fields[get('field')].type) : '')

      let col = document.createElement('col')
      let datacell = document.createElement('td')
      let align = type === 'number' ? 'right' : ''
      let font = ''
      let width = '200'
      switch (type) {
        case 'date':
        case 'time':
        case 'datetime':
          align = 'center'
        case 'number':
          font = 'mono'
          width = '128'
          col.className = type
      }
      tableWidth += parseInt(col.style.width = (get('width') * 1.3 || width) + 'px')
      colgroup.insertBefore(col, colgroup.lastElementChild)
      datacell.style.textAlign = get('align') || align
      datacell.className = get('font') || font
      View.rowTemplate.insertBefore(datacell, View.rowTemplate.lastElementChild)
    })
    ViewPanel.firstElementChild.style.width = tableWidth + 'px'
  }
  View.table = ViewPanel.querySelector('table')
  View.tbody = ViewPanel.querySelector('tbody')

  if (View.isTable) {
    View.processRecord = editRecord
    loadOptions(xmlDoc).then(reloadData)
  } else {
    View.processRecord = new Function(`return function(record) {
      ${automation ? automation.textContent : 'alert("Link automation here...")'}}`)()
    reloadData()
  }
}

function reloadData() {
  let promises = []
  let results = []
  const addResult = result => results.push(result)
  View.queries.forEach(query => {
    if (query.querySelector('query')) {
      promises.push(compoundQuery(query, addResult))
    } else {
      switch (get(query, 'language')) {
        case 'PHP':
          switch (get(query, 'callback')) {
            case 'readExcel':
            case 'readExcelColumns':
              promises.push(readXLSXFile(query, addResult))
          }
          break
        case 'PS':
          promises.push(runPSQuery(query, addResult))
          break
        default: // nothing
          promises.push(runSQLQuery(query, addResult))
      }
    }
  })
  Promise.all(promises).then(_ => {
    let result = results.length > 1 ? gapAnalysis(results) : results[0]
    if (View.isTable) resolveForeignKeys(result)
    View.rows = []
    for (let row of result)
      View.rows.push({
        data: row,
        display: true,
        tr: null
      })
    filterData()
  }, error => alert(error))
}

async function compoundQuery(query, callback) {
  let result = []
  return new Promise(async function (resolve, reject) {
    for (let each of query.querySelectorAll('query')) {
      switch (get(each, 'language')) {
        case 'PHP':
          switch (get(each, 'callback')) {
            case 'readExcel':
            case 'readExcelColumns':
              await readXLSXFile(each, addResult)
          }
          break
        case 'PS':
          await runPSQuery(each, addResult)
          break
        default: // SQL
          await runSQLQuery(each, addResult)
      }
    }
    resolve(callback(result))
  })

  function addResult(nextResult) {
    if (nextResult.length) {
      nextResult.sort((a, b) => a[0].localeCompare(b[0]))
      if (result.length) {
        let prevResult = result
        result = []
        let padPrev = Array(prevResult[0].length - 1).fill('')
        let padNext = Array(nextResult[0].length - 1).fill('')
        let i = 0
        let j = 0
        while (i < prevResult.length && j < nextResult.length) {
          let comparison = prevResult[i][0].localeCompare(nextResult[j][0])
          if (comparison < 0)
            result.push(prevResult[i++].concat(padNext))
          if (comparison > 0)
            result.push(nextResult[j++].splice(1, 0, ...padPrev))
          if (comparison == 0) { // first_key == second_key
            nextResult[j].shift()
            result.push(prevResult[i++].concat(nextResult[j++]))
          }
        }
        while (i < prevResult.length)
          result.push(prevResult[i++].concat(padNext))
        while (j < nextResult.length)
          result.push(nextResult[j++].splice(1, 0, ...padPrev))
      } else {
        result = nextResult
      }
    }
  }
}

function gapAnalysis(results) {
  results[0].sort((a, b) => a[0].localeCompare(b[0]))
  results[1].sort((a, b) => a[0].localeCompare(b[0]))
  let result = []
  let push = [
    index => result.push([results[0][index][0], '*',
      `<mark title="${results[0][index].join('\n')}">*</mark>`, '']),
    index => result.push([results[1][index][0], '*', '',
      `<mark title="${results[1][index].join('\n')}">*</mark>`])
  ]
  let i = 0
  let j = 0
  while (i < results[0].length && j < results[1].length) {
    let comparison = results[0][i][0].localeCompare(results[1][j][0])
    if (comparison < 0) push[0](i++)
    if (comparison > 0) push[1](j++)
    if (comparison == 0) { // first_key == second_key
      for (let k = 1; k < View.titles.length; k++) {
        let firstData = results[0][i][k] ? results[0][i][k].toString() : ''
        let secondData = results[1][j][k] ? results[1][j][k].toString() : ''
        if (firstData.localeCompare(secondData))
          result.push([results[0][i][0], View.titles[k], firstData, secondData])
      }
      i++
      j++
    }
  }
  while (i < results[0].length) push[0](i++)
  while (j < results[1].length) push[1](j++)
  return result
}

/* FILTER AND SORT TABLE */

function filterData() {
  empty(Message)
  Message.appendChild(progressGif)
  let filters = []
  ViewPanel.querySelectorAll('thead input').forEach((input, index) => {
    if (input.value)
      filters.push({
        column: index,
        filter: new RegExp(input.value.replace(/ /g, '.*'), 'im')
      })
  })
  let counter = 0
  for (let row of View.rows)
    row.display = true
  for (let f = 0; f < filters.length - 1; f++) {
    let c = filters[f].column
    for (let row of View.rows)
      row.display = row.display &&
      filters[f].filter.test(row.data[c].replace(/\n/g, ' '))
  }
  if (filters.length) {
    let f = filters.length - 1
    let c = filters[f].column
    for (let row of View.rows)
      counter += row.display = row.display &&
      filters[f].filter.test(row.data[c].replace(/\n/g, ' '))
  } else {
    counter = View.rows.length
  }
  Message.textContent = counter
  scrollToTop()
}

ViewPanel.addEventListener('input', filterData)

ViewPanel.addEventListener('click', event => { // SORT DATA
  if (event.target.matches('thead td') && !getSelection().toString()) {
    let i = event.target.cellIndex
    if (i < View.columns) {
      if (event.target.classList.length) {
        View.rows.reverse()
        event.target.classList.toggle('sortedUp')
        event.target.classList.toggle('sortedDown')
      } else {
        document.querySelectorAll('thead td').forEach(td => td.className = '')
        if (document.getElementsByTagName('COL')[i].className === 'number')
          View.rows.sort((a, b) => a.data[i] - b.data[i])
        else
          View.rows.sort((a, b) => a.data[i].localeCompare(b.data[i]))
        event.target.classList.toggle('sortedUp')
      }
      scrollToTop()
    }
  }
})

/* VIRTUAL SCROLLING */

function scrollToTop() {
  empty(View.tbody)
  for (let row of View.rows)
    row.tr = null
  View.last = -1
  appendRow()
  View.first = View.last
  while (screenSize > View.table.offsetHeight - ViewPanel.scrollTop && appendRow());
}

function scrollToBottom() {
  empty(View.tbody)
  for (let row of View.rows)
    row.tr = null
  View.first = View.rows.length
  prependRow()
  View.last = View.first
  while (View.table.offsetHeight < screenSize && prependRow());
  ViewPanel.scrollTop = View.table.offsetHeight
}

function appendRow() { // return success
  let last = View.last
  while (++last < View.rows.length)
    if (View.rows[last].display)
      break
  if (last < View.rows.length && View.rows[last].display) {
    let newRow = View.rowTemplate.cloneNode(true)
    let record = View.rows[last] // constant reference to indexed array item
    for (let cell = 0; cell < View.columns; cell++)
      newRow.children[cell].innerHTML = record.data[cell]
    newRow.children[View.columns].addEventListener('click', _ =>
      View.processRecord(record))
    View.tbody.appendChild(newRow)
    record.tr = newRow
    View.last = last
    return true
  }
  return false
}

function prependRow() { // return success
  let first = View.first
  while (--first >= 0)
    if (View.rows[first].display)
      break
  if (first >= 0 && View.rows[first].display) {
    let newRow = View.rowTemplate.cloneNode(true)
    let record = View.rows[first] // constant reference to indexed array item
    for (let cell = 0; cell < View.columns; cell++)
      newRow.children[cell].innerHTML = record.data[cell]
    newRow.children[View.columns].addEventListener('click', _ =>
      View.processRecord(record))
    if (View.tbody.firstChild)
      View.tbody.insertBefore(newRow, View.tbody.firstChild)
    else
      View.tbody.appendChild(newRow)
    record.tr = newRow
    View.first = first
    return true
  }
  return false
}

ViewPanel.addEventListener('scroll', _ => {
  while ((screenSize > ViewPanel.scrollTop && prependRow()) ||
    (View.table.offsetHeight - ViewPanel.scrollTop < screenSize && appendRow()));
})

/* HEADER TOOLS */

ViewTitle.addEventListener('click', event => {
  if (!event.target.matches('a') && !getSelection().toString() && innerWidth > 720)
    growFrame(Section)
})

Tool.addEventListener('click', _ =>
  Tools.style.display = Tools.style.display !== 'block' ? 'block' : 'none'
)

Tools.addEventListener('click', _ =>
  Tools.style.display = Tools.style.display !== 'block' ? 'block' : 'none'
)

document.getElementById('ReloadData').addEventListener('click', _ => {
  if (TreePanel.style.display === 'block')
    Load['tree'](Tree.filename)
  if (ViewPanel.style.display === 'block')
    reloadData()
})

document.getElementById('ExportXLSX').addEventListener('click', _ => {
  let aoa = [[]]
  if (TreePanel.style.display === 'block') {
    nextLevel(TreePanel.lastElementChild, [])
  } else {
    ViewPanel.querySelectorAll('thead td').forEach(td => aoa[0].push(td.textContent))
    aoa[0].pop() // remove scrollToBottom icon
    for (let row of View.rows)
      if (row.display)
        aoa.push(row.data.map(value => value.replace(/<[^>]+>/g, '')))
  }
  let workbook = XLSX.utils.book_new()
  let worksheet = XLSX.utils.aoa_to_sheet(aoa)
  XLSX.utils.book_append_sheet(workbook, worksheet, ViewTitle.textContent.substring(0, 31))
  return XLSX.writeFile(workbook, IIS ? 'CMS_Report.xlsx' : dialog.showSaveDialog(null, {
    defaultPath: path.join(os.homedir(), 'Desktop', 'CMS_Report.xlsx')
  }))

  function nextLevel(node, level) {
    if (node.style.display !== 'none') {
      let row = level.slice(0)
      row.push(node.children[0].src.match(/_(\w+)/)[1])
      row.push(node.children[1].textContent)
      aoa.push(row)
      for (let i = 2; i < node.children.length; i++)
        nextLevel(node.children[i], row)
    }
  }
})

document.getElementById('ClearFilters').addEventListener('click', clearFilters)

function clearFilters() {
  if (TreePanel.style.display === 'block') {
    TreeSearch.value = ''
    TreeSearch.dispatchEvent(new Event('input'))
  } else {
    ViewPanel.querySelectorAll('thead input').forEach(input => input.value = '')
    filterData()
  }
}