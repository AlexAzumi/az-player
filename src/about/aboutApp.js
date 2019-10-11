// Dependencias
const angular = require('angular');
const LocalizationManager = require('../localization');
// Información
const appInfo = require('../../package.json');
// Localización
const localization = new LocalizationManager();

angular.module('aboutApp', [])
	.controller('aboutController', function ($scope) {
		$scope.about = {
			version: localization.getString('about.version'),
			author: localization.getString('about.author'),
			repository: localization.getString('about.repository'),
			close: localization.getString('about.close')
		};
		$scope.author = appInfo.author;
		$scope.version = appInfo.version;
	});
