// Dependencias
const { remote } = require('electron')
const { dialog } = require('electron').remote
const { init, showReportDialog } = require('@sentry/electron')
const ipc = require('electron').ipcRenderer
// Librerías
const Player = require('./lib/player')
const Search = require('./lib/search')
const Bar = require('./lib/bar')
const Window = require('./lib/window')

// Control de ventana
const windowControl = new Window()

// Reproductor
let player

/*
 * Información de la aplicación
 */
const package = require('../../package.json')

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

/*
 * Abrir herramientas
 */
remote.globalShortcut.register('CommandOrControl+Shift+I', () => {
	remote.BrowserWindow.getFocusedWindow().webContents.openDevTools()
})

window.addEventListener('beforeunload', () => {
	remote.globalShortcut.unregisterAll()
})

/*
 * Recibir canciones del proceso principal
 */
ipc.on('loaded-songs', (event, playlist) => {
	if (player !== undefined) {
		if (windowControl.isLoadingScreenActive) {
			windowControl.setLoadingScreen(false)
		}
		player.stopSong()
		delete player	
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
		title: `Error de descarga | ${error.code}`,
		message: 'Se generó un error en la actualización',
		type: 'error'
	})
})

// Actualización descargada
ipc.on('update-downloaded', () => {
	// Preguntar
	const response = dialog.showMessageBoxSync({
		title: 'Actualización descargada',
		message: 'Una nueva versión ha sido decargada. ¿Desea reiniciar la aplicación para aplicar las actualizaciones?',
		type: 'question',
		buttons: ['Aceptar', 'Más tarde']
	})
	// Actualización aceptada
	if (response == 0) {
		ipc.send('quit-and-install')
	}
})
