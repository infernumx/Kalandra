const { app, BrowserWindow, ipcMain } = require('electron')
const { Server } = require('ws')

var debug = false

function createWindow(filename, width, height, devTools) {
	const win = new BrowserWindow({
		width: width,
		height: height,
		icon: 'Resources/icon.ico',
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true
		}
	})

	win.setMenu(null)
	win.setAlwaysOnTop(true, 'normal');
	win.loadFile(filename)
	if (devTools) {
		win.webContents.openDevTools()
	}
}

app.allowRendererProcessReuse = false
app.whenReady().then(() => {
	createWindow('app/index.html', 500, 450, debug)
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})