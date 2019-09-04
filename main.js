// Dependencias
const { app, BrowserWindow, dialog } = require('electron')
const fs = require('fs')
const path = require('path');

// Variables
const databaseLocation = 'database.json'
let gameLocation
let songsLocation

let songList

// Ventana
let win

function createWindow () {
  // Crear ventana
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })

	// Cargar el archivo
  win.loadFile('src/home/home.html')

  // Abrir herramientas de desarrollador
  win.webContents.openDevTools()

  // Emitido cuando la ventana es cerrada
  win.on('closed', () => {
    win = null
	})
	
	if (fs.existsSync(databaseLocation)) {
		console.log('Existe')
	}
	else {
		// Repetir hasta seleccionar carpeta correcta
		do {
			gameLocation = selectFolder()
		} while (!searchSongsFolder())

		// Liste de carpetas
		songList = listSongs()

		for (let song of songList) {
			console.log(song)
		}
	}
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (win === null) {
    createWindow()
  }
})

/**
 * Selecionar carpeta
 */
const selectFolder = () => {
	// Solicitar carpeta al usuario
	const folder = dialog.showOpenDialogSync({
		title: 'Selecciona la carpeta de osu!',
		properties: [
			'openDirectory'
		]
	})

	// Carpeta seleccionada
	if (folder !== undefined) {
		return folder[0]
	}

	// No se seleccionó una carpeta
	return undefined
}

/**
 * Buscar carpeta llamada 'Songs'
 */
const searchSongsFolder = () => {
	// Nunca se seleccionó carpeta
	if (gameLocation === undefined) {
		app.exit(-1)
	}
	// Se seleccionó la carpeta correcta
	else if (fs.existsSync(path.join(gameLocation, 'Songs'))) {
		songsLocation = path.join(gameLocation, 'Songs')
		return true
	}
	// Se seleccionó la carpeta incorrecta
	else {
		return false
	}
}

/**
 * Analizar carpeta de 'Songs'
 */
const listSongs = () => {
	return songs = fs.readdirSync(songsLocation)
}