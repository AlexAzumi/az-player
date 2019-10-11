// Dependencias
const { dialog } = require('electron').remote
const ipc = require('electron').ipcRenderer
const fs = require('fs')
const slash = require('slash')
const path = require('path')

// Sentry
const Sentry = require('@sentry/electron')

/*
 * Reproductor
 */
class Player {
	/**
	 * Constructor
	 * @param playlist Lista de canciones
	 * @param localizationManager Controlador de localización
	 */
	constructor(playlist, localizationManager) {
		// Localización
		this.localization = localizationManager
		// Instanciar reproductor
		this.musicPlayer = new Audio()
		// Aplicar configuración
		this.config = {
			tickTime: 250,
			volume: localStorage.getItem('volume') ? localStorage.getItem('volume') : 100,
			random: localStorage.getItem('random') ? JSON.parse(localStorage.getItem('random')) : false,
			order: localStorage.getItem('order') ? localStorage.getItem('order') : 'title'
		}
		// Mostrar configuración
		console.log('%cConfiguración', 'color: purple; font-size: 1.3em;', this.config)

		// Ordenar canciones
		this.playlist = this.sortPlaylist(playlist, this.config.order)

		// Canciones terminadas
		this.endedSongs = []
		// Canción actual (ID)
		this.currentSong = 0
		// Canción lista
		this.readySong = true
		// Objeto de volumen
		this.volume = []
		// Tiempo de espera
		this.previousTime = 3.0
		// Estado del reproductor
		this.neverPlayed = true

		/*
		 * Obtener DOM
		 */
		// Reproductor
		this.playerElement = document.getElementById('player')
		this.songTitle = document.getElementById('songTitle')
		this.songTitleContainer = document.getElementById('songTitleContainer')
		this.songsListElement = document.getElementById('songsList')
		// Botones del reproductor
		this.playPauseBtn = document.getElementById('playPauseBtn')
		this.nextBtn = document.getElementById('nextBtn')
		this.previousBtn = document.getElementById('previousBtn')
		this.randomBtn = document.getElementById('randomBtn')
		// Barra de reproducción y volumen
		this.seekBar = document.getElementById('playerRange')
		this.volume.bar = document.getElementById('playerVolume')
		this.volume.text = document.getElementById('volumeText')
		// Búsqueda
		this.searchInput = document.getElementById('searchInput')
		this.noResults = document.getElementById('noResults')

		// Agregar en la lista
		this.addSongsToContainer(playlist)

		/*
		 * Aplicar configuraciones
		 */
		// Asignar volumen
		this.musicPlayer.volume = this.config.volume / 100
		this.volume.bar.value = this.config.volume
		this.volume.text.innerText = `${this.config.volume}%`

		// Aplicar reproducción aleatoria
		if (this.config.random) {
			this.randomBtn.classList.add('active')
		}

		// Asignar eventos
		this.assignEvents()

		// Actualización de la barra de reproducción
		setInterval(this.updateSeekBar.bind(this), this.config.tickTime)
	}

	/**
	 * Ordenar lista de reproducción
	 * @param playlist Lista de canciones
	 */
	sortPlaylist(playlist, sort) {
		// Tipo de orden
		switch (sort) {
			// Ordenar por título
			case 'title':
				localStorage.setItem('order', 'title')

				return playlist.sort((a, b) => {
					if (a.title.toLowerCase() > b.title.toLowerCase()) {
						return 1
					} else {
						return -1
					}
				})
			// Ordenar por artista
			case 'artist':
				localStorage.setItem('order', 'artist')

				return playlist.sort((a, b) => {
					if (a.artist.toLowerCase() > b.artist.toLowerCase()) {
						return 1
					} else {
						return -1
					}
				})
			// Orden sin especificar
			default:
				console.warn('Orden sin especificar')
				break;
		}
	}

