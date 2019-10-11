// Dependencias
const $ = require('jquery');
const { remote, shell } = require('electron');
// Angular
require('./lib/aboutApp');
// Información
const appInfo = require('../../package.json');


/*
 * Listeners
 */
$('#appRepository').click(() => {
	shell.openExternal(appInfo.homepage);
});

$('#closeBtn').click(() => {
	// Obtener ventana
	const window = remote.getCurrentWindow();
	// Cerrar
	window.close();
});
