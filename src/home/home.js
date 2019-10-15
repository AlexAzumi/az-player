// Dependencias
const { init, showReportDialog } = require('@sentry/electron');
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

/*
 * Abrir herramientas
 */
remote.globalShortcut.register('CommandOrControl+Shift+I', () => {
	remote.BrowserWindow.getFocusedWindow().webContents.openDevTools();
});

window.addEventListener('beforeunload', () => {
	remote.globalShortcut.unregisterAll();
});
