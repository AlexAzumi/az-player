// Dependencias
const remote = require('electron').remote

// Información
const appInfo = require('../../package.json')

// Botón de cerrar
const closeBtn = document.getElementById('closeBtn')
// Versión
const appVersion = document.getElementById('appVersion')

// Mostrar información
appVersion.innerText = appInfo.version

/*
 * Listeners
 */
closeBtn.addEventListener('click', () => {
	// Obtener ventana
	const window = remote.getCurrentWindow()

	// Cerrar
	window.close()
})
