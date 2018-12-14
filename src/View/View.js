function load_view(viewname) {
  empty(DataPanel)
  empty(Message)
  Message.appendChild(progressGif)
  readXMLFile('View', viewname + '.xml', loadView)
  showFrame(Section)
}

async function loadView(xmlDoc) {

  View.isTable = Boolean(xmlDoc.querySelector('table'))
  if (View.isTable) Table.name = xmlDoc.firstElementChild.attributes['name'].value

  View.titles = []
  xmlDoc.querySelectorAll('column').forEach(column =>
    View.titles.push(get(column, 'title') || get(column, 'field'))
  )

  View.queries = View.isTable ?
    await tableQuery(xmlDoc) : xmlDoc.querySelectorAll('view > query')

  View.rowTemplate = document.createElement('tr')

  ViewTitle.innerHTML =
    get(xmlDoc.querySelector(View.isTable ? 'table' : 'view'), 'title')

  let editorCell = View.isTable ? '<td class="editor">✐</td>' :
    `<td class="editor" title="${
      get(xmlDoc.querySelector('view'), 'automation') || ''
    }">⚙</td>`

  if (View.queries.length > 1) { // gap analysis

    DataPanel.innerHTML = `<table style="width:${1000 + rigthColumnWidth}px">
                            <colgroup>
                              <col style="width:200px"/>
                              <col style="width:200px"/>
                              <col style="width:300px"/>
                              <col style="width:300px"/>
                              <col style="width:${rigthColumnWidth}px"/>
                            </colgroup>
                            <thead>
                              <tr>
                                <th><input type="search"/></th>
                                <th><input type="search"/></th>
                                <th><input type="search"/></th>
                                <th><input type="search"/></th>
                                <th onclick="scrollToTop()">⭱</th>
                              </tr>
                              <tr>
                                <td>${View.titles[0]}</td>
                                <td data-title="Data">Data</td>
                                <td>${View.queries[0].attributes['title'].value}</td>
                                <td>${View.queries[1].attributes['title'].value}</td>
                                <td onclick="scrollToBottom()">⭳</td>
                              </tr>
                            </thead>
                            <tbody></tbody>
                           </table>`

    View.rowTemplate.innerHTML = `<td style="font-weight:bold"></td>
                          <td style="font-style:italic"></td>
                          <td></td><td></td>${editorCell}`

  } else { // simple or compound view, or table

    DataPanel.innerHTML = `<table>
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
    let colgroup = DataPanel.querySelector('colgroup')
    let filterRow = DataPanel.querySelectorAll('tr')[0]
    let titleRow = DataPanel.querySelectorAll('tr')[1]
    View.rowTemplate.innerHTML = editorCell
    xmlDoc.querySelectorAll('column').forEach(column => {
      const get = attribute =>
        column.attributes[attribute] ?
        column.attributes[attribute].value : ''

      let filter = document.createElement('th')
      filter.innerHTML = '<input type="search"/>'
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
      datacell.className = font || get('font')
      View.rowTemplate.insertBefore(datacell, View.rowTemplate.lastElementChild)
    })
    DataPanel.firstElementChild.style.width = tableWidth + 'px'
  }
  View.table = DataPanel.querySelector('table')
  View.tbody = DataPanel.querySelector('tbody')

  if (View.isTable) {
    /*
      View.tbody.addEventListener('click', event => {
        if (event.target.matches('.editor')) {
          editRecord(View.rows[event.target.parentNode.dataset.index])
        }
      })
    */
    loadOptions(xmlDoc).then(reloadData)
  } else {
    reloadData()
  }
}

function reloadData() {
  let promises = []
  let results = []
  View.queries.forEach(query => {
    promises.push(query.querySelector('query') ?
      compoundQuery(query, result => results.push(result)) :
      runSQLQuery(query, result => results.push(result)))
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
  })
}

async function compoundQuery(query, callback) {
  let result = []
  return new Promise(async function (resolve, reject) {
    for (let each of query.querySelectorAll('query'))
      await runSQLQuery(each, addResult)
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
      `<span title="${results[0][index].join('\n')}">*</span>`, '']),
    index => result.push([results[1][index][0], '*', '',
      `<span title="${results[1][index].join('\n')}">*</span>`])
  ]
  let i = j = 0
  while (i < results[0].length && j < results[1].length) {
    let comparison = results[0][i][0].localeCompare(results[1][j][0])
    if (comparison < 0) push[0](i++)
    if (comparison > 0) push[1](j++)
    if (comparison == 0) { // first_key == second_key
      for (let k = 1; k < results[0][i].length; k++) {
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
  DataPanel.querySelectorAll('thead input').forEach((input, index) => {
    if (input.value)
      filters.push({
        column: index,
        filter: new RegExp(input.value.replace(/ /g, '.*'), 'im')
      })
  })
  let counter = 0
  let display = View.titles.length
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

DataPanel.addEventListener('input', filterData)

DataPanel.addEventListener('click', event => { // SORT DATA
  if (event.target.matches('thead td') && !getSelection().toString()) {
    let i = event.target.cellIndex
    if (i < View.titles.length) {
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
  while (screenSize > View.table.offsetHeight - DataPanel.scrollTop && appendRow());
}

function scrollToBottom() {
  empty(View.tbody)
  for (let row of View.rows)
    row.tr = null
  View.first = View.rows.length
  prependRow()
  View.last = View.first
  while (View.table.offsetHeight < screenSize && prependRow());
  DataPanel.scrollTop = View.table.offsetHeight
}

function appendRow() { // return success
  let last = View.last
  while (++last < View.rows.length)
    if (View.rows[last].display)
      break
  if (last < View.rows.length && View.rows[last].display) {
    let newRow = View.rowTemplate.cloneNode(true)
    for (let cell = 0; cell < View.titles.length; cell++)
      newRow.children[cell].innerHTML = View.rows[last].data[cell]
    newRow.children[View.titles.length].addEventListener('click', _ =>
      editRecord(View.rows[last]))
    View.tbody.appendChild(newRow)
    View.rows[last].tr = newRow
    View.last = last
    return true
  }
  return false
}

function prependRow() { // return success
  let first = View.first
  let display = View.titles.length
  while (--first >= 0)
    if (View.rows[first].display)
      break
  if (first >= 0 && View.rows[first].display) {
    let newRow = View.rowTemplate.cloneNode(true)
    for (let cell = 0; cell < View.titles.length; cell++)
      newRow.children[cell].innerHTML = View.rows[first].data[cell]
    newRow.children[View.titles.length].addEventListener('click', _ =>
      editRecord(View.rows[first]))
    if (View.tbody.firstChild)
      View.tbody.insertBefore(newRow, View.tbody.firstChild)
    else
      View.tbody.appendChild(newRow)
    View.rows[first].tr = newRow
    View.first = first
    return true
  }
  return false
}

DataPanel.addEventListener('scroll', _ => {
  while ((screenSize > DataPanel.scrollTop && prependRow()) ||
    (View.table.offsetHeight - DataPanel.scrollTop < screenSize && appendRow()));
})

/* HEADER TOOLS */

ViewTitle.addEventListener('click', event => {
  if (!event.target.matches('a') && !getSelection().toString() && innerWidth > 720)
    growFrame(Section)
})

Tool.addEventListener('click', _ =>
  Tools.style.display = Tools.style.display !== 'block' ? 'block' : 'none'
)