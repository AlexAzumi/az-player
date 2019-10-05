// Dependencias
const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron')
const { autoUpdater } = require('electron-updater')
const fs = require('fs')
const path = require('path')
const sentry = require('@sentry/electron')

// Manager
const Manager = require('./src/manager')

// Directorio del usuario
const homeDir = require('os').homedir()

// Información de la applicación
const package = require('./package.json')

/*
 * Configuración del actualizador automático
 */
autoUpdater.autoDownload = false

/*
 * Configuración del entorno
 */
if (process.env.ELECTRON_ENV && process.env.ELECTRON_ENV.toString().trim() == 'development') {
	console.warn('Live reload activado')
	require('electron-reload')(__dirname)
}
else {
	sentry.init({ dsn: package.sentryDSN })
}

/*
 * Manager
 */
let manager = new Manager(app)

/*
 * Base de datos
 */
const database = {
	location: path.join(homeDir, 'osu-player', 'database.json'),
	folder: path.join(homeDir, 'osu-player')
}

// Información de base de datos
let songsData = {}

/*
 * Ventanas
 */

// Reproductor
let playerWindow
// Pantalla de carga
let loadingScreen
// Sobre el programa
let aboutWindow

/**
 * Iniciar aplicación
 */
function startApp() {
	// Si la base de datos existe
	if (fs.existsSync(database.location)) {
		// Cargar base de datos
		songsData = manager.loadDatabase(database.location)
		// Abrir ventana
		createMainWindow()
	}
	else {
		// Repetir hasta seleccionar carpeta correcta
		do {
			songsData.gameLocation = manager.selectGameFolder()
		} while (!manager.searchSongsFolder(songsData.gameLocation))

		// Abrir pantalla de carga
		showLoadingScreen()
	}
}

// Aplicación lista
app.on('ready', startApp)

// Todas las ventanas han sido cerradas
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Ventana activa
app.on('activate', () => {
  if (playerWindow === null) {
    startApp()
  }
})

// Cambiar título
ipcMain.on('change-player-title', (event, title) => {
	playerWindow.setTitle(`${title} | osu! player`)
})

// Refrescar base de datos
ipcMain.on('refresh-database', refreshDatabase)

// Abrir about
ipcMain.on('open-about', openAbout)

/**
 * Abrir ventana de información
 */
function openAbout() {
	// Verificar si está abierta
	if (aboutWindow !== undefined && aboutWindow !== null) {
		return
	}

	// Crear ventana
	aboutWindow = new BrowserWindow({
		parent: playerWindow,
		height: 340,
		width: 300,
		frame: false,
		resizable: false,
		webPreferences: {
			nodeIntegration: true
		}
	})
	// Cargar página
	aboutWindow.loadFile('src/about/about.html')
	// Evento de ventana cerrada
	aboutWindow.on('closed', () => {
		aboutWindow = null
	})
}

/**
 * Enviar datos al reproductor
 */
function sendDataToPlayer() {
	playerWindow.webContents.send('loaded-songs', songsData.songs)
}

/**
 * Abrir pantalla de carga
 */
function showLoadingScreen() {
	// Crear ventana
	loadingScreen = new BrowserWindow({
		height: 200,
		width: 300,
		frame: false,
		webPreferences: {
			nodeIntegration: true
		}
	})
	// Cargar página
	loadingScreen.loadFile('src/loading/loading.html')

	// Al cargar obtener canciones
	loadingScreen.webContents.on('did-finish-load', () => {
		// Listar carpetas dentro de "Songs"
		songList = manager.listSongsFolder(path.join(songsData.gameLocation, 'Songs'))
		// Obtener información
		songsData.songs = manager.getSongsData(path.join(songsData.gameLocation, 'Songs'))
		// Escribir a archivo
		manager.createDatabase(database, songsData)
		// Crear ventana de reproductor
		createMainWindow()

		// Cerrar pantalla de carga
		loadingScreen.close()
	})
	// Evento de ventana cerrada
	loadingScreen.on('closed', () => {
		loadingScreen = null
	})
}

/**
 * Leer/crear base de datos
 */
function createMainWindow() {
	// Crear ventana
  playerWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: true
		},
		minHeight: 720,
		minWidth: 600,
		frame: false
  })
	
	// Cargar el archivo
  playerWindow.loadFile('src/home/home.html')

	// Abrir herramientas de desarrollador
	if (process.env.ELECTRON_ENV) {
		playerWindow.webContents.openDevTools()
	}

	// Establecer iconos
	playerWindow.setThumbarButtons([
		{
			tooltip: 'Anterior',
			icon: path.join(__dirname, 'assets/icons/previous.png'),
			click () {
				playerWindow.webContents.send('previous-button')
			}
		},
		{
			tooltip: 'Reproducir',
			icon: path.join(__dirname, `assets/icons/play.png`),
			click () {
				playerWindow.webContents.send('play-button')
			}
		},
		{
			tooltip: 'Siguiente',
			icon: path.join(__dirname, 'assets/icons/next.png'),
			click () {
				playerWindow.webContents.send('next-button')
			}
		}
	])

	Menu.setApplicationMenu(null)

	// Establecer icono
	playerWindow.setIcon(path.join(__dirname, 'assets/icons/win/icon.ico'))

  // Emitido cuando la ventana es cerrada
  playerWindow.on('closed', () => {
    playerWindow = null
	})

	// Enviar contenido cuando termine de cargar el contenido
	playerWindow.webContents.on('did-finish-load', () => {
		// Enviar información
		sendDataToPlayer()
		// Verificar actualizaciones
		if (!process.env.ELECTRON_ENV) {
			autoUpdater.checkForUpdates()
		}
	})
}

/**
 * Refrescar lista
 */
function refreshDatabase() {
	// Cargar dirección
	const file = fs.readFileSync(database.location)
	songsData = JSON.parse(file)
	console.log(songsData.gameLocation)

	// Verificar carpeta
	if (manager.searchSongsFolder(songsData.gameLocation)) {
		// Liste de carpetas
		songList = manager.listSongsFolder(path.join(songsData.gameLocation, 'Songs'))
		// Obtener información
		songsData.songs = manager.getSongsData(path.join(songsData.gameLocation, 'Songs'))
		// Escribir a archivo
		manager.createDatabase(database, songsData)

		// Enviar datos
		sendDataToPlayer()
	}
	else {
		// Reportar a Sentry
		sentry.withScope((scope) => {
			// Extras
			scope.setExtra('Base de datos', songsData.gameLocation)
			// Reportar
			sentry.captureMessage('La carpeta "Songs" no existe o fue cambiada de dirección')
		})
		// Mostrar error
		dialog.showErrorBox(
			'Error #AZ002',
			'La carpeta "Songs" no existe o fue cambiada de dirección'
		)
	}
}

/*
 * Eventos de actualizaciones automáticas
 */

// Actualización disponible
autoUpdater.on('update-available', () => {
	playerWindow.webContents.send('update-available')
})

// Error al actualizar
autoUpdater.on('error', (error) => {
	playerWindow.webContents.send('update-error', error)
})

// Actualización descargada
autoUpdater.on('update-downloaded', () => {
	playerWindow.webContents.send('update-downloaded')
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
