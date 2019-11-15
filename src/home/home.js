// Dependencias
const { init } = require('@sentry/electron');
const { remote } = require('electron');
const package = require('../../package.json');
// Angular
require('./lib/playerApp');
// Configuración
const config = require('../../config.json');

/*
 * Iniciar Sentry
 */
if (config.sentry.enabled) {
	init({
		dsn: package.sentryDSN
	});
}

/*
 * Abrir herramientas
 */
remote.globalShortcut.register('CommandOrControl+Shift+I', () => {
	remote.BrowserWindow.getFocusedWindow().webContents.openDevTools();
});

window.addEventListener('beforeunload', () => {
	remote.globalShortcut.unregisterAll();
});
