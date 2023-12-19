const { spawn } = require('child_process')

const keyboardserver = {}
const manual = false

if (manual == true) {
    spawn('python', [getFilePath('keyboard.py')])
}

const keyboardSocket = io.connect('http://127.0.0.1:5000')

function keyboard_logger(msg) {
    console.log("keyboard.js {0}".format(msg))
}

keyboardserver.whisper = (messages) => {
    keyboardSocket.emit('Whisper', messages)
}

keyboardSocket.on('connect', function () {
    keyboard_logger('Connection established to keyboard listener')
})

keyboardSocket.on('Logger', function (data) {
    console.log(data)
})
