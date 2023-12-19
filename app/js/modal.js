const { ipcRenderer } = require('electron')

let baseIdentifier = null
let baseDisabled = null
let newFilter = false

ipcRenderer.on('store-data', function (event, store) {
    baseIdentifier = store.filterIdentifier
    let configValues = loadConfigValues()
    if (store.filterIdentifier in configValues.filters) {
        let identifierConfig = configValues.filters[store.filterIdentifier]
        baseDisabled = identifierConfig.disabled
        $('#displayName').val(identifierConfig.displayName)
        $('#identifier').val(store.filterIdentifier)
        $('#offerCurrency').val(identifierConfig.offerCurrency)
        $('#offerPrice').val(identifierConfig.offerPrice)
        $('#minStock').val(identifierConfig.minStock)
        $('#maxStock').val(identifierConfig.maxStock)
        $('#maxPrice').val(identifierConfig.maxPrice)
        $('#expire').val(identifierConfig.expire)

        $('#fetchExchange').prop('checked', identifierConfig.fetchExchange)
        $('#autoWhisper').prop('checked', identifierConfig.autoWhisper)
        $('#disabled').prop('checked', identifierConfig.disabled)
    } else if (store.filterIdentifier == "new") {
        newFilter = true
    }
});

function saveFilter() {
    let identifier = $('#identifier').val()
    let displayName = $('#displayName').val()
    let offerCurrency = $('#offerCurrency').val()
    let offerPrice = parseInt($('#offerPrice').val())
    let minStock = parseInt($('#minStock').val())
    let maxStock = parseInt($('#maxStock').val())
    let maxPrice = parseInt($('#maxPrice').val())
    let expire = parseInt($('#expire').val())
    let fetchExchange = $('#fetchExchange').prop('checked')
    let autoWhisper = $('#autoWhisper').prop('checked')
    let disabled = $('#disabled').prop('checked')

    let identifierConfig = {
        displayName: displayName,
        offerCurrency: offerCurrency,
        offerPrice: offerPrice,
        minStock: minStock,
        maxStock: maxStock,
        maxPrice: maxPrice,
        expire: expire,
        fetchExchange: fetchExchange,
        autoWhisper: autoWhisper,
        disabled: disabled
    }

    if (newFilter) {
        emote.getCurrentWindow().getParentWindow().send('new-filter', identifierConfig)
    }

    if (baseDisabled != disabled) {
        console.log("toggling")
        console.log(global.window)
        remote.getCurrentWindow().getParentWindow().send('toggle-filter', { identifier: identifier, disabled: disabled })
    }

    let config = loadConfigValues()
    config.filters[identifier] = identifierConfig
    if (identifier !== baseIdentifier) {
        delete config.filters[baseIdentifier]
    }
    saveConfig(config)
}

function deleteFilter() {
    let config = loadConfigValues()
    delete config.filters[baseIdentifier]
    saveConfig(config)
}