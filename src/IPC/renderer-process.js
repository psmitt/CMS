const electron = require('electron')

const ipc = electron.ipcRenderer

// Event handler of the Start button
document.getElementById('start').addEventListener('click', _ => {
  // Send message to Main process
  ipc.send('May I start countdown?')
})

// Event handler of the response from Main process
ipc.on('Yes, start countdown now!', (event, count) => {
  document.getElementById('counter-field').innerHTML = count
})
