let tableFields; // // input field name -> { label: ... , editor: :... }
let fieldNames;

function load_table(tablename) {
  Message.textContent = '...'
  while (DataPanel.firstChild)
    DataPanel.removeChild(DataPanel.firstChild)
  readXMLFile('Table', tablename + '.xml', loadView)
  showFrame(Section)
}

async function tableQuery(xmlDoc) { // return [<query>SQL</query>]
  tableFields = []
  fieldNames = []
  promises = []
  xmlDoc.querySelectorAll('column').forEach(column => {
    fieldNames.push(column.attributes['field'].value)
    promises.push(getField(column, tableFields))
  })
  await Promise.all(promises)
  let SQL = 'SELECT ' + fieldNames.join(',') + ' FROM ' +
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

function resolveForeignKeys() {
  let field = []
  for (let name = 0; name < fieldNames.length; name++)
    if (tableFields[fieldNames[name]].option)
      field[name] = fieldNames[name]

  for (let row = 0; row < dataArray.length; row++)
    for (let name = 0; name < fieldNames.length; name++)
      if (field[name])
        dataArray[row][name] =
        tableFields[field[name]].option[dataArray[row][name]] || ''
}