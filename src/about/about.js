// Dependencias
const remote = require('electron').remote

// Información
const appInfo = require('../../package.json')

// Botón de cerrar
const closeBtn = document.getElementById('closeBtn')
// Versión
const appVersion = document.getElementById('appVersion')
// Autor
const appAuthor = document.getElementById('appAuthor')

// Mostrar información
appVersion.innerText = appInfo.version
appAuthor.innerText = appInfo.author

/*
 * Listeners
 */
closeBtn.addEventListener('click', () => {
	// Obtener ventana
	const window = remote.getCurrentWindow()

	// Cerrar
	window.close()
})
