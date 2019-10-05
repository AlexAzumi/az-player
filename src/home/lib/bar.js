// Dependencias
const { remote, ipcRenderer } = require('electron')
const { shell } = remote

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

		this.menuButtons = document.getElementsByClassName('menu-item')
		this.submenus = document.getElementsByClassName('submenu')

		// Listeners de menús
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

		// Listeners de submenus
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

		/*
		 * Asignar listeners
		 */
		// Actualizar base de datos
		this.updateDatabaseButton.addEventListener('click', () => {
			ipcRenderer.send('refresh-database')
		})
		// Salir de la aplicación
		this.exitAppButton.addEventListener('click', () => {
			const window = remote.getCurrentWindow()
			window.close()
		})
		// Ordenar por artista
		this.sortArtistButton.addEventListener('click', () => {
			this.player.sortPlaylist(this.player.playlist, 'artist')
			this.player.addSongsToContainer(this.player.playlist)
		})
		// Ordenar por título
		this.sortTitleButton.addEventListener('click', (event) => {
			this.player.sortPlaylist(this.player.playlist, 'title')
			this.player.addSongsToContainer(this.player.playlist)
		})
		// Refrescar ventana
		this.refreshButton.addEventListener('click', () => {
			const window = remote.getCurrentWindow()
			window.reload()
		})
		// Abrir donaciones
		this.donateButton.addEventListener('click', () => {
			shell.openExternal('https://ko-fi.com/alexazumi')
		})
		// Abrir acerca de la aplicación
		this.aboutButton.addEventListener('click', () => {
			ipcRenderer.send('open-about')
		})
	}
}

module.exports = Bar
