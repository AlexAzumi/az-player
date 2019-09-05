// Dependencias
const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')
const lineByLine = require('n-readlines')
// Live reload
require('electron-reload')(__dirname)

// Variables
const databaseLocation = 'database.json'
let gameLocation
let songsLocation

// Información
let songList
let songsData

// Ventana
let win

function createWindow () {
  // Crear ventana
  win = new BrowserWindow({
    width: 1280,
    height: 720,
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

	// Enviar contenido cuando termine de cargar el contenido
	win.webContents.on('did-finish-load', () => {
		sendDataToPlayer()
	})
	
	// Si la base de datos existe
	if (fs.existsSync(databaseLocation)) {
		// Cargar base de datos
		loadDatabase()
	}
	else {
		// Repetir hasta seleccionar carpeta correcta
		do {
			gameLocation = selectFolder()
		} while (!searchSongsFolder())

		// Liste de carpetas
		songList = listSongs()

		// Obtener información
		songsData = getSongData()

		// Escribir a archivo
		createDatabase()
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
	return fs.readdirSync(songsLocation)
}

/**
 * Obtener información del beatmap
 */
const getSongData = () => {
	// Información alamacenada temporalmente
	let tempPath = []
	let tempMusics = []
	let tempTitles = []
	let tempArtists = []
	let tempBgs = []

	// Pasar canción por canción encontrada
	for (let song of songList) {
		const folderPath = path.join(songsLocation, song);
		// Leer directorio
		const files = fs.readdirSync(folderPath)
		// Almacenar dirección
		tempPath.push(folderPath)
		// Buscar archivos
		for (let file of files) {
			if (file.includes('.osu') || file.includes('.OSU')) {
				console.log(`Archivo .osu encontrado! ${file}`)
				// Banderas
				let foundMusic = false
				let foundTitle = false
				let foundArtist = false
				let foundBg = false

				let nextIsBg = false

				// Dirección del archivo
				let filePath = path.join(songsLocation, song, file)

				// Crear instancia
				const liner = new lineByLine(filePath)

				// Leer lineas
				let line

				while (line = liner.next()) {
					line = line.toString('ascii')
					// Título encontrado
					if (line.includes('Title:')) {
						line = line.replace('Title:', '')
						tempTitles.push(line)
						foundTitle = true
					}
					// Artista encontrado
					else if (line.includes('Artist:')) {
						line = line.replace('Artist:', '')
						console.log(`Artista: ${line}`)
						tempArtists.push(line)
						foundArtist = true
					}
					// Nombre de audio encontrado
					else if (line.includes('AudioFilename:')) {
						line = line.replace('AudioFilename: ', '')
						tempMusics.push(line)
						foundMusic = true
					}
					else if (nextIsBg) {
						// Crear regex
						const checkRegex = RegExp('\"(.)+.(jpg|png)\"', 'i')
						// Probar regex
						if (checkRegex.test(line)) {
							line = line.split('"')
							tempBgs.push(line[1])

							foundBg = true
							nextIsBg = false
						}
					}
					else if (line.includes('//Background and Video events'))
					{
						nextIsBg = true
					}

					// Toda la información necesaria fue encontrada
					if (foundMusic && foundArtist && foundTitle && foundBg) {
						break
					}
				}

				if (nextIsBg) {
					tempBgs.push('NONE')
				}

				// Dejar de buscar archivos en carpeta
				break
			}
		}
	}

	// Almacenar información temporalmente
	let tempMusicInfo = []

	for (let i = 0; i < tempMusics.length; i++) {
		tempMusicInfo.push({
			path: tempPath[i],
			musicFile: tempMusics[i].replace(/\r/, ''),
			title: tempTitles[i].replace(/\r/, ''),
			artist: tempArtists[i].replace(/\r/, ''),
			background: tempBgs[i].replace(/\r/, '')
		})
	}

	return tempMusicInfo
}

/**
 * Crear base de datos
 */
const createDatabase = () => {
	// Dar formato apropiado
	let content = JSON.stringify(songsData, null, 2)
	// Escribir archivo
	fs.writeFileSync('database.json', content, 'utf-8')
}

/**
 * Enviar datos al reproductor
 */
const sendDataToPlayer = () => {
	win.webContents.send('loaded-songs', songsData)
}

/**
 * Cargar base de datos
 */
const loadDatabase = () => {
	// Cargar archivo
	const load = fs.readFileSync(databaseLocation)
	// Almacenar en variable
	songsData = JSON.parse(load)
}