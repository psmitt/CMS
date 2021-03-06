'use strict'

function createForm() {
  AsideForm = document.createElement('form')
  FormTable = document.createElement('table')
  AsideForm.appendChild(FormTable)
  FormPanel.appendChild(AsideForm)
}

Load['form'] = formname => {
  empty(FormPanel)
  createForm()
  readXMLFile('Form', formname + '.xml', loadForm).then(_ => {
    FormProcess.display = 'none'
    Aside.display = 'block'
    AsideForm.elements[0].focus()
  })
}

async function loadForm(xmlDoc) {
  isForm = xmlDoc.firstElementChild.tagName === 'form' // or 'table' ?
  FormTitle.innerHTML = get(xmlDoc.firstElementChild, 'title')
  FormFields = []
  for (let element of xmlDoc.querySelectorAll('column, button, submit')) {
    if (element.matches('column')) {
      let field = get(element, 'field')
      if (!isForm && Table.fields[field].disabled) continue;
      await getField(element)
      let label = document.createElement('tr')
      label.innerHTML = `<th>${FormFields[field].label}</th>`
      FormTable.appendChild(label)
      let editor = document.createElement('tr')
      editor.innerHTML = `<td>${FormFields[field].editor}</td>`
      FormTable.appendChild(editor)
    } else {
      let button = document.createElement('tr')
      button.innerHTML =
        `<td style="padding-right:0">
          <input type="${element.tagName}" value="${get(element, 'title') || 'Submit'}"/>
        </td>`
      let isSubmit = element.tagName === 'submit'
      let objectToListen = isSubmit ? AsideForm : button
      let eventToListen = isSubmit ? 'submit' : 'click'
      let queryFunction = runSQLQuery // default for SQL
      switch (get(element, 'language')) {
        case 'JS':
          objectToListen.addEventListener(eventToListen,
            new Function(`return async event => {
              event.preventDefault();
              FormProcess.display = 'block'
              ${element.textContent}
              ${get(element, 'callback') || 'closeForm()'}
            }`)())
          break;
        case 'PS':
          queryFunction = runPSQuery
        default: // SQL if not PS
          objectToListen.addEventListener(eventToListen, event => {
            event.preventDefault()
            FormProcess.display = 'block'
            let command = element.textContent
            for (let field of AsideForm.elements) {
              if (field.name) {
                let value = getFieldValue(field).replace(/'/g, "''")
                command = command.replace(new RegExp(`\\$${field.name}\\$`, 'g'),
                  value ? `'${value}'` : 'NULL')
              }
            }
            queryFunction(myQuery(command),
                new Function(`return result => {
                  ${get(element, 'callback') || 'closeForm()'}
                }`)())
              .then(null, error => {
                alert(error)
                FormProcess.display = 'none'
              })
          })
      }
      FormTable.appendChild(button)
    }
  }
}

function validateDatalist(input) {
  let option = document.getElementById(input.list.id)
    .querySelector(`option[value="${input.value.replace(/("|\\)/g, '\\$&')}"]`)
  input.dataset.value = option ? option.dataset.value : input.value = ''
}

const getFieldValue = field =>
  field.list ? field.dataset.value : field.value.trim()

async function getField(column) {
  let get = attribute =>
    column.attributes[attribute] ?
    column.attributes[attribute].value : ''

  let name = get('field')
  let inputName = `name="${name}"` +
    (get('required') === 'yes' || (!isForm && Table.fields[name].required) ? ' required' : '') +
    (get('placeholder') ? ` placeholder="${get('placeholder')}"` : '') +
    (get('disabled') === 'yes' ? ' disabled' : '')

  let onchange = column.querySelector('onchange')
  let options = column.querySelector('options')
  inputName += options ?
    ` onchange="validateDatalist(this);${onchange ? onchange.textContent : ''}"` :
    onchange ? ` onchange="${onchange.textContent}"` : ''

  FormFields[name] = {
    label: get('title') || get('field')
  }
  if (get('multiline') === 'yes' || (!isForm && Table.fields[name].type === 'multiline'))
    return FormFields[name].editor = `<textarea ${inputName}></textarea>`

  if (column.querySelector('selection')) {
    if (options) {
      FormFields[name].editor =
        `<input list="${name}-options" ${inputName} data-value=""/>
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
        (isForm || !Table.fields[get('field')].required))
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

  if (!isForm && Table.fields[name].type === 'enum') {
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

  let type = get('pattern') || get('type') || (!isForm ? Table.fields[name].type : '')

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

// display feedback lines after input field
function formFeedback(input, lines) {
  let tr = input.parentNode.parentNode
  let tbody = tr.parentNode
  while (tr.nextElementSibling && tr.nextElementSibling.className === 'feedback')
    tbody.removeChild(tr.nextElementSibling)
  tr = tr.nextElementSibling
  const insertRow = tr ?
    row => tbody.insertBefore(row, tr) :
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

function setField(name, value) {
  let field = document.getElementsByName(name)[0]
  field.value = value
  if (field.hasAttribute('list'))
    validateDatalist(field)
}

function disableField(name, disabled = true) {
  document.getElementsByName(name)[0].disabled = disabled
}

function requireField(name, required = true) {
  document.getElementsByName(name)[0].disabled = false
  document.getElementsByName(name)[0].required = required
}