const aside = document.querySelector('aside')
const FormTitle = document.getElementById('form')
const FormTable = aside.querySelector('footer>form>table')

function load_form(formname) {
  while (FormTable.firstChild)
    FormTable.removeChild(FormTable.firstChild)
  readXMLFile('Form', formname + '.xml', loadForm)
  Aside.display = 'block'
}

let fields; // input field name -> [value -> text]

async function loadForm(xmlDoc) {
  FormTitle.innerHTML = xmlDoc.querySelector('form').attributes['title'].value
  fields = []
  promises = []
  xmlDoc.querySelectorAll('column').forEach(column =>
    promises.push(getField(column)))
  await Promise.all(promises)
  xmlDoc.querySelectorAll('column').forEach(column => {
    let row = document.createElement('tr')
    let label = document.createElement('th')
    label.textContent = fields[column.attributes['field'].value].label
    row.appendChild(label)
    FormTable.appendChild(row)
    row = document.createElement('tr')
    let editor = document.createElement('td')
    editor.innerHTML = fields[column.attributes['field'].value].editor
    row.appendChild(editor)
    FormTable.appendChild(row)
  })
  let submit = xmlDoc.querySelector('submit')
  row = document.createElement('tr')
  let cell = document.createElement('td')
  let button = document.createElement('input')
  button.type = 'submit'
  button.value = submit.attributes['title'] ?
    submit.attributes['title'].value : 'Submit'
  button.addEventListener('click', event => {
    event.preventDefault()
    let statements = submit.textContent
    for (field of aside.querySelector('footer>form').elements) {
      if (field.name) {
        let value = `'${field.value}'`
        if (field.list)
          value = document.getElementById(field.list.id)
          .querySelector(`option[value="${field.value}"]`).dataset.value
        statements = statements.replace(
          new RegExp(`\\$${field.name}\\$`, 'g'), value)
      }
    }

    executeStatements(statements, nocsak)

    function nocsak(result) {
      console.log(result);
    }
  })
  cell.appendChild(button)
  row.appendChild(cell)
  FormTable.appendChild(row)
}

async function getField(column) {
  let get = attribute => column.attributes[attribute] ?
    column.attributes[attribute].value : null
  let name = get('field')
  let inputName = `name="${name}"` +
    (get('required') === 'yes' ? ' required' : '')
  fields[name] = {
    label: get('title')
  }
  if (get('multiline') === 'yes')
    return fields[name].editor = `<textarea ${inputName}></textarea>`

  if (column.querySelector('selection')) {
    fields[name].editor = `<input list="${name}-options" ${inputName}/>
                           <datalist id="${name}-options">`
    let options = column.querySelector('options')
    if (options) {
      let get = selector => options.querySelector(selector).textContent
      let query = document.createElement('query')
      query.textContent = `SELECT ${get('value')}, ${get('text')}
                   FROM ${get('from')}
                   ${options.querySelector('filter') ?
                  'WHERE ' + get('filter') : ''}
                   ORDER BY ${get('text')}`
      return new Promise((resolve, reject) => {
        runSQLQuery(query, result => {
          result.forEach(option => fields[name].editor +=
            `<option data-value="${option[0]}" value="${option[1]}"/>`
          )
          resolve(fields[name].editor += '</datalist>')
        })
      })
    } else {
      fields[name].editor = `<select ${inputName}/>`
      column.querySelectorAll('option').forEach(option => {
        let value = option.attributes['value'] ?
          option.attributes['value'].value : option.textContent
        fields[name].editor +=
          `<option value="${value}">${option.textContent}</option>`
      })
      return fields[name].editor += '</select>'
    }
  }

  let type = get('pattern')
  if (type === 'datum')
    type = 'date'
  switch (type) {
    case null:
      fields[name].editor = `<input ${inputName}/>`
      break;
    case 'email':
    case 'url':
    case 'number':
    case 'date':
      fields[name].editor = `<input type="${type}" ${inputName}/>`
      break;
    case 'datum':
      fields[name].editor = `<input type="date" ${inputName}/>`
      break;
    case 'datetime':
    case 'time':
      fields[name].editor = `<input type="datetime-local" ${inputName}/>`
      break;
    default:
      fields[name].editor = `<input pattern="${type}" ${inputName}/>`
      break;
  }
}