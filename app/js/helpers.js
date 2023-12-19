const path = require('path')
const fs = require('fs')


function getFilePath(filename) {
	var path_1 = path.join(process.resourcesPath, filename)
	var path_2 = __dirname + '/../' + filename
	if (fs.existsSync(path_1)) {
		return path_1
	} else if (fs.existsSync(path_2)) {
		return path_2
	}
}

String.prototype.format = String.prototype.format ||
	function () {
		"use strict"
		var str = this.toString()
		if (arguments.length) {
			var t = typeof arguments[0]
			var key
			var args = ("string" === t || "number" === t) ?
				Array.prototype.slice.call(arguments)
				: arguments[0]

			for (key in args) {
				str = str.replace(new RegExp("\\{" + key + "\\}", "gi"), args[key])
			}
		}

		return str
	}

String.prototype.addSlashes = function () {
	//no need to do (str+'') anymore because 'this' can only be a string
	return this.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0')
}


function sendWhisper(whisper) {
	keyboardserver.whisper(whisper)
}

function recolor(listing_id) {
	var el = $('#L' + listing_id)
	el.addClass('listing-clicked')
}


// Remove expired listings
function removeExpired() {
	$(function () {
		$('tr.listing').each((i, tr) => {
			tr = $(tr)
			var now = new Date()
			var expiration = new Date(tr.attr('expiration'))
			if (now >= expiration) {
				tr.remove()
			}
		})
	})
}

setInterval(removeExpired, 1000)

shortNames = {
	'chaos': 'c',
	'exalted': 'ex'
}


function currencyShortName(currency) {
	return currency in shortNames ? shortNames[currency] : currency
}

const BlockList = {
	path: 'Resources/blocklist.json'
}

BlockList.load = () => {
	if (!fs.existsSync(BlockList.path)) {
		fs.writeFileSync(BlockList.path, JSON.stringify([]), 'utf8')
		return []
	}
	return JSON.parse(fs.readFileSync(BlockList.path, 'utf8'))
}

BlockList.isBlockedUser = (user) => {
	var blockList = BlockList.load()
	return blockList.includes(user)
}

BlockList.addUser = (user) => {
	var blockList = BlockList.load()
	blockList.push(user)
	try {
		fs.writeFileSync(BlockList.path, JSON.stringify(blockList), 'utf8')
	} catch (err) {
		console.error(err)
	}
}

function getCurrentWhispers() {
	var whispers = []
	$($($('.listing-table')[0].children[1])[0].children).each((i, el) => {
		let $el = $(el);
		if ($el.length !== 0) {
			whispers.push($($el[0]).attr('whisper'))
		}
	})
	return whispers
}

function getUnwhispered(setClickStatus) {
	var whispers = []
	$($($('.listing-table')[0].children[1])[0].children).each((i, el) => {
		let $el = $(el)
		if ($el.length !== 0) {
			var listing = $($el[0])
			if (!listing.hasClass('listing-clicked')) {
				whispers.push(listing.attr('whisper'))
				if (setClickStatus) {
					listing.addClass('listing-clicked')
				}
			}
		}
	})
	return whispers
}

function whisperAll() {
	var unwhispered = getUnwhispered(true)
	sendWhisper(unwhispered.slice(0, 9))
}

function toggleAutoWhisper() {
	global.autoWhisperToggled = !global.autoWhisperToggled
	console.log('Autowhisper toggled to ' + global.autoWhisperToggled.toString())
}

function openConfig() {
	$("#config").style.display = "block"
}

function loadConfigValues() {
	const config = JSON.parse(fs.readFileSync(getFilePath('Resources/config.json')));
	return config
}

function saveConfig(configValues) {
	fs.writeFile(getFilePath('Resources/config.json'), JSON.stringify(configValues, null, 4), (err) => {
		if (err) {
			alert('An error ocurred creating the file ' + err.message)
		}
	})
	alert("Config Saved!")
}