	/**
	 * Agregar canciones al contenedor
	 * @param playlist Lista de canciones
	 * @return Lista de canciones ordenada por título
	 */
	addSongsToContainer(playlist) {
		// Vaciar lista
		while (this.songsListElement.firstChild) {
			this.songsListElement.removeChild(this.songsListElement.firstChild)
		}

		// Asignar ID
		let songID = 0

		// Pasar por cada canción
		for (let song of playlist) {
			// Crear elemento
			const songElement = document.createElement('div')
			songElement.classList.add('song')
			songElement.innerText = `${song.title} - `
			// Crear subelemento de artista
			const songArtist = document.createElement('span')
			songArtist.innerHTML = song.artist
			songArtist.classList.add('artist')
			// Combinar elementos
			songElement.appendChild(songArtist)

			// Icono de reproducción
			const playIcon = document.createElement('i')
			playIcon.classList.add('fa', 'fa-play', 'position-absolute', 'play-icon')

			// Establecer id
			songElement.setAttribute('song-path', path.join(song.path, song.audio))
			songElement.setAttribute('song-title', song.title)
			songElement.setAttribute('song-artist', song.artist)
			songElement.id = songID
			
			if (song.background !== 'NONE') {
				songElement.setAttribute('song-background', path.join(song.path, song.background))
			}
			else {
				songElement.setAttribute('song-background', 'NONE')
			}

			// Agregar listener
			songElement.addEventListener('click', this.playSelectedSong.bind(this))

			// Agregar en elemento
			songElement.appendChild(playIcon)

			// Agregar en lista
			this.songsListElement.appendChild(songElement)

			// Aumentar id
			songID++
		}
	}

	/**
	 * Iniciar canción
	 */
	startSong(songID) {
		// Verificar si está listo
		if (!this.readySong) {
			// Registrar en consola
			console.warn('La canción aún no ha terminado de cargar')
			return
		}

		// Obtener elemento
		const songElement = this.getSongElement(songID)
		// Extraer información
		const songTitle = songElement.getAttribute('song-title')
		const songArtist = songElement.getAttribute('song-artist')
		const songPath = songElement.getAttribute('song-path')
		const songBackground = songElement.getAttribute('song-background')
		this.currentSong = songElement.id

		// Verificar si existe el audio
		if (fs.existsSync(songPath)) {
			// Cambiar bandera
			this.readySong = false
			this.musicPlayer.src = songPath
		} else {
			// Mostrar error
			dialog.showMessageBox({
				title: this.localization.getString('player.songNotFound.title'),
				message: this.localization.getString('player.songNotFound.message'),
				type: 'error'
			})
			// Capturar a sentry
			Sentry.withScope((scope) => {
				// Asignar scope
				scope.setLevel('warning')
				scope.setExtra('src', songPath)
				// Enviar
				Sentry.captureMessage('Audio no encontrado')
			})

			return
		}
		// Eliminar otras clases activas
		this.songsListElement.querySelectorAll('.active').forEach((element) => {
			element.classList.remove('active')
		})
		// Ocultar icono
		this.songsListElement.querySelectorAll('.play-icon').forEach((element) => {
			element.classList.remove('play-icon-show')
		})

		// Establecer como activo
		songElement.classList.add('active')
		// Mostrar icono
		songElement.childNodes[2].classList.add('play-icon-show')
		
		// Establecer fondo del reproductor
		if (songBackground !== 'NONE') {
			if (fs.existsSync(songBackground)) {
				this.playerElement.style.backgroundImage = `url("${slash(songBackground)}")`
			}
			else {
				this.playerElement.style.backgroundImage = 'url("../../assets/img/background.jpg")'
			}
		}
		else {
			this.playerElement.style.backgroundImage = 'url("../../assets/img/background.jpg")'
		}

		// Actualizar información mostrada
		this.updateInfo(songTitle, songArtist)
		
		// Reproducir
		this.musicPlayer.currentTime = 0
		const playPromise = this.musicPlayer.play()

		// Esperar promesa
		if (playPromise !== undefined) {
			playPromise.then(() => {
				// Cambiar bandera
				this.readySong = true
			})
		}
	}

	/**
	 * Obtener elemento de canción
	 * @param {number} id ID de la canción
	 * @return Elemento de la canción
	 */
	getSongElement(id) {
		return document.getElementById(id)
	}

