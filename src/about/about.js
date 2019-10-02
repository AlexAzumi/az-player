// Dependencias
const { remote, shell} = require('electron')

// Información
const appInfo = require('../../package.json')

// Botón de cerrar
const closeBtn = document.getElementById('closeBtn')
// Versión
const appVersion = document.getElementById('appVersion')
// Autor
const appAuthor = document.getElementById('appAuthor')
// Repositorio
const appRepository = document.getElementById('appRepository')

// Mostrar información
appVersion.innerText = appInfo.version
appAuthor.innerText = appInfo.author

/*
 * Listeners
 */

appRepository.addEventListener('click', () => {
	shell.openExternal(appInfo.homepage)
})

// Botón de cerrar
closeBtn.addEventListener('click', () => {
	// Obtener ventana
	const window = remote.getCurrentWindow()

	// Cerrar
	window.close()
})
