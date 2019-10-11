// Dependencias
const { ipcRenderer } = require('electron');
const { dialog } = require('electron').remote;
const angular = require('angular');
const LozalizationManager = require('../../localization');

// Localización
const localization = new LozalizationManager();

// Scopes
let updateBoxScope;

/*
 * Controladores
 */

// Caja de actualización
function updateController($scope) {
	// Asignar scope
	updateBoxScope = $scope;
	// Localización
	$scope.update = {
		box: {
			title: localization.getString('update.box.title')
		},
		laterBtn: localization.getString('update.laterBtn'),
		updateBtn: localization.getString('update.updateBtn')
	};
	// Mostrar caja
	$scope.showBox = false;
	// Eventos
	$scope.clickLater = function() {
		$scope.showBox = false;
	};
	$scope.clickUpdate = function() {
		$scope.showBox = false;
	};
}

// Barra de menú
function menuBarController($scope) {
	// Localización
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
	};
}

// Pantalla de carga
function loadingScreenController($scope) {
	// Localización
	$scope.loadingScreen = {
		message: localization.getString('loadingScreen.message')
	};
}

// Reproductor de música
function playerController($scope) {
	// Localización
	$scope.player = {
		welcome: localization.getString('player.welcome')
	};
	$scope.search = {
		placeholder: localization.getString('search.placeholder'),
		noResults: localization.getString('search.noResults')
	};
}

angular
	.module('angularApp', [])
	.controller('updateController', updateController)
	.controller('loadingScreenController', loadingScreenController)
	.controller('menuBarController', menuBarController)
	.controller('playerController', playerController);

/*
 * Actualizaciones automáticas
 */

// Actualización disponible
ipcRenderer.on('update-available', () => {
	// Actualizar controlador
	updateBoxScope.$apply(function() {
		updateBoxScope.showBox = true;
	});
});

// Error al actualizar
ipcRenderer.on('update-error', () => {
	dialog.showMessageBoxSync({
		title: localization.getString('update.updateError.title'),
		message: localization.getString('update.updateError.message'),
		type: 'error'
	});
});

// Actualización descargada
ipcRenderer.on('update-downloaded', () => {
	// Preguntar
	const response = dialog.showMessageBoxSync({
		title: localization.getString('update.updateDownloaded.title'),
		message: localization.getString('update.updateDownloaded.message'),
		type: 'question',
		buttons: [ localization.getString('update.acceptBtn'), localization.getString('update.laterBtn') ]
	});
	// Actualización aceptada
	if (response == 0) {
		ipcRenderer.send('quit-and-install');
	}
});
