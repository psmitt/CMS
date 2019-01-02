Load['form'] = formname => {
  empty(FormTable)
  readXMLFile('Form', formname + '.xml', loadForm)
  Aside.display = 'block'
}

async function loadForm(xmlDoc) {
  FormTitle.innerHTML = get(xmlDoc.firstElementChild, 'title')
  FormFields = []
  for (element of xmlDoc.querySelectorAll('column, button, submit')) {
    if (element.matches('column')) {
      let field = get(element, 'field')
      if (View.isTable && Table.fields[field] && Table.fields[field].disabled)
        continue;
      await getField(element)
      let label = document.createElement('tr')
      label.innerHTML = `<th>${FormFields[field].label}</th>`
      FormTable.appendChild(label)
      let editor = document.createElement('tr')
      editor.innerHTML = `<td>${FormFields[field].editor}</td>`
      FormTable.appendChild(editor)
      // BLUR WHEN DATALIST CHANGE
      if (element.querySelector('options')) {
        let inputField = editor.querySelector('input')
        let formElements = document.querySelector('aside form').elements
        let i = 0
        while (formElements[i++] !== inputField);
        inputField.addEventListener('change', _ => formElements[i].focus())
      }
    } else {
      let button = document.createElement('tr')
      button.innerHTML =
        `<td style="padding-right:0">
          <input type="${element.tagName}" value="${get(element, 'title') || 'Submit'}"/>
        </td>`
      let objectToListen = button
      let eventToListen = 'click'
      if (element.tagName === 'submit') {
        objectToListen = document.querySelector('aside form')
        eventToListen = 'submit'
      }
      if (get(element, 'language') === 'JS') {
        objectToListen.setAttribute('on' + eventToListen, element.textContent)
      } else {
        objectToListen.addEventListener(eventToListen, event => {
          event.preventDefault()
          let command = element.textContent
          for (field of document.querySelector('aside form').elements) {
            if (field.name)
              command = command.replace(new RegExp(`\\$${field.name}\\$`, 'g'),
                `'${getFieldValue(field)}'`)
          }
          runSQLQuery(myQuery(command),
              new Function('return ' + (get(element, 'callback') || 'f(){}'))())
            .then(closeForm, error => alert(error))
        })
      }
      FormTable.appendChild(button)
    }
  }
}

const getFieldValue = field => field.value && field.list ?
  document.getElementById(field.list.id).querySelector(
    `option[value="${field.value}"]`).dataset.value : field.value

async function getField(column) {
  let get = attribute =>
    column.attributes[attribute] ?
    column.attributes[attribute].value : ''

  let name = get('field')
  let onchange = column.querySelector('onchange')
  let inputName = `name="${name}"` +
    (get('required') === 'yes' || (View.isTable && Table.fields[name].required) ? ' required' : '') +
    (get('placeholder') ? ` placeholder="${get('placeholder')}"` : '') +
    (get('disabled') === 'yes' ? ' disabled' : '') +
    (onchange ? ` onchange="${onchange.textContent}"` : '')

  FormFields[name] = {
    label: get('title') || get('field')
  }
  if (get('multiline') === 'yes' || (View.isTable && Table.fields[name].type === 'multiline'))
    return FormFields[name].editor = `<textarea ${inputName}></textarea>`

  if (column.querySelector('selection')) {
    let options = column.querySelector('options')
    if (options) {
      FormFields[name].editor =
        `<input list="${name}-options" ${inputName}
          onfocus="focusDatalist(this)"
          onkeydown="switch(event.key){
          case'Escape':case'Enter':validateDatalist(this)}"
          onblur="validateDatalist(this)"/>
         <datalist id="${name}-options">`
      const get = element => options.querySelector(element).textContent
      return runSQLQuery(myQuery(
        `SELECT ${get('value')}, ${get('text')}
         FROM ${get('from')}
         ${options.querySelector('filter') ?
        'WHERE ' + get('filter') : ''}
         ORDER BY ${get('text')}`
      ), result => {
        result.forEach(option => FormFields[name].editor +=
          `<option data-value="${option[0]}"
            value="${option[1].replace(/"/g, '&quot;')}"/>`
        )
        FormFields[name].editor += '</datalist>'
      })
    } else {
      FormFields[name].editor = `<select ${inputName}/>`

      if (get('required') !== 'yes' &&
        (!Table.fields[get('field')] || !Table.fields[get('field')].required))
        FormFields[name].editor += '<option></option>'

      column.querySelectorAll('option').forEach(option => {
        let value = option.attributes['value'] ?
          option.attributes['value'].value : option.textContent
        FormFields[name].editor += `<option
            value="${value}">${option.textContent}</option>`
      })
      return FormFields[name].editor += '</select>'
    }
  }

  if (View.isTable && Table.fields[name].type === 'enum') {
    return runSQLQuery(myQuery(
      `SHOW COLUMNS FROM ${Table.name}
       WHERE FIELD = '${name}'`
    ), result => {
      FormFields[name].editor = `<select ${inputName}/>`
      result[0][1].match(/^enum\('(.*)'\)$/)[1].split("','").forEach(option =>
        FormFields[name].editor += `<option>${option}</option>`
      )
      FormFields[name].editor += '</select>'
    })
  }

  let type = get('pattern') || get('type') || (View.isTable ? Table.fields[name].type : '')

  if (type === 'datum')
    type = 'date'
  switch (type) {
    case '':
      FormFields[name].editor = `<input ${inputName}/>`
      break;
    case 'email':
    case 'url':
    case 'number':
    case 'date':
      FormFields[name].editor = `<input type="${type}" ${inputName}/>`
      break;
    case 'datum':
      FormFields[name].editor = `<input type="date" ${inputName}/>`
      break;
    case 'datetime':
    case 'time':
      FormFields[name].editor = `<input type="datetime-local" ${inputName}/>`
      break;
    default:
      FormFields[name].editor = `<input pattern="${type}" ${inputName}/>`
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

// display feedback lines after input field
function formFeedback(input, lines) {
  let tr = input.parentNode.parentNode
  let tbody = tr.parentNode
  while (tr.nextElementSibling && tr.nextElementSibling.className === 'feedback')
    tbody.removeChild(tr.nextElementSibling)
  const insertRow = tr.nextElementSibling ?
    row => tbody.insertBefore(row, tr.nextElementSibling) :
    row => tbody.appendChild(row)
  for (let line of lines) {
    let feedback = document.createElement('tr')
    feedback.className = 'feedback'
    let td = document.createElement('td')
    td.innerHTML = line
    feedback.appendChild(td)
    insertRow(feedback)
  }
}