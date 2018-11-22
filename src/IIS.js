/*
    let httpRequest = new XMLHttpRequest()
    httpRequest.onreadystatechange = function () {
      if (httpRequest.readyState == 4 && httpRequest.status == 200) {
        for (let xmlString of JSON.parse(httpRequest.responseText)) {
          const xmlDoc = new DOMParser().parseFromString(
            xmlString.charCodeAt(0) === 0xFEFF ? // BOM
            xmlString.substring(1) : xmlString, 'text/xml')
          for (let subMenu of xmlDoc.children) {
            appendSubMenu(subMenu, Menu)
          }
        }
      }
    }
    httpRequest.open('POST', '/AJAX/Menu.php')
    httpRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
    httpRequest.send('menu_load_files=all')
*/