// Dependencias
const { remote, shell } = require('electron');
const angular = require('angular');
const LocalizationManager = require('../../localization');
// Información
const appInfo = require('../../../package.json');
// Localización
const localization = new LocalizationManager();

angular.module('aboutApp', []).controller('aboutController', function($scope) {
	// Localización
	$scope.about = {
		version: localization.getString('about.version'),
		author: localization.getString('about.author'),
		repository: localization.getString('about.repository'),
		close: localization.getString('about.close')
	};
	// Información
	$scope.author = appInfo.author;
	$scope.version = appInfo.version;
	// Eventos
	$scope.openRepository = function() {
		shell.openExternal(appInfo.homepage);
	};
	$scope.closeWindow = function() {
		// Obtener ventana
		const window = remote.getCurrentWindow();
		// Cerrar
		window.close();
	};
});
