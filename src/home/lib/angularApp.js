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

// Reproductor de música
function playerController($scope) {
	$scope.player = {
		welcome: localization.getString('player.welcome')
	};
}

angular
	.module('angularApp', [])
	.controller('playerController', playerController)
	.controller('updateController', updateController);
