// Dependencias
const $ = require('jquery')
const { remote, shell } = require('electron')
const LocalizationManager = require('../localization')

// Información
const appInfo = require('../../package.json')

const localization = new LocalizationManager()
$(document).ready(() => {
	// Localización
	$('#versionTag').text(`${localization.getString('about.version')}:`)
	$('#authorTag').text(`${localization.getString('about.author')}:`)
	$('#repositoryTag').text(localization.getString('about.repository'))
	$('#closeBtn').text(localization.getString('about.close'))
	// Mostrar información
	$('#appVersion').text(appInfo.version)
	$('#appAuthor').text(appInfo.author)
})

/*
 * Listeners
 */
$('#appRepository').click(() => {
	shell.openExternal(appInfo.homepage)
})

$('#closeBtn').click(() => {
	// Obtener ventana
	const window = remote.getCurrentWindow()
	// Cerrar
	window.close()
})
