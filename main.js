// Dependencias
const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron')
const fs = require('fs')
const path = require('path')
const lineByLine = require('n-readlines')
const { autoUpdater } = require('electron-updater')

const sentryConfig = require('./config')
const sentry = require('@sentry/electron')

// Live reload
if (process.env.ELECTRON_ENV && process.env.ELECTRON_ENV.toString().trim() == 'development') {
	console.warn('Live reload activado')
	require('electron-reload')(__dirname)
}
else {
	sentry.init({ dsn: sentryConfig.sentryDSN })
}

// Variables
const databaseLocation = 'database.json'
let gameLocation
let songsLocation

// Información
let songList
let songsData = {}

// Ventana
let win
// Pantalla de carga
let loadingScreen

function startApp () {
	// Si la base de datos existe
	if (fs.existsSync(databaseLocation)) {
		// Cargar base de datos
		loadDatabase()
		// Abrir ventana
		createMainWindow()
	}
	else {
		// Repetir hasta seleccionar carpeta correcta
		do {
			gameLocation = selectFolder()
		} while (!searchSongsFolder())

		// Abrir pantalla de carga
		showLoadingScreen()
	}
}

app.on('ready', startApp)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (win === null) {
    startApp()
  }
})

// Cambiar título
ipcMain.on('change-player-title', (event, title) => {
	win.setTitle(`${title} | osu! player by AlexAzumi`)
})

/**
 * Abrir ventana de información
 */
const openAbout = () => {
	let about = new BrowserWindow({
		parent: win,
		height: 200,
		width: 300,
		frame: false,
		webPreferences: {
			nodeIntegration: true
		}
	})

	about.loadFile('src/about/about.html')
}

/**
 * Abrir pantalla de carga
 */
const showLoadingScreen = () => {
	loadingScreen = new BrowserWindow({
		height: 200,
		width: 300,
		frame: false,
		webPreferences: {
			nodeIntegration: true
		}
	})

	loadingScreen.loadFile('src/loading/loading.html')

	// Al cargar obtener canciones
	loadingScreen.webContents.on('did-finish-load', () => {
		// Liste de carpetas
		songList = listSongs()

		// Obtener información
		songsData.gameLocation = gameLocation
		songsData.songs = getSongData()

		// Escribir a archivo
		createDatabase()

		// Cargar base de datos
		loadDatabase()
		
		// Crear ventana de reproductor
		createMainWindow()

		// Cerrar pantalla de carga
		loadingScreen.close()

	})
}

/**
 * Leer/crear base de datos
 */
const createMainWindow = () => {
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
	if (process.env.ELECTRON_ENV) {
		win.webContents.openDevTools()
	}

	// Establecer iconos
	win.setThumbarButtons([
		{
			tooltip: 'Anterior',
			icon: path.join(__dirname, 'assets/icons/previous.png'),
			click () {
				win.webContents.send('previous-button')
			}
		},
		{
			tooltip: 'Reproducir',
			icon: path.join(__dirname, `assets/icons/play.png`),
			click () {
				win.webContents.send('play-button')
			}
		},
		{
			tooltip: 'Siguiente',
			icon: path.join(__dirname, 'assets/icons/next.png'),
			click () {
				win.webContents.send('next-button')
			}
		}
	])

	// Establecer menú
	const menu = Menu.buildFromTemplate([
		{
			label: 'Inicio',
			submenu: [
				{
					label: 'Actualizar lista de canciones',
					click() { refreshDatabase() }
				},
				{
					type: 'separator'
				},
				{
					label: 'Salir',
					click() { app.quit() }
				}
			]
		},
		{
			label: 'Ayuda',
			submenu: [
				{
					label: 'Refrescar ventana',
					accelerator: 'CmdOrCtrl+R',
					click() {
						win.reload()
					}
				},
				{
					type: 'separator'
				},
				{
					label: 'Acerca de osu! player',
					click() { openAbout() }
				}
			]
		}
	])
	Menu.setApplicationMenu(menu)

	// Establecer icono
	win.setIcon(path.join(__dirname, 'assets/icons/win/icon.ico'))

  // Emitido cuando la ventana es cerrada
  win.on('closed', () => {
    win = null
	})

	// Enviar contenido cuando termine de cargar el contenido
	win.webContents.on('did-finish-load', () => {
		// Enviar información
		sendDataToPlayer()
		// Establecer Sentry
		if (process.env.ELECTRON_ENV === undefined) {
			win.webContents.send('activate-sentry')
		}
		// Verificar actualizaciones
		if (!process.env.ELECTRON_ENV) {
			autoUpdater.checkForUpdates()
		}
	})
}

/**
 * Refrescar lista
 */
const refreshDatabase = () => {
	// Cargar dirección
	const database = fs.readFileSync(databaseLocation)
	gameLocation = JSON.parse(database).gameLocation
	console.log(gameLocation)

	// Verificar carpeta
	if (searchSongsFolder()) {
		// Liste de carpetas
		songList = listSongs()

		// Obtener información
		songsData = {}
		songsData.gameLocation = gameLocation
		songsData.songs = getSongData()

		// Escribir a archivo
		createDatabase()

		// Cargar
		loadDatabase()

		// Enviar datos
		sendDataToPlayer()
	}
	else {
		dialog.showErrorBox(
			'Error #AZ002',
			'La carpeta "Songs" no existe o fue cambiada de dirección'
		)
	}
}

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
					else if (line.includes('[Events]'))
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
	// Verificar si existe la base de datos
	if (fs.existsSync(databaseLocation)) {
		fs.unlinkSync(databaseLocation)
	}
	// Dar formato apropiado
	let content = JSON.stringify(songsData, null, 2)
	// Escribir archivo
	fs.writeFileSync('database.json', content, 'utf-8')
}

/**
 * Enviar datos al reproductor
 */
const sendDataToPlayer = () => {
	win.webContents.send('loaded-songs', songsList)
}

/**
 * Cargar base de datos
 */
const loadDatabase = () => {
	// Cargar archivo
	const load = fs.readFileSync(databaseLocation)
	// Almacenar en variable
	songsList = JSON.parse(load).songs
}

/*
 * Eventos de actualizaciones automáticas
 */

// Actualización disponible
autoUpdater.on('update-available', () => {
	win.webContents.send('update-available')
})

// Error al actualizar
autoUpdater.on('error', (error) => {
	win.webContents.send('update-error', error)
})

// Actualización descargada
autoUpdater.on('update-downloaded', () => {
	win.webContents.send('update-downloaded')
})

/*
 * Acciones recibidas desde render
 */
ipcMain.on('update-accepted', () => {
	autoUpdater.downloadUpdate()
})

ipcMain.on('quit-and-install', () => {
	autoUpdater.quitAndInstall()
})
