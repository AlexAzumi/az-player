// Dependencias
const { dialog } = require('electron').remote;
const { init, showReportDialog } = require('@sentry/electron');
const { remote } = require('electron');
const ipc = require('electron').ipcRenderer;
const package = require('../../package.json');
// Librerías
const LocalizationManager = require('../localization');
const Player = require('./lib/player');
const Search = require('./lib/search');
const Window = require('./lib/window');
// Angular
const { set } = require('./lib/playerApp');
// Config
const config = require('../../config.json');
// Controladores de AngularJS
const updateController = document.getElementById('updateBox');

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
	console.log(set)
	if (player !== undefined || player === null) {
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
		//new Bar(player, windowControl, localization);
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
