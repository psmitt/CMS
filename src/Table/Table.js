function load_table(tablename) {
  Message.textContent = '...'
  while (DataPanel.firstChild)
    DataPanel.removeChild(DataPanel.firstChild)
  readXMLFile('Table', tablename + '.xml', loadView)
}

function tableQuery(xmlDoc) {
  let fields = []
  xmlDoc.querySelectorAll('table>column').forEach(column => {
    let get = selector => column.querySelector(selector).textContent
    if (column.querySelector('selections>options>from')) {

    } else {
      fields.push(column.attributes['field'].value)
    }
  })
  queries[0] = 'SELECT ' + fields.join(',') + ' FROM ' + get('name')
  if (xmlDoc.querySelector('table>filter'))
    queries[0] += ' WHERE ' + xmlDoc.querySelector('table>filter').textContent
  if (xmlDoc.querySelector('table>order')) {
    let orders = []
    xmlDoc.querySelectorAll('table>order').forEach(order =>
      orders.push(order.attributes['field'].value +
        (order.attributes['way'] ? ' ' + order.attributes['way'] : '')))
    queries[0] += ' ORDER BY ' + orders.join(',')
  }
}