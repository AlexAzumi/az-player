// Dependencias
const $ = require('jquery');
const LocalizationManager = require('../localization');

// Localización
const localization = new LocalizationManager();

// Aplicar localización
$(document).ready(() => {
	$('#loadingMessage').text(localization.getString('loadingScreen.message'));
});
