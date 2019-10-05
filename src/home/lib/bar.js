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
