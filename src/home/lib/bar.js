// Dependencias
const { remote, ipcRenderer } = require('electron')
const { shell } = remote
const Mousetrap = require('mousetrap')

/*
 * Barra
 */
class Bar {
	/**
	 * Constructor
	 * @param player Reproductor de música
	 */
	constructor(player) {
		// Asignar player
		this.player = player
		// Obtener elementos
		this.updateDatabaseButton = document.getElementById('updateDatabaseButton')
		this.exitAppButton = document.getElementById('exitAppButton')
		this.sortArtistButton = document.getElementById('sortArtistButton')
		this.sortTitleButton = document.getElementById('sortTitleButton')
		this.refreshButton = document.getElementById('refreshButton')
		this.donateButton = document.getElementById('donateButton')
		this.aboutButton = document.getElementById('aboutButton')
		// Lista de menús
		this.menuButtons = document.getElementsByClassName('menu-item')
		// Lista de submenús
		this.submenus = document.getElementsByClassName('submenu')

		// Establecer shortcuts
		this.setShortcuts()

		/*
		 * Establecer listeners
		 */
		this.setMenuListeners()
		this.setSubmenuListeners()
		this.setSubmenuActions()
	}

	/**
	 * Actualizar base de datos
	 */
	actionUpdateDatabase() {
		ipcRenderer.send('refresh-database')
	}

	/**
	 * Salir de la aplicación
	 */
	actionCloseApp() {
		const window = remote.getCurrentWindow()
		window.close()
	}

	/**
	 * Ordenar por título
	 */
	actionOrderbyTitle() {
		this.player.sortPlaylist(this.player.playlist, 'title')
		this.player.addSongsToContainer(this.player.playlist)
	}

	/**
	 * Ordenar por artista
	 */
	actionOrderbyArtist() {
		this.player.sortPlaylist(this.player.playlist, 'artist')
		this.player.addSongsToContainer(this.player.playlist)
	}

	/**
	 * Refrescar ventana
	 */
	actionRefreshWindow() {
		const window = remote.getCurrentWindow()
		window.reload()
	}

	/**
	 * Donaciones
	 */
	actionDonate() {
		shell.openExternal('https://ko-fi.com/alexazumi')
	}

	/**
	 * Abrir acerca de la aplicación
	 */
	actionOpenAbout() {
		ipcRenderer.send('open-about')
	}

	/**
	 * Establecer shortcuts
	 */
	setShortcuts() {
		Mousetrap.bind('ctrl+u', this.actionUpdateDatabase.bind(this))
		Mousetrap.bind('ctrl+1', this.actionOrderbyArtist.bind(this))
		Mousetrap.bind('ctrl+2', this.actionOrderbyTitle.bind(this))
		Mousetrap.bind('f1', this.actionOpenAbout.bind(this))
	}

	/**
	 * Establecer listeners de acciones de los submenús
	 */
	setSubmenuActions() {
		this.updateDatabaseButton.addEventListener('click', this.actionUpdateDatabase.bind(this))
		this.exitAppButton.addEventListener('click', this.actionCloseApp.bind(this))
		this.sortArtistButton.addEventListener('click', this.actionOrderbyTitle.bind(this))
		this.sortTitleButton.addEventListener('click', this.actionOrderbyArtist.bind(this))
		this.refreshButton.addEventListener('click', this.actionRefreshWindow.bind(this))
		this.donateButton.addEventListener('click', this.actionDonate.bind(this))
		this.aboutButton.addEventListener('click', this.actionOpenAbout.bind(this))
	}

	/**
	 * Establecer listeners del menú
	 */
	setMenuListeners() {
		// Pasar por cada objeto
		for (let menu of this.menuButtons) {
			// onClick
			menu.addEventListener('click', (event) => {
				for (let submenu of this.submenus) {
					// Ocultar otros submenus
					if (submenu.style.display === 'block') {
						submenu.style.display = 'none'
					}
				}
				// Obtener submenu y mostrar
				const submenu = event.srcElement.getAttribute('submenu')
				const element = document.getElementById(`submenu-${submenu}`)
				element.style.display = 'block'
			})

			// onMouseOver
			menu.addEventListener('mouseover', (event) => {
				if (event.srcElement.classList.contains('menu-item')) {
					let hasSubmenuOpen = false
					for (let submenu of this.submenus) {
						if (submenu.style.display === 'block') {
							submenu.style.display = 'none'
							hasSubmenuOpen = true
						}
					}
					// Verificar si existe algún submenú abierto
					if (hasSubmenuOpen) {
						event.srcElement.click()
					}
				}
			})
		}
	}

	/**
	 * Establecer listeners de submenús
	 */
	setSubmenuListeners() {
		for (let submenu of this.submenus) {
			// Click
			submenu.addEventListener('click', (event) => {
				// Ocultar elemento
				event.srcElement.parentElement.style.display = 'none'
			})
			// onMouseLeave
			submenu.addEventListener('mouseleave', (event) => {
				// Ocultar elemento
				if (!event.toElement.classList.contains('menu-item')) {
					// Ocultar elemento
					event.srcElement.style = 'none'
				}
			})
		}
	}
}

module.exports = Bar
