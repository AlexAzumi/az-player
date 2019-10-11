// Dependencias
const { dialog } = require('electron').remote;
const { init, showReportDialog } = require('@sentry/electron');
const { remote } = require('electron');
const $ = require('jquery');
const ipc = require('electron').ipcRenderer;
const package = require('../../package.json');
// Librerías
const Bar = require('./lib/bar');
const LocalizationManager = require('../localization');
const Player = require('./lib/player');
const Search = require('./lib/search');
const Window = require('./lib/window');
require('./lib/angularApp');
// Config
const config = require('../../config.json');

/*
 * Iniciar Sentry
 */
if (config.sentry.enabled) {
	init({
		dsn: package.sentryDSN,
		beforeSend(event) {
			// Verificar si es una exepción
			if (event.exception) {
				showReportDialog();
			}

			return event;
		}
	});
}

// Localización
const localization = new LocalizationManager();

/*
 * Abrir herramientas
 */
remote.globalShortcut.register('CommandOrControl+Shift+I', () => {
	remote.BrowserWindow.getFocusedWindow().webContents.openDevTools();
});

window.addEventListener('beforeunload', () => {
	remote.globalShortcut.unregisterAll();
});

// Control de ventana
const windowControl = new Window();
// Reproductor
let player;

/*
 * Recibir canciones del proceso principal
 */
ipc.on('loaded-songs', (event, playlist) => {
	if (player !== undefined || player === null) {
		console.log(player);
		if (windowControl.isLoadingScreenActive) {
			windowControl.setLoadingScreen(false);
		}
		player.stopSong();
		player.playlist = player.sortPlaylist(playlist, player.config.order);
		player.addSongsToContainer(player.playlist);
	} else {
		// Instanciar reproductor
		player = new Player(playlist, localization);
		// Instanciar barra
		new Bar(player, windowControl, localization);
		// Instanciar búsqueda
		new Search(player);
	}

	/*
	 * Regitrar teclas de media
	 */

	// Reproducir/pausar canción
	remote.globalShortcut.register('MediaPlayPause', () => {
		player.playPauseSong();
	});
	// Siguiente canción
	remote.globalShortcut.register('MediaNextTrack', () => {
		player.playNextSong();
	});
	// Canción anterior
	remote.globalShortcut.register('MediaPreviousTrack', () => {
		player.playPreviousSong();
	});
});

/*
 * Botones de la miniatura
 */

// Anterior
ipc.on('previous-button', () => {
	player.playPreviousSong();
});

// Reproducir/pausar
ipc.on('play-button', () => {
	player.playPauseSong();
});

// Siguiente
ipc.on('next-button', () => {
	player.playNextSong();
});

/*
 * Actualizaciones automáticas
 */

// Mensaje de actualizacón
const updateBox = document.getElementById('updateBox');

// Botones de actualización
const acceptUpdateBtn = document.getElementById('acceptUpdateBtn');
const declineUpdateBtn = document.getElementById('declineUpdateBtn');

/*
 * Eventos de botones
 */

// Aceptar actualización
acceptUpdateBtn.addEventListener('click', () => {
	ipc.send('update-accepted');
	// Ocultar caja
	updateBox.classList.remove('show');
});

// Denegar actualización
declineUpdateBtn.addEventListener('click', () => {
	// Ocultar caja
	updateBox.classList.remove('show');
});

// Actualización disponible
ipc.on('update-available', () => {
	updateBox.classList.add('show');
});

// Error al actualizar
ipc.on('update-error', () => {
	dialog.showMessageBoxSync({
		title: localization.getString('update.updateError.title'),
		message: localization.getString('update.updateError.message'),
		type: 'error'
	});
});

// Actualización descargada
ipc.on('update-downloaded', () => {
	// Preguntar
	const response = dialog.showMessageBoxSync({
		title: localization.getString('update.updateDownloaded.title'),
		message: localization.getString('update.updateDownloaded.message'),
		type: 'question',
		buttons: [ localization.getString('update.acceptBtn'), localization.getString('update.laterBtn') ]
	});
	// Actualización aceptada
	if (response == 0) {
		ipc.send('quit-and-install');
	}
});
