const Websocket = require('ws')
const cookie = require('cookie')
var ncp = require('copy-paste')
const { Menu, MenuItem } = remote

const REQ_HEADERS = {
	'Content-Type': 'application/json',
	'Origin': 'https://www.pathofexile.com',
	'Host': 'www.pathofexile.com',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

var LISTING_ID = 0

function getListingId() {
	LISTING_ID += 1
	return LISTING_ID
}

ws_states = {
	'0': 'Connecting',
	'1': 'Open',
	'2': 'Closing',
	'3': 'Closed'
}

function ws_logger(desc, msg) {
	console.log("websocket.js [{0}] {1}".format(desc, msg))
}

var websockets = {}

class PoESocket {
	constructor(league, identifier, POESESSID, config, disabled) {
		this.league = league
		this.identifier = identifier
		this.session_id = POESESSID
		this.config = config
		this.disabled = disabled
		this.fetchExchange = config['fetchExchange']
		this.offerCurrency = config['offerCurrency']
		this.offerPrice = config['offerPrice']
		this.autoWhisper = config['autoWhisper']
		this.minStock = 'minStock' in config ? config['minStock'] : 1
		this.maxStock = 'maxStock' in config ? config['maxStock'] : 999999
		this.maxPrice = 'maxPrice' in config ? config['maxPrice'] : 999999
		this.displayName = 'displayName' in config ? config['displayName'] : null

		console.log("PoESocket: " + identifier)
		console.log("SESSID: " + POESESSID)
		console.log(`wss://www.pathofexile.com/api/trade/live/${this.league}/${this.identifier}`)
		console.log(`wss://www.pathofexile.com/api/trade/live/Expedition/bGyVvGauL`)

		this.openWebsocket()

		var $this = this

		// Right click toggle websocket
		$(function () {
			$('.ws-table').find('tbody').prepend(
				$('<tr class="listing">')
					.append($('<td data-key="identfier">').append($this.identifier))
					.append($('<td data-key="name">').append($this.displayName))
					.append($('<td data-key="status">').append(ws_states[$this.ws.readyState.toString()]))
			)
		})
	}

	openWebsocket() {
		this.ws = new Websocket(
			`wss://www.pathofexile.com/api/trade/live/${this.league}/${this.identifier}`,
			[],
			{
				'headers': {
					'Cookie': cookie.serialize('POESESSID', this.session_id),
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
					'Origin': 'https://www.pathofexile.com/',
					'Host': 'www.pathofexile.com'
				}
			}
		)
		this.ws.onopen = async () => {
			if (this.disabled) {
				this.ws.close()
			} else {
				this.onOpen()
			}
		}
		this.ws.onerror = async (err) => {
			this.onError(err)
		}
		this.ws.onclose = async () => {
			this.onClose()
		}
		this.ws.onmessage = async (m) => {
			if (!this.disabled) {
				this.onMessage(m)
			}
		}

		websockets[this.identifier] = this
	}

	updateConnectionStatus() {
		$($('.ws-table').find('tbody')[0].children).each((i, el) => {
			var $el = $(el)
			if ($el[0].children[0].innerText == this.identifier) {
				$($el[0].children[2]).html(ws_states[this.ws.readyState.toString()])
			}
		})
	}

	/// Fetch item info from listing ids given from websocket
	async queryFetch(url, ids) {
		return await fetch(url, {
			'headers': REQ_HEADERS
		})
			.then(response => response.json())
			.then(data => {
				return data.result
			})
	}


	// Parse item info into the data we need based on query type (exchange / search)
	parseResults(results) {
		var cache = []
		var res = []
		results.forEach((item) => {
			if (!item) {
				return;
			}

			var parsed = {
				'listing-id': item['id'],
				'name': !this.fetchExchange ? '{0} {1}'.format(item['item']['name'], item['item']['typeLine']) : item['item']['typeLine'],
				'real-name': item['item']['typeLine'],
				'count': this.fetchExchange ? item['listing']['price']['item']['stock'] : ('stackSize' in item['item']) ? item['item']['stackSize'] : 1,
				'currency-type': this.fetchExchange ? item['listing']['price']['exchange']['currency'] : (item['listing']['price'] != null ? item['listing']['price']['currency'] : null),
				'price': this.fetchExchange ? item['listing']['price']['exchange']['amount'] : (item['listing']['price'] != null ? item['listing']['price']['amount'] : 0),
				'seller': item['listing']['account']['lastCharacterName'],
				'whisper': null
			}

			if (parsed['currency-type'] == null && this.offerCurrency == null ||
				parsed['price'] == 0 && this.offerPrice == null) {
				ws_logger('parseResults', 'Item skipped (Reason: item is unlisted and there is no offer set in configuration)')
				return
			}

			if (parsed['currency-type'] == null) {
				parsed['currency-type'] = this.offerCurrency
			}

			if (this.offerCurrency && parsed['currency-type'] != this.offerCurrency) {
				ws_logger('parseResults', 'Item skipped (Reason: offer currency does not match priced currency)')
				return
			}

			if (parsed['price'] == 0) {
				item['listing']['whisper'] = null // force offer whisper
				parsed['full-cost'] = Math.round(this.offerPrice * parsed['count'])
			} else {
				parsed['full-cost'] = parsed['price'] * parsed['count']
			}

			if (item['listing']['whisper'] != null) {
				parsed['whisper'] = item['listing']['whisper'].format(
					parsed['count'],
					parsed['full-cost']
				)
			} else {
				if (parsed['count'] == 1) {
					parsed['whisper'] = "@{0} Hi, I'd like to offer {1} {2} for your {3} in {4}.".format(
						parsed['seller'],
						parsed['full-cost'],
						parsed['currency-type'],
						parsed['name'],
						item['item']['league']
					)
				} else {
					parsed['whisper'] = "@{0} Hi, I'd like to offer {1} {2} for your {3} {4} in {5}.".format(
						parsed['seller'],
						parsed['full-cost'],
						parsed['currency-type'],
						parsed['count'],
						parsed['name'],
						item['item']['league']
					)
				}
			}

			parsed['raw'] = item

			parsed['whisper'] = parsed['whisper'].replace(/"/g, "'")

			if (!cache.includes(parsed['whisper']) && !getCurrentWhispers().includes(parsed['whisper'])) {
				res.push(parsed)
				cache.push(parsed['whisper'])
			}

		})
		return res
	}

	insertListing(item) {
		var date = new Date()
		var expiration = new Date(date.getTime() + this.config.expire * 1000)
		var $this = this
		var listing_id = getListingId()
		$(function () {
			$('.listing-table').find('tbody').prepend(
				$('<tr class="listing" id="L' + listing_id + '" expiration="' + expiration.toString() + '" whisper="' + item['whisper'] + '">')
					.append($('<td data-key="item">').append($this.displayName != null ? $this.displayName : item['name']))
					.append($('<td data-key="buyout">').append('{0} {1}'.format(item['full-cost'], currencyShortName(item['currency-type']))))
					.append($('<td data-key="qty">').append(item['count']))
					.append($('<td data-key="seller">').append(item['seller']))
			)
			$('#L' + listing_id).click(function () {
				sendWhisper([item['whisper']])
				recolor(listing_id)
			})
		})
		return listing_id
	}

	async onMessage(m) {
		var data = JSON.parse(m.data)

		if ('new' in data) {
			var ids = data['new'].join(',')

			if (this.fetchExchange) {
				var results = await this.queryFetch(
					`https://www.pathofexile.com/api/trade/fetch/${ids}?query=${this.identifier}&exchange`,
					ids
				)
			} else {
				var results = await this.queryFetch(
					`https://www.pathofexile.com/api/trade/fetch/${ids}?query=${this.identifier}`,
					ids
				)
			}

			let parsed = new Set(this.parseResults(results))
			let messages = []
			let id_cache = []
			parsed.forEach((item) => {
				if (item['count'] <= this.maxStock &&
					item['count'] >= this.minStock &&
					item['price'] <= this.maxPrice &&
					!BlockList.isBlockedUser(item['seller'])) {

					if (!getCurrentWhispers().includes(item['whisper'])) {
						console.log(
							'> ' + getCurrentWhispers().includes(item['whisper']).toString() + '\n' +
							'>> ' + item['whisper'] + '\n'
						)
						var listing_id = this.insertListing(item)
						if (this.autoWhisper && global.autoWhisperToggled) {
							messages.push(item['whisper'])
							id_cache.push(listing_id)
						}
					}
				}
			})

			if (this.autoWhisper && global.autoWhisperToggled) {
				id_cache.forEach((id) => {
					// why the fuck does jquery make shit magically work
					$(function () {
						recolor(id)
					})
				})
				if (messages.length !== 0) {
					sendWhisper(messages)
				}
			}
		}
	}

	onError(err) {
		this.updateConnectionStatus()
		console.log(err)
		ws_logger('onError', 'Websocket error ({0}): {1}'.format(this.identifier, err))
	}

	onOpen() {
		this.updateConnectionStatus()
		ws_logger('onOpen', 'Websocket opened ({0})'.format(this.identifier))
	}

	onClose() {
		this.updateConnectionStatus()
		ws_logger('onClose', 'Websocket closed ({0})'.format(this.identifier))
	}
}