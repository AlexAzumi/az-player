// Dependencias
const { remote, ipcRenderer } = require('electron');
const angular = require('angular');
const LocalizationManager = require('../localization');

// Localización
const localization = new LocalizationManager();

// Ventana
const window = remote.getCurrentWindow();

/**
 * Controlador
 */
function disclaimerController($scope) {
	// Localización
	$scope.disclaimer = {
		title: localization.getString('disclaimer.title'),
		message: localization.getString('disclaimer.message'),
		acceptBtn: localization.getString('disclaimer.acceptBtn'),
		denyBtn: localization.getString('disclaimer.denyBtn')
	};
	// Métodos
	$scope.deny = function() {
		window.close();
	};
	$scope.accept = function() {
		ipcRenderer.send('accepted-disclaimer');
	};
}

angular
	.module('disclaimerApp', [])
	.controller('disclaimerController', disclaimerController);
