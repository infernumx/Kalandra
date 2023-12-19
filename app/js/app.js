const { ipcRenderer } = require('electron');

ipcRenderer.on('toggle-filter', (event, toggle) => {
    toggleFilter(toggle.identifier, toggle.disabled)
})

ipcRenderer.on('new-filter', (event, config) => {
    global.websockets.push(new PoESocket(
        config.general.league,
        identifier,
        config.general.sessid,
        filter,
        filter.disabled
    ))
})

// make sure to reset the websocket if changes made
// figure out why new filters cant be made

function openModal(filterIdentifier) {
    let win = new remote.BrowserWindow({
        width: 380,
        height: 345,
        parent: remote.getCurrentWindow(),
        icon: 'Resources/icon.ico',
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true
        },
        modal: true
    })
    win.setMenu(null)

    win.loadURL('file://' + __dirname + '/modal.html');
    win.on('close', () => {
        openConfigTab('filters')
    })
    //win.webContents.openDevTools()
    win.webContents.on('did-finish-load', () => {
        win.webContents.send('store-data', { 'filterIdentifier': filterIdentifier })
    })
}

function toggleFilter(identifier, disabled) {
    let poesocket = global.websockets[identifier]
    poesocket.disabled = disabled
    if (disabled) {
        poesocket.ws.close()
    } else {
        poesocket.openWebsocket()
    }
}

function initialize() {
    const config = require(getFilePath('Resources/config.json'))
    global.websockets = new Array()

    for (var identifier in config.filters) {
        var filter = config.filters[identifier]
        global.websockets.push(new PoESocket(
            config.general.league,
            identifier,
            config.general.sessid,
            filter,
            filter.disabled
        ))
    }
}

function openLink() {
    const shell = require('electron').shell

    $(document).on('click', 'a[href^="http"]', function (event) {
        event.preventDefault()
        shell.openExternal(this.href)
    })
}

var categories = [
    '#listings',
    '#websockets',
    '#config',
    '#log'
]

// sidebar nav, swap display for divs

$(document).ready(() => {
    categories.forEach((category) => {
        $(category + '-button').click(function () {
            // Hide all other categories
            categories.forEach((cat) => {
                if (cat != category) {
                    // Swap all other categories to display none
                    $(cat).css({ 'display': 'none' })
                }
            })

            // Show clicked category
            $(category).css({ 'display': 'block' })
        })
    })
    initialize()
})

var overrideLogger = true

if (overrideLogger) {
    $(document).ready(() => {
        var former = console.log
        console.log = function (msg) {
            former(msg)
            if (typeof msg == 'object') {
                $("#log").append("<div>" + JSON.stringify(msg, null, 4).replace(/(?:\r\n|\r|\n)/g, '<br>') + "</div>")
            } else {
                $("#log").append("<div>" + String(msg).replace(/(?:\r\n|\r|\n)/g, '<br>') + "</div>")
            }
        }

        window.onerror = function (message, url, linenumber) {
            console.log("JavaScript error: " + message + " on line " +
                linenumber + " for " + url)
        }
    })
}


// Right click menu for listings & websockets
$(function () {
    var $listings = $('.listing-table')
    $listings.bind('contextmenu', (e) => {
        e.preventDefault()
        if ($(e.target.parentElement)[0].id == '') {
            return
        }
        var menu = new Menu()

        menu.append(new MenuItem({
            label: "Block User",
            click: function (id) {
                var seller = $(e.target.parentElement)[0].children[3].innerText
                BlockList.addUser(seller)
                $(e.target.parentElement).remove()
            }
        }))

        menu.append(new MenuItem({
            label: "Remove Listing",
            click: function (id) {
                $(e.target.parentElement).remove()
            }
        }))

        menu.append(new MenuItem({
            label: "Whisper All",
            click: function (id) {
                whisperAll()
            }
        }))
        menu.popup({ window: remote.getCurrentWindow() })
    })


    var $websockets = $('.ws-table')
    $websockets.bind('contextmenu', (e) => {
        var identifier = $(e.target.parentElement)[0].children[0].innerText
        e.preventDefault()
        var menu = new Menu()
        menu.append(new MenuItem({
            label: "Toggle Connection",
            click: function (id) {
                var poesocket = global.websockets[identifier]
                if (poesocket.ws.readyState <= 1) {
                    poesocket.ws.close()
                } else if (poesocket.ws.readyState == 3) {
                    if (poesocket.disabled) {
                        poesocket.disabled = false
                    }
                    poesocket.openWebsocket()
                }
            }
        }))
        menu.popup({ window: remote.getCurrentWindow() })
    })
})

// Load kalandra version

$(function () {
    const projectPackage = require(getFilePath('package.json'))
    $('#version-text').html('Kalandra v' + projectPackage['version'])
})

function saveOnEnter(configValues) {
    return (e) => {
        if (e.key == 'Enter') {
            configValues.general.sessid = $('#sessid-input').val()
            configValues.general.league = $('#league-input').val()
            saveConfig(configValues)
        }
    }
}

function openConfigTab(tabName) {
    // Hide all config divs
    let configValues = loadConfigValues()
    if (tabName == 'general') {
        $('#sessid-input').val(config.general.sessid)
        $('#league-input').val(config.general.league)

        $('#sessid-input').on('keydown', saveOnEnter(configValues))
        $('#league-input').on('keydown', saveOnEnter(configValues))
    } else if (tabName == 'filters') {
        $('#filters-table-body').empty()
        for (var identifier in configValues.filters) {
            $('#filters-table-body').append('<tr class="listing" id="{0}"></tr>'.format(identifier, identifier))
                .append('<td class="filter-name" onclick="openModal(\'{0}\')">{1} | {0}</td>'.format(identifier, configValues.filters[identifier].displayName))
        }
        $('#filters-table-body').append('<tr class="listing" id="new-filter"></tr>')
            .append('<td class="filter-name new-filter" onclick="openModal(\'new\')">New Filter</td>')
    }

    $('#config').find('div.tabcontent').each((i, div) => {
        $(div).css(
            {
                'display': 'none',
                'background-color': 'none'
            }
        )
    })

    // Show clicked config div
    $('#config-' + tabName).css(
        {
            'display': 'block',
            'background-color': 'rgb(26, 26, 26)'
        }
    )


}

global.autoWhisperToggled = true