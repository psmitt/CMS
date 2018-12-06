function load_view(viewname) {
  empty(DataPanel)
  empty(Message)
  Message.appendChild(progressGif)
  readXMLFile('View', viewname + '.xml', loadView)
  showFrame(Section)
}

async function loadView(xmlDoc) {

  View.isTable = Boolean(xmlDoc.querySelector('table'))

  View.titles = []
  xmlDoc.querySelectorAll('column').forEach(column =>
    View.titles.push(get(column, 'title') || get(column, 'field'))
  )

  View.queries = View.isTable ?
    await tableQuery(xmlDoc) : xmlDoc.querySelectorAll('view > query')

  View.data = [] // --> reloadData

  View.row = document.createElement('tr')

  ViewTitle.innerHTML =
    get(xmlDoc.querySelector(View.isTable ? 'table' : 'view'), 'title')

  let editorCell = View.isTable ? '<td>✐</td>' :
    `<td title="${get(xmlDoc.querySelector('view'), 'automation') || ''}">⚙</td>`

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

    View.row.innerHTML = `<td style="font-weight:bold"></td>
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
    View.row.innerHTML = editorCell
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
      tableWidth += parseInt(col.style.width = (get('width') * 1.3 || width) + 'px')
      colgroup.insertBefore(col, colgroup.lastElementChild)
      datacell.style.textAlign = get('align') || align
      datacell.className = font || get('font')
      View.row.insertBefore(datacell, View.row.lastElementChild)
    })
    DataPanel.firstElementChild.style.width = tableWidth + 'px'
  }
  View.table = DataPanel.querySelector('table')
  View.tbody = DataPanel.querySelector('tbody')

  if (View.isTable)
    loadOptions(xmlDoc).then(reloadData)
  else
    reloadData()
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
    View.data = results.length > 1 ? gapAnalysis(results) : results[0]
    if (View.isTable) resolveForeignKeys()
    for (rows of View.data) rows.push(true)
    filterData()
  })
}

async function compoundQuery(query, callback) {
  let result = []
  return new Promise((resolve, reject) => {
    let promises = []
    query.querySelectorAll('query').forEach(q =>
      promises.push(runSQLQuery(q, addResult))
    )
    Promise.all(promises).then(_ => resolve(callback(result)))
  })

  function addResult(nextResult) {
    if (nextResult.length) {
      nextResult.sort((a, b) => a[0].localeCompare(b[0]))
      if (result.length) {
        let result0 = result
        let result1 = nextResult
        result = []
        let pad0 = Array(result0[0].length - 1).fill('')
        let pad1 = Array(result1[0].length - 1).fill('')
        let i = 0
        let j = 0
        while (i < result0.length && j < result1.length) {
          let comparison = result0[i][0].localeCompare(result1[j][0])
          if (comparison < 0)
            result.push(result0[i++].concat(pad1))
          if (comparison > 0)
            result.push(result1[j++].splice(1, 0, ...pad0))
          if (comparison == 0) { // first_key == second_key
            result1[j].shift()
            result.push(result0[i++].concat(result1[j++]))
          }
        }
        while (i < result0.length)
          result.push(result0[i++].concat(pad1))
        while (j < result1.length)
          result.push(result1[j++].splice(1, 0, ...pad0))
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
  for (let row of View.data)
    row[display] = true
  for (let f = 0; f < filters.length - 1; f++) {
    let c = filters[f].column
    for (let row of View.data)
      row[display] = row[display] &&
      filters[f].filter.test(row[c].replace(/\n/g, ' '))
  }
  if (filters.length) {
    let f = filters.length - 1
    let c = filters[f].column
    for (let row of View.data)
      counter += row[display] = row[display] &&
      filters[f].filter.test(row[c].replace(/\n/g, ' '))
  } else {
    counter = View.data.length
  }
  Message.textContent = counter
  scrollToTop()
}

DataPanel.addEventListener('input', filterData)

DataPanel.addEventListener('click', event => { // SORT DATA
  if (event.target.matches('thead td') && !getSelection().toString()) {
    let i = event.target.cellIndex
    if (i < View.data[0].length - 2) {
      if (event.target.classList.length) {
        View.data.reverse()
        event.target.classList.toggle('sortedUp')
        event.target.classList.toggle('sortedDown')
      } else {
        thead.querySelectorAll('td').forEach(td => td.className = '')
        if (document.getElementsByTagName('col')[i].className === 'number')
          View.data.sort((a, b) => a[i] - b[i])
        else
          View.data.sort((a, b) => a[i].localeCompare(b[i]))
        event.target.classList.toggle('sortedUp')
      }
      scrollToTop()
    }
  }
})

/* VIRTUAL SCROLLING */

function scrollToTop() {
  empty(View.tbody)
  View.last = -1
  appendRow()
  View.first = View.last
  while (screenSize > View.table.offsetHeight - DataPanel.scrollTop && appendRow());
}

function scrollToBottom() {
  empty(View.tbody)
  View.first = View.data.length
  prependRow()
  View.last = View.first
  while (View.table.offsetHeight < screenSize && prependRow());
  DataPanel.scrollTop = View.table.offsetHeight
}

function appendRow() { // return success
  let last = View.last
  let display = View.titles.length
  while (++last < View.data.length)
    if (View.data[last][display])
      break
  if (last < View.data.length && View.data[last][display]) {
    let newRow = View.row.cloneNode(true)
    newRow.dataset.index = View.last = last
    for (let cell = 0; cell < display; cell++)
      newRow.children[cell].innerHTML = View.data[last][cell]
    View.tbody.appendChild(newRow)
    return true
  }
  return false
}

function prependRow() { // return success
  let first = View.first
  let display = View.titles.length
  while (--first >= 0)
    if (View.data[first][display])
      break
  if (first >= 0 && View.data[first][display]) {
    let newRow = View.row.cloneNode(true)
    newRow.dataset.index = View.first = first
    for (let cell = 0; cell < display; cell++)
      newRow.children[cell].innerHTML = View.data[first][cell]
    if (View.tbody.firstChild)
      View.tbody.insertBefore(newRow, View.tbody.firstChild)
    else
      View.tbody.appendChild(newRow)
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