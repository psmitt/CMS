'use strict'

function load_main(id) {
  runSQLQuery(myQuery(
    `SELECT * FROM subtask WHERE subtask_id = ${id}`
  ), result => {
    Task.id = result[0][0]
    Task.fileName = result[0][1]
    Task.main = result[0][2]
    Task.openTime = result[0][3]
    Task.checkString = result[0][4]
    Task.displayString = result[0][5]
    Task.scrollPosition = result[0][6]
    Load['task'](Task.fileName, Task.main, Task.id)
  })
}

Load['task'] = (taskname, main = 0, id = 0) => { // taskname is filename without file extension
  Task.id = id
  Task.fileName = taskname
  if (Task.main = main) { // replace CLOSE icon with BACK icon
    CloseArticle.display = 'none'
    BackToMain.display = 'inline'
  } else {
    BackToMain.display = 'none'
    CloseArticle.display = 'inline'
  }
  empty(TaskPanel)
  readXMLFile('Task', taskname + '.xml', loadTask)
  showFrame(Article)
}

function loadTask(xmlDoc) {
  TaskTitle.textContent = get(xmlDoc.querySelector('task'), 'title')
  for (let step of xmlDoc.querySelector('task').children)
    appendStep(step, TaskPanel)
  if (Task.id) { // restoreTask
    TaskPanel.querySelectorAll('input').forEach((input, index) => {
      input.checked = Task.checkString.length > index &&
        Task.checkString.charAt(index) === '1'
      input.parentNode.style.display = (Task.displayString.length > index &&
        Task.displayString.charAt(index) === '0') ? 'none' : 'block'
    })
    TaskPanel.scrollTop = Task.scrollPosition
  } else {
    Task.openTime = Math.floor(Date.now() / 1000)
    Task.checkString = '0'
    Task.displayString = '1'
    Task.scrollPosition = 0
  }
}

function appendStep(step, parent) {
  let node // to append
  switch (step.tagName) {
    case 'comment':
      if (!parent.querySelector('.Comments')) {
        node = document.createElement('h2')
        node.className = node.textContent = 'Comments'
        parent.appendChild(node);
      }
      node = document.createElement('p')
      node.innerHTML = step.textContent
      break
    case 'verification':
      node = document.createElement('h2')
      node.className = node.textContent = 'Verification'
      parent.appendChild(node);
      for (let each of step.children) {
        appendStep(each, parent)
      }
      return
    default: // action, decision, option
      node = document.createElement('div')
      if (step.tagName === 'option')
        node.innerHTML = '<input type="radio"/>'
      else
        node.innerHTML = '<input type="checkbox"/>'
      let span = document.createElement('span')
      let child = step.firstElementChild // todo, question, answer
      let text = child.textContent
      if (Electron)
        text = text.replace(/src="\w+\/(\w+)\//g,
          'src="' + path.join(XMLRootDirectory, 'File', '$1', ' ').trimEnd())
      else // IIS
        text = text.replace(/src="(\w+)\//g, 'src="/CMS/$1/')
      span.innerHTML = text + '&ensp;'
      while ((child = child.nextElementSibling) && child.tagName === 'button')
        span.insertAdjacentElement('beforeend', createMenuItem('button', child))
      node.appendChild(span)
      while (child) {
        appendStep(child, node)
        child = child.nextElementSibling
      }
  }
  parent.appendChild(node);
}

/* RESIZE FRAMES */

TaskTitle.addEventListener('click', event => {
  if (!event.target.matches('a') && !getSelection().toString() && innerWidth > 720)
    growFrame(Article)
})

/* EXECUTE TASK */

TaskPanel.addEventListener('change', event => {
  let input = event.target
  const checkUp = node => {
    while (TaskPanel !== (node = node.parentNode))
      if (!node.firstElementChild.checked)
        node.firstElementChild.click()
  }
  const uncheckDown = (node, expand) => {
    node.firstElementChild.checked = false
    node.querySelectorAll('div').forEach(div => {
      div.firstElementChild.checked = false
      div.style.display = expand ? 'block' : 'none'
    })
  }
  // radio
  if (input.matches('[type="radio"]')) {
    checkUp(input)
    for (let sibling of input.parentNode.parentNode.children)
      if (sibling.matches('div') && sibling.firstElementChild !== input)
        uncheckDown(sibling)
    input.parentNode.querySelectorAll('div').forEach(div =>
      div.style.display = 'block')
  }
  // checkbox
  if (input.matches('[type="checkbox"]')) {
    if (input.checked) {
      checkUp(input)
      let child = input.nextElementSibling
      while ((child = child.nextElementSibling) &&
        child.firstElementChild.matches('[type="radio"]')) // decision
        child.querySelectorAll('div').forEach(div => div.style.display = 'none')
    } else { // step back
      uncheckDown(input.parentNode, true)
    }
  }
})

async function saveTask() {
  Task.checkString = Task.displayString = ''
  TaskPanel.querySelectorAll('input').forEach(input => {
    Task.checkString += input.checked ? '1' : '0'
    Task.displayString += input.parentNode.style.display === 'none' ? '0' : '1'
  })
  Task.scrollPosition = TaskPanel.scrollTop
  if (Task.id) { // UPDATE
    await runSQLQuery(myQuery(
      `UPDATE subtask SET
              subtask_opentime = ${Task.openTime},
              subtask_checkstring = '${Task.checkString.replace(/0+$/, '')}',
              subtask_displaystring = '${Task.displayString.replace(/1+$/, '')}',
              subtask_scrollposition = ${Task.scrollPosition}
        WHERE subtask_id = ${Task.id}`), _ => 0)
  } else { // INSERT -> get lastInsertID
    await runSQLQuery(myQuery(
      `INSERT INTO subtask VALUES (NULL, '${Task.fileName}',
       ${Task.main || 'NULL'}, ${Task.openTime}, '${Task.checkString.replace(/0+$/, '')}',
      '${Task.displayString.replace(/1+$/, '')}', ${Task.scrollPosition})`
    ), result => Task.id = result.insertId)
  }
  return Task.id
}

function deleteTask() {
  if (Task.id) {
    runSQLQuery(myQuery(
      `DELETE FROM subtask WHERE subtask_id = ${Task.id}`), _ => 0)
    Task.id = 0
  }
}