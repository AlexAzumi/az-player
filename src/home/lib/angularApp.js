// Dependencias
const angular = require('angular');
const LozalizationManager = require('../../localization');

// Localización
const localization = new LozalizationManager();

/*
 * Controladores
 */

// Caja de actualización
function updateController($scope) {
	$scope.update = {
		box: {
			title: localization.getString('update.box.title')
		},
		laterBtn: localization.getString('update.laterBtn'),
		updateBtn: localization.getString('update.updateBtn')
	};
}

// Barra de menú
function menuBarController($scope) {
	$scope.menu = {
		home: {
			title: localization.getString('menu.home.title'),
			updateDatabase: localization.getString('menu.home.updateDatabase'),
			exit: localization.getString('menu.home.exit')
		},
		sort: {
			title: localization.getString('menu.sort.title'),
			byArtist: localization.getString('menu.sort.byArtist'),
			byTitle: localization.getString('menu.sort.byTitle')
		},
		localizationText: localization.getString('localizationText'),
		help: {
			title: localization.getString('menu.help.title'),
			refreshWindow: localization.getString('menu.help.refreshWindow'),
			donate: localization.getString('menu.help.donate'),
			about: localization.getString('menu.help.about')
		}
	}
}

// Pantalla de carga
function loadingScreenController($scope) {
	$scope.loadingScreen = {
		message: localization.getString('loadingScreen.message')
	}
}

// Reproductor de música
function playerController($scope) {
	$scope.player = {
		welcome: localization.getString('player.welcome'),
	};
	$scope.search = {
		placeholder: localization.getString('search.placeholder'),
		noResults: localization.getString('search.noResults'),
	}
}

angular
	.module('angularApp', [])
	.controller('updateController', updateController)
	.controller('loadingScreenController', loadingScreenController)
	.controller('menuBarController', menuBarController)
	.controller('playerController', playerController);
