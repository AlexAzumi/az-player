// Dependencias
const { ipcRenderer, remote, shell } = require('electron');
const { dialog } = require('electron').remote;
const angular = require('angular');
const Mousetrap = require('mousetrap');
// Módulos personales
const LozalizationManager = require('../../localization');
const Player = require('./player');
const Search = require('./search');
// Localización
const localization = new LozalizationManager();
// Ventana
const window = remote.getCurrentWindow();
// Elementos
const submenus = document.querySelectorAll('.submenu');
// Iconos
const maximizeIcons = {
	maximize: '<i class="fas fa-window-maximize fa-fw"></i>',
	unmaximize: '<i class="far fa-window-maximize fa-fw"></i>'
};
// Scopes
let updateBoxScope, loadingScreenScope;
// Reproductor
let player;

/*
 * Controladores
 */

/**
 * Caja de actualizaciones
 * @param $scope
 */
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

/**
 * Barra de menú
 * @param $scope
 */
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
	// Banderas
	$scope.isSubmenuOpen = false;
	// Eventos
	$scope.openMenu = function (event, target) {
		// Ocultar subemnus
		$scope.hideSubmenus();
		// Mostrar submenú
		$scope.isSubmenuOpen = true;
		const el = document.getElementById(target);
		el.style.display = 'block';
	};
	$scope.menuMouseOver = function (event) {
		if (event.target.classList.contains('menu-item')) {
			// Ocultar subemnus
			$scope.hideSubmenus();
			// Se tenía abierto un submenú previamente
			if ($scope.isSubmenuOpen) {
				event.target.click();
			}
		}
	};
	$scope.submenuElementClick = function (event) {
		// Acción
		let action;
		// Ocultar submenus
		$scope.hideSubmenus();
		$scope.isSubmenuOpen = false;
		if (event.code) {
			switch (event.code) {
				case 'F1': {
					action = 'openAbout';
					break;
				}
				case 'keyU': {
					action = 'updateDatabse';
					break;
				}
				case 'Digit1': {
					action = 'sortByArtist';
					break;
				}
				case 'Digit2': {
					action = 'sortByTitle';
					break;
				}
				default: {
					throw `Acción no establecida: ${event.code}`;
				}
			}
		}
		else {
			action = event.target.getAttribute('action');
		}
		// Realizar acción
		console.log('Acción:', action);
		switch (action) {
			case 'updateDatabase': {
				loadingScreenScope.$apply(function () {
					loadingScreenScope.showLoadingScreen = true;
				});
				ipcRenderer.send('refresh-database');
				break;
			}
			case 'exit': {
				window.close();
				break;
			};
			case 'sortByArtist': {
				player.sortPlaylist(player.playlist, 'artist');
				player.addSongsToContainer(player.playlist);
				break;
			}
			case 'sortByTitle': {
				player.sortPlaylist(player.playlist, 'title');
				player.addSongsToContainer(player.playlist);
				break;
			}
			case 'refreshWindow': {
				window.reload();
				break;
			}
			case 'donate': {
				shell.openExternal('https://ko-fi.com/alexazumi');
				break;
			}
			case 'openAbout': {
				ipcRenderer.send('open-about');
				break;
			}
			case 'changeLocalization': {
				const locale = event.target.getAttribute('locale');
				localization.setLocale(locale);
				window.reload();
				break;
			}
			default: {
				console.log('Acción desconocida');
				break;
			}
		}
	};
	$scope.hideSubmenus = function () {
		if ($scope.isSubmenuOpen) {
			for (let submenu of submenus) {
				submenu.style.display = 'none';
			}
		}
	};
	$scope.minimizeWindow = function () {
		window.minimize();
	};
	$scope.maximizeWindow = function (event) {
		if (window.isMaximized()) {
			event.target.innerHTML = maximizeIcons.maximize;
			window.unmaximize();
		} else {
			event.target.innerHTML = maximizeIcons.unmaximize;
			window.maximize();
		}
	};
	$scope.closeWindow = function () {
		window.close();
	};
	// Obtener localizaciones
	$scope.localizations = localization.getLocalizationList();
	// Asignar eventos
	for (let submenu of submenus) {
		for (let item of submenu.children) {
			item.addEventListener('click', $scope.submenuElementClick);
		}
	}
	$scope.exitSubmenu = function (event) {
		const target = event.target.classList.value;
		if ($scope.isSubmenuOpen && !target.includes('menu-item', 'submenu-item')) {
			$scope.hideSubmenus();
			$scope.isSubmenuOpen = false;
		}
	};
	// Asignar shortcuts
	Mousetrap.bind('ctrl+u', $scope.submenuElementClick);
	Mousetrap.bind('ctrl+1', $scope.submenuElementClick);
	Mousetrap.bind('ctrl+2', $scope.submenuElementClick);
	Mousetrap.bind('f1', $scope.submenuElementClick);
	Mousetrap.bind('esc', $scope.exitSubmenu);
	// Evento de clic
	document.addEventListener('click', $scope.exitSubmenu);
}

/**
 * Pantalla de carga
 * @param $scope
 */
function loadingScreenController($scope) {
	// Asignar scope
	loadingScreenScope = $scope;
	// Bandera
	$scope.showLoadingScreen = false;
	// Localización
	$scope.loadingScreen = {
		message: localization.getString('loadingScreen.message')
	};
}

/**
 * Reproductor de música
 * @param $scope
 */
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

/**
 * IPC
 */
ipcRenderer.on('loaded-songs', (event, playlist) => {
	// Verificar si el reproductor fue previamente instanciado
	if (player !== undefined || player === null) {
		// Pantalla de carga activa
		if (loadingScreenScope.showLoadingScreen) {
			loadingScreenScope.$apply(function () {
				loadingScreenScope.showLoadingScreen = false;
			});
		}
		// Dentener
		player.stopSong();
		player.playlist = player.sortPlaylist(playlist, player.config.order);
		player.addSongsToContainer(player.playlist);
	}
	// Crear reproductor y búsqueda
	player = new Player(playlist, localization);
	new Search(player);

	/*
	 * Regitrar teclas de media
	 */
	remote.globalShortcut.register('MediaPlayPause', () => {
		player.playPauseSong();
	});
	remote.globalShortcut.register('MediaNextTrack', () => {
		player.playNextSong();
	});
	remote.globalShortcut.register('MediaPreviousTrack', () => {
		player.playPreviousSong();
	});
});

// Anterior
ipcRenderer.on('previous-button', () => {
	player.playPreviousSong();
});

// Reproducir/pausar
ipcRenderer.on('play-button', () => {
	player.playPauseSong();
});

// Siguiente
ipcRenderer.on('next-button', () => {
	player.playNextSong();
});

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
