// Dependencias
const angular = require('angular');
const LocalizationManager = require('../../localization');
// Localización
const localization = new LocalizationManager();

angular
	.module('loadingApp', [])
	.controller('loadingController', function($scope) {
		$scope.loadingScreen = {
			message: localization.getString('loadingScreen.message')
		};
	});
