Load['form'] = formname => {
  empty(FormTable)
  readXMLFile('Form', formname + '.xml', loadForm)
  Aside.display = 'block'
}

async function loadForm(xmlDoc) {
  FormTitle.innerHTML = get(xmlDoc.firstElementChild, 'title')
  Options = []
  for (element of xmlDoc.querySelectorAll('column, button, submit')) {
    if (element.matches('column')) {
      let field = get(element, 'field')
      if (View.isTable && Table.fields[field].disabled) continue;
      await getField(element)
      let label = document.createElement('tr')
      label.innerHTML = `<th>${Options[field].label}</th>`
      FormTable.appendChild(label)
      let editor = document.createElement('tr')
      editor.innerHTML = `<td>${Options[field].editor}</td>`
      FormTable.appendChild(editor)
    } else {
      let button = document.createElement('tr')
      button.innerHTML =
        `<td style="padding-right:0">
          <input type="${element.tagName}" value="${get(element, 'title') || 'Submit'}"/>
        </td>`
      if (get(element, 'language') === 'JS')
        button.onclick = element.textContent
      else
        button.addEventListener('click', event => {
          let callback = get(element, 'callback') || (result => console.log(result))
          let command = element.textContent
          for (field of document.querySelector('aside form').elements) {
            if (field.name) {
              let value = `'${field.value}'`
              if (field.value && field.list)
                value = document.getElementById(field.list.id)
                .querySelector(`option[value="${field.value}"]`).dataset.value
              command = command.replace(new RegExp(`\\$${field.name}\\$`, 'g'), value)
            }
          }
          let query = document.createElement('query')
          query.textContent = command
          runSQLQuery(query, callback)
        })
      FormTable.appendChild(button)
    }
  }
}

async function getField(column) {
  let get = attribute =>
    column.attributes[attribute] ?
    column.attributes[attribute].value : ''

  let name = get('field')
  let inputName = `name="${name}"` +
    (get('required') === 'yes' || (View.isTable && Table.fields[name].required) ? ' required' : '')

  Options[name] = {
    label: get('title') || get('field')
  }
  if (get('multiline') === 'yes' || (View.isTable && Table.fields[name].type === 'multiline'))
    return Options[name].editor = `<textarea ${inputName}></textarea>`

  if (column.querySelector('selection')) {
    let options = column.querySelector('options')
    if (options) {
      Options[name].editor = `<input list="${name}-options" ${inputName}
                               onfocus="focusDatalist(this)"
                               onkeydown="switch(event.key){
                                 case'Escape':case'Enter':validateDatalist(this)}"
                               onblur="validateDatalist(this)"/>
                              <datalist id="${name}-options">`
      const get = element => options.querySelector(element).textContent
      let query = document.createElement('query')
      query.textContent = `SELECT ${get('value')}, ${get('text')}
                           FROM ${get('from')}
                           ${options.querySelector('filter') ?
                          'WHERE ' + get('filter') : ''}
                           ORDER BY ${get('text')}`
      return runSQLQuery(query, result => {
        result.forEach(option => Options[name].editor +=
          `<option data-value="${option[0]}"
            value="${option[1].replace(/"/g, '&quot;')}"/>`
        )
        Options[name].editor += '</datalist>'
      })
    } else {
      Options[name].editor = `<select ${inputName}/>`

      if (get(column, 'required') !== 'yes' &&
        (!Table.fields[get('field')] || !Table.fields[get('field')].required))
        Options[name].editor += '<option></option>'

      column.querySelectorAll('option').forEach(option =>
        Options[name].editor += `<option
            value="${get(option, 'value') || option.textContent}"
            >${option.textContent}</option>`
      )
      return Options[name].editor += '</select>'
    }
  }

  if (View.isTable && Table.fields[name].type === 'enum') {
    let query = document.createElement('query')
    query.textContent = `SHOW COLUMNS FROM ${Table.name}
                         WHERE FIELD = '${name}'`
    return runSQLQuery(query, result => {
      Options[name].editor = `<select ${inputName}/>`
      result[0][1].match(/^enum\('(.*)'\)$/)[1].split("','").forEach(option =>
        Options[name].editor += `<option>${option}</option>`
      )
      Options[name].editor += '</select>'
    })
  }

  let type = get('pattern') || get('type') || (View.isTable ? Table.fields[name].type : '')

  if (type === 'datum')
    type = 'date'
  switch (type) {
    case '':
      Options[name].editor = `<input ${inputName}/>`
      break;
    case 'email':
    case 'url':
    case 'number':
    case 'date':
      Options[name].editor = `<input type="${type}" ${inputName}/>`
      break;
    case 'datum':
      Options[name].editor = `<input type="date" ${inputName}/>`
      break;
    case 'datetime':
    case 'time':
      Options[name].editor = `<input type="datetime-local" ${inputName}/>`
      break;
    default:
      Options[name].editor = `<input pattern="${type}" ${inputName}/>`
      break;
  }
}

function focusDatalist(input) {
  input.placeholder = input.value
  input.value = ''
  if (typeof ipc !== 'undefined') {
    let rect = input.getBoundingClientRect()
    ipc.send('datalist focused', rect.left, rect.top)
  }
  input.addEventListener('input', _ => {
    input.placeholder = ''
  }, {
    once: true
  })
}

function validateDatalist(input) {
  if (!input.value && input.placeholder)
    input.value = input.placeholder
  input.placeholder = ''
  if (!document.getElementById(input.list.id)
    .querySelector(`option[value="${input.value.replace(/"/g, '\\"')}"]`))
    input.value = ''
}