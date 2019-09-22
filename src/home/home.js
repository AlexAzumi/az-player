// Dependencias
const ipc = require('electron').ipcRenderer
const { remote } = require('electron')
const { dialog } = require('electron').remote

// Reproducción
const Player = require('./lib/player')
// Búsqueda
const Search = require('./lib/search')

// Reporte de errores
const sentryConfig = require('../../config')
const { init, showReportDialog } = require('@sentry/electron')

init({
	dsn: sentryConfig.sentryDSN,
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
	// Instanciar reproductor
	const player = new Player(playlist)
	// Instanciar búsqueda
	const search = new Search(player)
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
ipc.on('update-error', () => {
	dialog.showMessageBoxSync({
		title: 'Error de descarga',
		message: 'Hubo un error al descargar la aplicación',
		type: 'error'
	})
})

// Actualización descargada
ipc.on('update-downloaded', () => {
	// Preguntar
	const response = dialog.showMessageBoxSync({
		title: 'Actualización descargada',
		message: '¿Desea aplicar la actualización? (Se cerrará la aplicación)',
		type: 'question',
		buttons: ['Aceptar', 'Cancelar']
	})
	// Actualización aceptada
	if (response == 0) {
		ipc.send('quit-and-install')
	}
})
