Load['tree'] = treename => {
  empty(DataPanel)
  empty(Message)
  Message.appendChild(progressGif)
  readXMLFile('Tree', treename + '.xml', loadTree)
  showFrame(Section)
}

async function loadTree(xmlDoc) {
  ViewTitle.innerHTML =
    get(xmlDoc.querySelector('tree'), 'title')
}