/*
 * Búsquedas
 */
class Search {
	/**
	 * Constructor
	 * @param player Reproductor de música
	 */
	constructor(player) {
		/*
		 * DOM
		 */
		this.searchInput = document.getElementById('searchInput')
		this.noResultsMessage = document.getElementById('noResults')

		// Reproductor
		this.player = player

		// Asignar eventos
		this.assingEvents()
	}

	/**
	 * Buscar canciones
	 */
	searchSongs() {
		// Filtrar
		let searchResults = this.player.playlist.filter((song) => {
			const title = song.title.toLowerCase()
			const artist = song.artist.toLowerCase()
			if (title.includes(this.searchInput.value.toLowerCase()) || artist.includes(this.searchInput.value.toLowerCase())) {
				return true
			}
			else {
				return false
			}
		})

		searchResults = this.player.sortPlaylist(searchResults)
		
		// Verificar resultados
		if (searchResults.length > 0) {
			this.noResultsMessage.classList.add('d-none')
		} else {
			this.noResultsMessage.classList.remove('d-none')
		}

		// Ocultar elementos
		for (let element of this.player.songsListElement.children) {
			// Verificar resultados
			if (searchResults.length > 0) {
				for (let song of searchResults) {
					if (song.title !== element.getAttribute('song-title')) {
						element.setAttribute('hidden', '')
					}
					else {
						element.removeAttribute('hidden')
						break
					}
				}
			} else {
				element.setAttribute('hidden', '')
			}
		}
		// Vaciar resultados
		searchResults = []
	}

	/**
	 * Asignar eventos
	 */
	assingEvents() {
		// Entrada en cuadro de texto
		this.searchInput.addEventListener('input', this.searchSongs.bind(this))
	}
}

module.exports = Search
