Load['table'] = filename => loadReport('Table', Table.filename = filename)

async function tableQuery(xmlDoc) { // return [<query>SQL</query>]
  let fields = []
  xmlDoc.querySelectorAll('column').forEach(column => {
    fields.push(get(column, 'field'))
  })
  let SQL = 'SELECT ' + fields.join(',') + ' FROM ' +
    get(xmlDoc.querySelector('table'), 'name')
  if (xmlDoc.querySelector('table>filter'))
    SQL += ' WHERE ' + xmlDoc.querySelector('table>filter').textContent
  if (xmlDoc.querySelector('table>order')) {
    let orders = []
    xmlDoc.querySelectorAll('table>order').forEach(order =>
      orders.push(get(order, 'field') + ' ' + get(order, 'way')))
    SQL += ' ORDER BY ' + orders.join(',')
  }
  await runSQLQuery(myQuery(SQL + ' LIMIT 0'),
    result => Table.fields = result, Table.name)
  return [myQuery(SQL)]
}

async function loadOptions(xmlDoc) {
  ColumnOptions = []
  let promises = []
  xmlDoc.querySelectorAll('column').forEach((column, index) => {
    if (column.querySelector('selection')) {
      if (column.querySelector('options')) {
        promises.push(getOptions(column.querySelector('options'), index))
      } else {
        ColumnOptions[index] = []
        if (!Table.fields[get(column, 'field')].required)
          ColumnOptions[index][''] = ''
        column.querySelectorAll('option').forEach(option =>
          ColumnOptions[index][get(option, 'value') || option.textContent] =
          option.textContent
        )
      }
    }
  })
  return Promise.all(promises)

  async function getOptions(options, index) { // unfiltered options
    let get = selector => options.querySelector(selector).textContent
    ColumnOptions[index] = []
    await runSQLQuery(myQuery(
      `SELECT ${get('value')}, ${get('text')}
       FROM ${get('from')}
       ${options.querySelector('filter') ?
      'WHERE ' + get('filter') : ''}
       ORDER BY ${get('text')}`
    ), result => {
      result.forEach(option => ColumnOptions[index][option[0]] = option[1])
    })
    return runSQLQuery(myQuery(
      `SELECT ${get('value')}, ${get('text')}
       FROM ${get('from')}
       ORDER BY ${get('text')}`
    ), result => {
      result.forEach(option => {
        if (!ColumnOptions[index][option[0]])
          ColumnOptions[index][option[0]] = `<mark>${option[1]}</mark>`
      })
    })
  }
}

function resolveForeignKeys(result) {
  for (let index in ColumnOptions)
    result.forEach(row => row[index] = ColumnOptions[index][row[index]] || '')
}

document.getElementById('AddNew').addEventListener('click', () => editRecord(null))

async function editRecord(record) {
  Table.record = record
  Table.clause = []
  empty(FormPanel)
  createForm()
  await readXMLFile('Table', Table.filename + '.xml', loadForm)
  if (record) {
    Object.keys(Table.fields).forEach((name, index) => {
      if (!Table.fields[name].disabled) {
        let input = FormTable.querySelector(`[name="${name}"]`)
        let value = input.value = record.data[index]
        if (input.list && value)
          value = document.getElementById(input.list.id)
          .querySelector(`option[value="${value.replace(/"/g, '\\"')}"]`).dataset.value
        Table.clause.push(input.name +
          (value ? `='${value.replace(/'/g, "\\'")}'` : ' IS NULL'))
      }
    })
  }
  let buttons = document.createElement('tr')
  let deleteButton = `<input type="button"
    onclick="deleteRecord(Table.record)" style="width:40%" value="Delete"/>`
  let saveTitle = record ? 'Save' : 'Add'
  buttons.innerHTML = `<td style="padding:0">${record ? deleteButton : ''}
    <input type="submit" onclick="event.preventDefault();saveRecord(Table.record)"
     style="width:40%;float:right" value="${saveTitle}"/></td>`
  FormTable.appendChild(buttons)
  Aside.display = 'block'
  AsideForm.elements[0].focus()
}

function deleteRecord(record) {
  runSQLQuery(myQuery(
    `DELETE FROM ${Table.name} WHERE ${Table.clause.join(' AND ')}`
  ), result => {
    if (result.affectedRows === 1) {
      if (record.tr)
        View.tbody.removeChild(record.tr)
      View.rows.splice(View.rows.indexOf(record), 1)
      closeForm()
    } else {
      alert(result.message)
    }
  })
}

function saveRecord(record) {
  let fieldNames = []
  let newValues = []
  let newRow = View.rowTemplate.cloneNode(true)
  let formElements = AsideForm.elements
  for (i = 0; i < formElements.length; i++) {
    let field = formElements[i]
    if (!field.checkValidity()) {
      field.focus()
      return
    }
    if (field.name) {
      fieldNames.push(field.name)
      let value = `'${field.value.replace(/'/g, "\\'")}'`
      if (field.value && field.list)
        value = document.getElementById(field.list.id)
        .querySelector(`option[value="${field.value.replace(/"/g, '\\"')}"]`).dataset.value
      newValues.push((record ? `${field.name}= ` : '') + (field.value ? value : 'NULL'))
      newRow.children[i].innerHTML = field.value
    }
  }
  if (record) { // UPDATE
    runSQLQuery(myQuery(
      `UPDATE ${Table.name}
       SET ${newValues.join(',')}
       WHERE ${Table.clause.join(' AND ')}`
    ), result => {
      if (result.affectedRows === 1 && result.changedRows === 1) {
        Object.keys(Table.fields).forEach((name, index) => {
          if (!Table.fields[name].disabled) {
            let value = FormTable.querySelector(`[name="${name}"]`).value
            record.data[index] = value
            if (record.tr)
              record.tr.children[index].innerHTML = value
          }
        })
        closeForm()
      } else {
        alert(result.message)
      }
    })
  } else { // INSERT
    runSQLQuery(myQuery(
      `INSERT INTO ${Table.name} (${fieldNames.join(',')})
       VALUES (${newValues.join(',')})`
    ), result => {
      if (result.affectedRows === 1 && result.insertId) {
        record = {
          data: [],
          display: true,
          tr: null
        }
        Object.keys(Table.fields).forEach((name, index) => {
          record.data[index] = Table.fields[name].disabled ? result.insertId :
            FormTable.querySelector(`[name="${name}"]`).value
        })
        View.rows.push(record)
        clearFilters()
        scrollToBottom()
        AsideForm.reset()
      } else {
        alert(result.message)
      }
    })
  }
}