const io = require("socket.io-client")
const hwid = require('hwid')
const jwt = require('jsonwebtoken')
const config = require(getFilePath('Resources/config.json'))
const { ipcRenderer, remote } = require('electron')

const authSocket = io.connect('http://104.152.211.11:5000')

function auth_logger(msg) {
    console.log("authenticator.js {0}".format(msg))
}

function emitUserData(event) {
    var data = {
        'auth-key': config.general.auth,
        'HWID': null,
        'version': require(getFilePath('package.json'))['version']
    }
    
    hwid.getHWID().then(id => {
        data.HWID = id
        authSocket.emit(event, jwt.sign(data, 'ddb7f2d28c4e4392a0fd539aaf038ec8', {
            algorithm: 'HS256'
        }))
    })
}

authSocket.on('connect', function() {
    auth_logger('Auth server connection established')
})

authSocket.on('Auth', function(token) {
    let data = jwt.verify(token, 'ddb7f2d28c4e4392a0fd539aaf038ec8')
    let authorized = data['authorized']
    let subscription = data['subscription']
    let expectedVersion = data['expectedVersion']
    if (authorized) {
        remote.getCurrentWindow().close()
        ipcRenderer.send('auth', subscription)
    } else if (expectedVersion) {
        $('#txt').text('Please update Kalandra to ' + expectedVersion + '.')
        $('#txt').css('font-size', '28px')
    } else {
        $('#txt').text('Invalid key.')
    }
})

emitUserData('Auth')