	/**
	 * Actualizar información mostrada
	 * @param {string} title Título de la canción
	 * @param {string} artist Artista de la canción
	 */
	updateInfo(title, artist) {
		// Establecer título de la ventana
		this.changeWindowTitle(`${title} - ${artist}`)

		// Mostrar título
		this.songTitle.innerText = `${title} - `
		// Crear subtítulo con artista y establecer valores
		const artistElement = document.createElement('span')
		artistElement.classList.add('song-artist')
		artistElement.innerHTML = artist
		// Unir elementos
		this.songTitle.appendChild(artistElement)
		
		// Verificar el tamaño del título
		if (this.songTitle.clientWidth > this.songTitleContainer.offsetWidth) {
			// Obtener diferencia
			let diff = (this.songTitle.clientWidth - this.songTitleContainer.offsetWidth) + 32 /* TODO: Cambiar 32 a un calculo del padding */
			// Verificar si la animación ya está corriendo
			if (this.titleAnimation !== undefined && this.titleAnimation.playState === 'running') {
				// Cancelar la animación
				this.titleAnimation.cancel()
			}

			// Crear animación
			this.titleAnimation = this.songTitle.animate([
				{ transform: 'translateX(0px)' },
				{ transform: `translateX(-${diff}px)` },
				{ transform: 'translateX(0px)' }
			], {
				duration: 8000 * (diff / 70), /* TODO: Ajustar valores */
				iterations: Infinity
			})
		}
		else {
				// Verificar si la animación ya está corriendo
			if (this.titleAnimation !== undefined && this.titleAnimation.playState === 'running') {
				// Cancelar la animación
				this.titleAnimation.cancel()
			}
		}
	}

	/**
	 * Cambiar título de la ventana
	 * @param {string} newTitle Nuevo título de la ventana
	 */
	changeWindowTitle(newTitle) {
		ipc.send('change-player-title', newTitle)
	}

	/* Eventos */

	/**
	 * Reproducir canción selecionada
	 * @param event Evento de clic
	 */
	playSelectedSong(event) {
		// Establecer canción actual
		this.currentSong = event.srcElement.id
		// Vaciar lista de canciones ya reproducidas
		this.endedSongs = []
		// Iniciar canción
		this.startSong(event.srcElement.id)
	}

	/**
	 * Cambio del estado del reproductor
	 * @param event Evento del reproductor
	 */
	playerStatusChanged(event) {
		// ¿Está reproduciendo?
		if (event.type === 'play') {
			this.playPauseBtn.innerHTML = '<i class="fas fa-pause fa-2x"></i>'
		}
		// ¿Está pausado?
		else if (event.type === 'pause') {
			this.playPauseBtn.innerHTML = '<i class="fas fa-play fa-2x"></i>'
		}
	}

	/**
	 * Error del reproductor
	 * @param error Error generado
	 */
	showPlayerError(error) {
		// Mostrar error
		dialog.showMessageBox({
			title: 'Error',
			message: 'Se ha generado un error al intentar reproducir el audio',
			type: 'error'
		})
		// Log
		console.error(error)
		// Capturar por Sentry
		Sentry.captureEvent(error)
	}

	/**
	 * Reproducir siguiente canción
	 */
	playNextSong() {
		// Regresar barra a cero
		this.seekBar.value = 0

		// Verificar si hay más canciones
		if (this.currentSong < this.playlist.length - 1) {
			// Reproductor listo
			if (this.musicPlayer.readyState != 0) {
				// Reproducción al azar activada
				if (this.config.random) {
					// Agregar a lista de canciones reproducidas
					this.endedSongs.push(this.currentSong)
					if (this.endedSongs.length < this.playlist.length) {
						let nextSong
						while (nextSong === undefined) {
							// Bandera
							let alreadyPlayed = false
							// Número al azar
							let selectedSong = Math.floor(Math.random() * this.playlist.length)
							// Verificar numero por número
							for (let song of this.endedSongs) {
								if (song === selectedSong) {
									alreadyPlayed = true
								}
							}
							// Asignar valores
							if (!alreadyPlayed) {
								nextSong = selectedSong
							}
						}
						this.currentSong = nextSong
					} 
					else {
						// Vaciar lista de canciones
						this.endedSongs = []
						// Número al azar
						this.currentSong = Math.floor(Math.random() * this.playlist.length)
					}
				}
				else {
					this.currentSong++
				}
			}
		}
		else {
			this.currentSong = 0
		}
		// Iniciar canción
		this.startSong(this.currentSong)
	}

