// Dependencias
const { dialog } = require('electron').remote
const { init, showReportDialog } = require('@sentry/electron')
const { remote } = require('electron')
const $ = require('jquery')
const ipc = require('electron').ipcRenderer
const package = require('../../package.json')
// Librerías
const Bar = require('./lib/bar')
const LocalizationManager = require('../localization')
const Player = require('./lib/player')
const Search = require('./lib/search')
const Window = require('./lib/window')

/*
 * Iniciar Sentry
 */
init({
	dsn: package.sentryDSN,
	beforeSend(event) {
		// Verificar si es una exepción
		if (event.exception) {
			showReportDialog()
		}

		return event
	}
})

// Localización
const localization = new LocalizationManager()
$(document).ready(() => {
	// Caja de actualización
	$('#updateBoxTitle').text(localization.getString('update.box.title'))
	$('#declineUpdateBtn').text(localization.getString('update.laterBtn'))
	$('#acceptUpdateBtn').text(localization.getString('update.updateBtn'))
	// Barra
	$('#homeMenu').text(localization.getString('menu.home.title'))
	$('#updateDatabaseText').text(localization.getString('menu.home.updateDatabase'))
	$('#exitAppButton').text(localization.getString('menu.home.exit'))

	$('#sortMenu').text(localization.getString('menu.sort.title'))
	$('#orderByArtist').text(localization.getString('menu.sort.byArtist'))
	$('#orderByTitle').text(localization.getString('menu.sort.byTitle'))

	$('#helpMenu').text(localization.getString('menu.help.title'))
	$('#refreshButton').text(localization.getString('menu.help.refreshWindow'))
	$('#donateButton').text(localization.getString('menu.help.donate'))
	$('#aboutButtonText').text(localization.getString('menu.help.about'))
	// Reproductor
	$('#songTitle').text(localization.getString('player.welcome'))
	$('#playerVolume').attr('title', localization.getString('player.volume'))
	$('#previousBtn').attr('title', localization.getString('player.previousBtn'))
	$('#playPauseBtn').attr('title', localization.getString('player.playPauseBtn'))
	$('#nextBtn').attr('title', localization.getString('player.nextBtn'))
	$('#randomBtn').attr('title', localization.getString('player.suffleBtn'))
	// Pantalla de actualización
	$('#loadingMessage').text(localization.getString('loadingScreen.message'))
	// Búsqueda
	$('#searchInput').attr('placeholder', localization.getString('search.placeholder'))
	$('#noResults').text(localization.getString('search.noResults'))
})

/*
 * Abrir herramientas
 */
remote.globalShortcut.register('CommandOrControl+Shift+I', () => {
	remote.BrowserWindow.getFocusedWindow().webContents.openDevTools()
})

window.addEventListener('beforeunload', () => {
	remote.globalShortcut.unregisterAll()
})

// Control de ventana
const windowControl = new Window()
// Reproductor
let player

/*
 * Recibir canciones del proceso principal
 */
ipc.on('loaded-songs', (event, playlist) => {
	if (player !== undefined || player === null) {
		if (windowControl.isLoadingScreenActive) {
			windowControl.setLoadingScreen(false)
		}
		player.stopSong()
		player = null
	}
	
	// Instanciar reproductor
	player = new Player(playlist)
	// Instanciar barra
	new Bar(player, windowControl)
	// Instanciar búsqueda
	new Search(player)

	/*
	 * Regitrar teclas de media
	 */

	// Reproducir/pausar canción
	remote.globalShortcut.register('MediaPlayPause', () => {
		player.playPauseSong()
	})
	// Siguiente canción
	remote.globalShortcut.register('MediaNextTrack', () => {
		player.playNextSong()
	})
	// Canción anterior
	remote.globalShortcut.register('MediaPreviousTrack', () => {
		player.playPreviousSong()
	})
})

/*
 * Botones de la miniatura
 */

// Anterior
ipc.on('previous-button', () => {
	player.playPreviousSong()
})

// Reproducir/pausar
ipc.on('play-button', () => {
	player.playPauseSong()
})

// Siguiente
ipc.on('next-button', () => {
	player.playNextSong()
})

/*
 * Actualizaciones automáticas
 */

// Mensaje de actualizacón
const updateBox = document.getElementById('updateBox')

// Botones de actualización
const acceptUpdateBtn = document.getElementById('acceptUpdateBtn')
const declineUpdateBtn = document.getElementById('declineUpdateBtn')

/*
 * Eventos de botones
 */

// Aceptar actualización
acceptUpdateBtn.addEventListener('click', () => {
	ipc.send('update-accepted')
	// Ocultar caja
	updateBox.classList.remove('show')
})

// Denegar actualización
declineUpdateBtn.addEventListener('click', () => {
	// Ocultar caja
	updateBox.classList.remove('show')
})

// Actualización disponible
ipc.on('update-available', () => {
	updateBox.classList.add('show')
})

// Error al actualizar
ipc.on('update-error', (event, error) => {
	dialog.showMessageBoxSync({
		title: localization.getString('update.updateError.title'),
		message: localization.getString('update.updateError.message'),
		type: 'error'
	})
})

// Actualización descargada
ipc.on('update-downloaded', () => {
	// Preguntar
	const response = dialog.showMessageBoxSync({
		title: localization.getString('update.updateDownloaded.title'),
		message: localization.getString('update.updateDownloaded.message'),
		type: 'question',
		buttons: [
			localization.getString('update.acceptBtn'),
			localization.getString('update.laterBtn')]
	})
	// Actualización aceptada
	if (response == 0) {
		ipc.send('quit-and-install')
	}
})
