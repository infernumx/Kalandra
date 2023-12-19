const hwid = require('hwid')
const jwt = require('jsonwebtoken')
const config = require(getFilePath('Resources/config.json'))

const authSocket = io.connect('http://104.152.211.11:5000')

function emitUserData(event) {
    var data = {
        'auth-key': config.general.auth,
        'HWID': null,
    }
    
    hwid.getHWID().then(id => {
        data.HWID = id
        authSocket.emit(event, jwt.sign(data, 'ddb7f2d28c4e4392a0fd539aaf038ec8', {
            algorithm: 'HS256'
        }))
    })
}

function connector_logger(msg) {
    console.log("connector.js {0}".format(msg))
}

function heartbeat() {
    // Send heartbeat to server to check if auth key is expired
    emitUserData('Heartbeat')
    setTimeout(heartbeat, 5000)
}

authSocket.on('connect', function(sock) {
    connector_logger('Auth server connection established', '')
})

authSocket.on('Expired', function() {
    remote.getCurrentWindow().close()
})

authSocket.on('disconnect', function() {
    remote.getCurrentWindow().close()
})

heartbeat()