	/**
	 * Reproducir canción anterior
	 */
	playPreviousSong() {
		// Verificar si retroceder en vez de cambiar
		if (this.musicPlayer.currentTime > this.previousTime) {
			// Regresar al inicio
			this.musicPlayer.currentTime = 0
			// Terminar método
			return
		}

		// Verificar si está reproduciendo aleatoriamente
		if (this.config.random) {
			// Existen canciones anteriormente reproducidas
			if (this.endedSongs.length > 0) {
				this.currentSong = this.endedSongs.pop()
			}
			else {
				// Regresar al inicio
				this.currentSong = 0
			}
		}
		else {
			// Verificar si hay más canciones
			if (this.currentSong > 0) {
				this.currentSong--
			}
			else {
				// Regresar al inicio
				this.currentSong = 0
			}
		}

		// Iniciar canción
		this.startSong(this.currentSong)
	}

	/**
	 * Botón de reproducción aleatoria
	 * @param event Evento de click
	 */
	setRandomStatus(event) {
		// Activar/desactivar bandera
		if (this.config.random) {
			this.config.random = false
			event.srcElement.parentElement.classList.remove('active')
		}
		else {
			this.config.random = true
			event.srcElement.parentElement.classList.add('active')
		}
		// Guardar
		localStorage.setItem('random', this.config.random)
	}

	/**
	 * Reproducir o pausar canción
	 */
	playPauseSong() {
		if (this.musicPlayer.readyState == 0 && this.neverPlayed) {
			// Iniciar canción
			this.startSong(this.currentSong)
			this.neverPlayed = false
			return
		}
		// La canción está pausada
		if (this.musicPlayer.paused) {
			this.musicPlayer.play()
		}
		// Canción reproduciendo
		else {
			this.musicPlayer.pause()
		}
	}

	/**
	 * Detener canción
	 */
	stopSong() {
		// Restaurar estado
		this.endedSongs = []
		this.currentSong = 0
		this.readySong = true
		this.neverPlayed = true

		// Pausar
		this.musicPlayer.pause()
		// Regresar al inicio
		this.musicPlayer.currentTime = 0
		// Regresar al fondo inicial
		this.playerElement.style.backgroundImage = 'url("../../assets/img/background.jpg")'
		// Establecer mensaje inicial
		this.songTitle.innerText = this.localization.getString('player.welcome')
	}

	/**
	 * Cambiar volumen
	 */
	changeVolume() {
		// Obtener valor
		this.config.volume = this.volume.bar.value
		// Asignar volumen
		this.musicPlayer.volume = this.config.volume / 100
		this.volume.text.innerText = `${this.volume.bar.value}%`
		// Guardar
		localStorage.setItem('volume', this.config.volume)
	}

	/**
	 * Actualizar barra de reproducción
	 */
	updateSeekBar() {
		// Verificar si se está reproduciendo una canción
		if (!this.musicPlayer.ended) {
			// Actualizar barra
			this.seekBar.value = this.musicPlayer.currentTime
		}
	}

	/**
	 * Asignar eventos
	 */
	assignEvents() {
		// Reproducir una canción
		this.musicPlayer.addEventListener('play', this.playerStatusChanged.bind(this))
		// Pausar una canción
		this.musicPlayer.addEventListener('pause', this.playerStatusChanged.bind(this))
		// Metadata cargada
		this.musicPlayer.addEventListener('loadedmetadata', () => {
			this.currentSongDuration = this.musicPlayer.duration
			this.seekBar.max = this.currentSongDuration
		})
		// Canción terminada
		this.musicPlayer.addEventListener('ended', this.playNextSong.bind(this))
		// Error generado en el reproductor
		this.musicPlayer.addEventListener('error', this.showPlayerError.bind(this))
		
		// Reproducir o pausar canción
		this.playPauseBtn.addEventListener('click', this.playPauseSong.bind(this))
		// Reproducir siguiente canción
		this.nextBtn.addEventListener('click', this.playNextSong.bind(this))
		// Reproducir canción anterior
		this.previousBtn.addEventListener('click', this.playPreviousSong.bind(this))
		// Botón de reproducción aleatoria
		this.randomBtn.addEventListener('click', this.setRandomStatus.bind(this))

		// Cambiar punto de reproducción
		this.seekBar.addEventListener('input', () => {
			this.musicPlayer.currentTime = this.seekBar.value
		})
		// Cambiar volumen
		this.volume.bar.addEventListener('input', this.changeVolume.bind(this))
	}
}

module.exports = Player
