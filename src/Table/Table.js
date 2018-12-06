function load_table(tablename) {
  Message.textContent = ''
  Message.appendChild(progressGif)
  while (DataPanel.firstChild)
    DataPanel.removeChild(DataPanel.firstChild)
  readXMLFile('Table', tablename + '.xml', loadView)
  showFrame(Section)
}

async function tableQuery(xmlDoc) { // return [<query>SQL</query>]
  let fields = []
  xmlDoc.querySelectorAll('column').forEach(column => {
    fields.push(column.attributes['field'].value)
  })
  let SQL = 'SELECT ' + fields.join(',') + ' FROM ' +
    xmlDoc.querySelector('table').attributes['name'].value
  if (xmlDoc.querySelector('table>filter'))
    SQL += ' WHERE ' + xmlDoc.querySelector('table>filter').textContent
  if (xmlDoc.querySelector('table>order')) {
    let orders = []
    xmlDoc.querySelectorAll('table>order').forEach(order =>
      orders.push(order.attributes['field'].value +
        (order.attributes['way'] ? ' ' + order.attributes['way'] : '')))
    SQL += ' ORDER BY ' + orders.join(',')
  }
  let query = document.createElement('query')
  query.textContent = SQL
  return [query]
}

let ColumnOptions; // index -> [ value -> text ]

async function loadOptions(xmlDoc) {
  ColumnOptions = []
  let promises = []
  xmlDoc.querySelectorAll('column').forEach((column, index) => {
    if (column.querySelector('options'))
      promises.push(getOptions(column.querySelector('options'), index))
  })
  return Promise.all(promises)

  async function getOptions(options, index) { // unfiltered options
    let get = selector => options.querySelector(selector).textContent
    let query = document.createElement('query')
    query.textContent = `SELECT ${get('value')}, ${get('text')}
                         FROM ${get('from')}
                         ORDER BY ${get('text')}`
    let filteredQuery = document.createElement('query')
    filteredQuery.textContent = `SELECT ${get('value')}, ${get('text')}
                                 FROM ${get('from')}
                                 ${options.querySelector('filter') ?
                                'WHERE ' + get('filter') : ''}
                                 ORDER BY ${get('text')}`
    ColumnOptions[index] = []
    await runSQLQuery(filteredQuery, result => {
      result.forEach(option => ColumnOptions[index][option[0]] = option[1])
    })
    return runSQLQuery(query, result => {
      result.forEach(option => {
        if (!ColumnOptions[index][option[0]])
          ColumnOptions[index][option[0]] = `<mark>${option[1]}</mark>`
      })
    })
  }
}

async function resolveForeignKeys() {
  for (let index in ColumnOptions)
    View.data.forEach(row => row[index] = ColumnOptions[index][row[index]] || '')
}