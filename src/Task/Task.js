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

/* EXECUTE PROCEDURE */

TaskPanel.addEventListener('change', event => {
  if (event.target.matches('[type="checkbox"], [type="radio"]')) {
    let radio = event.target.matches('[type="radio"]')
    // If step taken, validate all parents
    if (event.target.checked) {
      let node = event.target
      // except if you just take a look at an option
      if (radio) { // check siblings
        for (let child of node.parentNode.parentNode.children) {
          if (child.tagName === 'DIV' && child !== node.parentNode) {
            if (child.firstElementChild.checked) { // found checked sibling
              for (let grandChild of child.children) { // check substeps
                if (grandChild.tagName === 'DIV') {
                  if (grandChild.firstElementChild.checked) { // found executed branch
                    if (!confirm('Dismiss the other already selected option?')) {
                      node.checked = false
                      recurseDivs(node.parentNode, div => {
                        div.style.display = div.style.display === 'none' ? 'block' : 'none'
                      }, true)
                      return
                    }
                  }
                }
              }
              child.firstElementChild.checked = false
              recurseDivs(node.parentNode, div => div.style.display = 'block')
            }
            recurseDivs(child, div => {
              div.firstElementChild.checked = false
              div.style.display = 'none'
            }, true)
          }
        }
      }
      while (TaskPanel !== (node = node.parentNode))
        if (!node.firstElementChild.checked)
          node.firstElementChild.click()
    }
    // Check if it is a step back
    if (!radio && !event.target.checked && confirm(
        'Invalidate this step and all sub-steps?'))
      recurseDivs(event.target.parentNode, child => {
        child.firstElementChild.checked = false
        child.style.display = 'block'
      })
  }
})

function recurseDivs(parent, operation, onlyForChildren = false) {
  if (!onlyForChildren)
    operation(parent)
  for (let child of parent.children)
    if (child.tagName === 'DIV')
      recurseDivs(child, operation)
}

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