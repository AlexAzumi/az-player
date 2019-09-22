// Dependencias
const ipc = require('electron').ipcRenderer
const path = require('path')
const fs = require('fs')
const slash = require('slash')
const { remote } = require('electron')
const { dialog } = require('electron').remote

// Reporte de errores
const sentryConfig = require('../../config')
const { init, showReportDialog } = require('@sentry/electron')

init({
	dsn: sentryConfig.sentryDSN,
	beforeSend(event) {
		// Verificar si es una exepción
		if (event.exception) {
			showReportDialog()
		}

		return event
	}
})

/*
 * Configuración
 */
const config = {
	tickTime: 250,
	playerVolume: 100,
	randomSong: false
}

/*
 * Abrir herramientas
 */
remote.globalShortcut.register('CommandOrControl+Shift+I', () => {
	remote.BrowserWindow.getFocusedWindow().webContents.openDevTools()
})

window.addEventListener('beforeunload', () => {
	remote.globalShortcut.unregisterAll()
})

/*
 * Reproductor
 */
// Fondo del reproductor
const playerElement = document.getElementById('player')
// Título de la canción
const songTitle = document.getElementById('songTitle')
// Contenedor del título
const songTitleContainer = document.getElementById('songTitleContainer')
// Elementos de lista de canciones
const songsListElement = document.getElementById('songList')

/*
 * Controles del reproductor
 */
const playPauseBtn = document.getElementById('playPauseBtn')
const nextBtn = document.getElementById('nextBtn')
const previousBtn = document.getElementById('previousBtn')
// Barra de reproducción
const playerSeekBar = document.getElementById('playerRange')
// Barra de volumen
const volumeBar = document.getElementById('playerVolume')
// Texto de volumen
const volumeText = document.getElementById('volumeText')
// Botón azar
const randomBtn = document.getElementById('randomBtn')
// Búsqueda
const searchInput = document.getElementById('searchInput')
// Sin resultados
const noResults = document.getElementById('noResults')

// Lista de canciones
let songsList
// Duración de la canción actual
let currentSongDuration
// Animación del título
let titleAnimation
// Canciones ya reproducidas
let endedSongs = []

// ID de la canción actual
let currentSong = 0

// Reproductor
let musicPlayer = new Audio()

/*
 * Recibir canciones del main thread
 */
ipc.on('loaded-songs', (event, args) => {
	// Asignar a variable
	songsList = args

	// Ordenar
	songsList = sortList(songsList)
	
	// Mostrar en lista
	addSong(songsList)

	// Asignar volumen
	config.playerVolume = localStorage.getItem('volume')
	if (config.playerVolume != undefined) {
		musicPlayer.volume = config.playerVolume
	}

	// Establecer valores del volumen
	volumeText.innerText = `${musicPlayer.volume * 100}%`
	volumeBar.value = musicPlayer.volume * 100

	// Establecer valores de azar
	if (localStorage.getItem('random')) {
		// Asignar valor
		config.randomSong = localStorage.getItem('random')
		// Verificar si activado
		if (config.randomSong) {
			randomBtn.classList.add('active')
		}
	}
})

/* Botones */
// Anterior
ipc.on('previous-button', () => {
	playPreviousSong()
})

// Reproducir/pausar
ipc.on('play-button', () => {
	playPauseSong()
})

// Siguiente
ipc.on('next-button', () => {
	playNextSong()
})

/**
 * Agregar canciones a la lista
 */
const addSong = (list) => {
	// Vaciar lista
	while (songsListElement.firstChild) {
		songsListElement.removeChild(songsListElement.firstChild);
	}
	
	// ID
	let songID = 0

	// Pasar por cada canción
	for (let song of list) {
		// Crear elemento
		const songElement = document.createElement('div')
		songElement.classList.add('song', 'pl-1', 'py-1', 'pr-4', 'position-relative')
		songElement.innerText = `${song.title} - `
		// Crear subelemento de artista
		const songArtist = document.createElement('span')
		songArtist.innerHTML = song.artist
		songArtist.classList.add('text-muted')
		// Combinar elementos
		songElement.appendChild(songArtist)

		// Icono de reproducción
		const playIcon = document.createElement('i')
		playIcon.classList.add('fa', 'fa-play', 'position-absolute', 'playIcon')

		// Establecer id
		songElement.setAttribute('song-path', path.join(song.path, song.musicFile))
		songElement.setAttribute('song-title', song.title)
		songElement.setAttribute('song-artist', song.artist)
		songElement.id = songID;
		
		if (song.background !== 'NONE') {
			songElement.setAttribute('song-background', path.join(song.path, song.background))
		}
		else {
			songElement.setAttribute('song-background', 'NONE')
		}

		// Agregar listener
		songElement.addEventListener('click', playSelectedSong)

		// Agregar en elemento
		songElement.appendChild(playIcon)

		// Agregar en lista
		songsListElement.appendChild(songElement)

		// Aumentar id
		songID++;
	}
}

/**
 * Reproducir canción selecionada
 */
const playSelectedSong = (event) => {
	// Establecer canción actual
	currentSong = event.srcElement.id

	// Vaciar lista de canciones ya reproducidas
	endedSongs = []

	// Iniciar canción
	startSong(event.srcElement);
}

/**
 * Obtener elemento de canción actual
 */
const getCurrentSongElement = () => {
	// Obtener elemento
	return document.getElementById(currentSong)
}

/**
 * Iniciar canción
 */
const startSong = () => {
	// Obtener elemento
	const songElement = getCurrentSongElement()

	// Extraer información del DOM
	const songTitle = songElement.getAttribute('song-title')
	const songArtist = songElement.getAttribute('song-artist')
	const songPath = songElement.getAttribute('song-path')
	const songBackground = songElement.getAttribute('song-background')
	currentSong = songElement.id

	// Verificar ruta
	if (fs.existsSync(songPath)) {
		// Establecer ruta
		musicPlayer.src = songPath	
	}
	else {
		dialog.showMessageBox({
			title: 'Error',
			message: 'No existe el audio de la canción',
			type: 'error'
		})
		
		return;
	}

	// Eliminar clase activo
	songsListElement.querySelectorAll('.active').forEach((element) => {
		element.classList.remove('active')
	})

	songsListElement.querySelectorAll('.playIcon').forEach((element) => {
		element.classList.remove('playIcon-show')
	})

	// Establecer como activo
	songElement.classList.add('active')

	songElement.childNodes[2].classList.add('playIcon-show')

	// Establecer imagen de fondo
	if (songBackground !== 'NONE') {
		if (fs.existsSync(songBackground)) {
			playerElement.style.backgroundImage = `url("${slash(songBackground)}")`
		}
		else {
			playerElement.style.backgroundImage = 'url("../../assets/img/background.jpg")'
		}
	}
	else {
		playerElement.style.backgroundImage = 'url("../../assets/img/background.jpg")'
	}

	// Renderizar título
	updateMusicInfo(songTitle, songArtist)

	// Reproducir
	musicPlayer.currentTime = 0
	musicPlayer.play()
}

/**
 * Pausar/reproducir canción
 */
const playPauseSong = () => {
	if (musicPlayer.readyState == 0) {
		// Obtener elemento de la canción actual
		const song = getCurrentSongElement()

		// Iniciar canción
		startSong(song)

		return;
	}
	// ¿La canción está pausada?
	if (musicPlayer.paused) {
		musicPlayer.play()
	}
	else {
		musicPlayer.pause()
	}
}

/**
 * Actualizar información mostrada
 */
const updateMusicInfo = (title, artist) => {
	// Establecer título de la ventana
	changeWindowTitle(`${title} - ${artist}`)

	// Establecer título
	songTitle.innerText = `${title} - `

	// Crear subtítulo con artista y establecer valores
	const artistElement = document.createElement('span')
	artistElement.innerHTML = artist

	// Unir elementos
	songTitle.appendChild(artistElement)

	// Verificar si el título es más grande que el contenedor
	if (songTitle.clientWidth > songTitleContainer.offsetWidth) {
		// Obtener diferencia
		let diff = (songTitle.clientWidth - songTitleContainer.offsetWidth) + 32 /* TODO: Cambiar 32 a un calculo del padding */

		// Verificar si la animación ya está corriendo
		if (titleAnimation != undefined && titleAnimation.playState === 'running') {
			// Cancelar la animación
			titleAnimation.cancel()
		}

		// Crear animación
		titleAnimation = songTitle.animate([
			{ transform: 'translateX(0px)' },
			{ transform: `translateX(-${diff}px)` },
			{ transform: 'translateX(0px)' }
		], {
			duration: 8000 * (diff / 70), /* TODO: Ajustar valores */
			iterations: Infinity
		})
	}
	// El texto es más pequeño que el contenedor
	else {
		// ¿La animación se está reproduciendo?
		if (titleAnimation != undefined && titleAnimation.playState === 'running') {
			// Cancelar la animación
			titleAnimation.cancel()
		}
	}
}

/**
 * Estado del reproductor ha cambiado
 */
const changePlayerStatus = (event) => {
	// ¿Está reproduciendo?
	if (event.type === 'play') {
		playPauseBtn.innerHTML = '<i class="fas fa-pause fa-2x"></i>'
	}
	// ¿Está pausado?
	else if (event.type === 'pause') {
		playPauseBtn.innerHTML = '<i class="fas fa-play fa-2x"></i>'
	}
}

/**
 * Establecer tiempo actual de la canción
 */
const changePlayTime = () => {
	// ¿El reproductor terminó una canción?
	if (!musicPlayer.ended) {
		// Regrear la barra al inicio
		const currentTime = musicPlayer.currentTime
		playerSeekBar.value = currentTime
	}
}

/**
 * Siguiente canción
 */
const playNextSong = () => {
 // Verificar si hay más canciones
	if (currentSong < songsList.length - 1) {
		// Reproductor listo
		if (musicPlayer.readyState != 0) {
			// ¿Está azar activado?
			if (config.randomSong) {
				// Agregar a lista de canciones reproducidas
				endedSongs.push(currentSong)
				if (endedSongs.length < songsList.length) {
					let nextSong
					while (nextSong === undefined) {
						// Bandera
						let alreadyPlayed = false
						// Número al azar
						let selectedSong = Math.floor(Math.random() * songsList.length)
						// Verificar numero por número
						for (let song of endedSongs) {
							if (song === selectedSong) {
								alreadyPlayed = true
							}
						}
						// Asignar valores
						if (!alreadyPlayed) {
							nextSong = selectedSong
						}
					}
					currentSong = nextSong
				} 
				else {
					// Vaciar lista de canciones
					endedSongs = []
					// Número al azar
					currentSong = Math.floor(Math.random() * songsList.length)
				}
			}
			else {
				currentSong++
			}
		}
	}
	else {
		currentSong = 0
	}

	// Iniciar canción
	startSong()
}

/**
 * Canción anterior
 */
const playPreviousSong = () => {
	// Verificar si hay más canciones
	if (currentSong > 0) {
		currentSong--
	}
	else {
		currentSong = songsList.length - 1
	}

	// Iniciar canción
	startSong()
}

/**
 * Cambiar título de la ventana
 */
const changeWindowTitle = (title) => {
	ipc.send('change-player-title', title)
}

/**
 * Buscar canciones
 */
const searchSongs = () => {
	// Filtrar
	let searchResults = songsList.filter((song) => {
		const title = song.title.toLowerCase()
		const artist = song.artist.toLowerCase()
		if (title.includes(searchInput.value.toLowerCase()) || artist.includes(searchInput.value.toLowerCase())) {
			return true
		}
		else {
			return false
		}
	})

	searchResults = sortList(searchResults)
	
	// Verificar resultados
	if (searchResults.length > 0) {
		noResults.classList.add('d-none')
	} else {
		noResults.classList.remove('d-none')
	}

	// Ocultar elementos
	for (let element of songsListElement.children) {
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
 * Ordernar lista
 */
const sortList = (list) => {
	return list.sort((a, b) => {
		if (a.title.toLowerCase() > b.title.toLowerCase) {
			return 1
		} else {
			return -1
		}
	})
}

/*
 * Eventos de los controles
 */

// Botón de pausa
playPauseBtn.addEventListener('click', playPauseSong)

// Cambiar punto de reproducción
playerSeekBar.addEventListener('input', () => {
	musicPlayer.currentTime = playerSeekBar.value
})

// Cambiar volumen
volumeBar.addEventListener('input', () => {
	// Obtener valor
	config.playerVolume = volumeBar.value / 100
	// Almacenar en configuración
	musicPlayer.volume = config.playerVolume
	volumeText.innerText = `${volumeBar.value}%`

	// Guardar localmente
	localStorage.setItem('volume', musicPlayer.volume)
})

// Siguiente canción
nextBtn.addEventListener('click', playNextSong)

// Canción anterior
previousBtn.addEventListener('click', playPreviousSong)

// Botón azar
randomBtn.addEventListener('click', (event) => {
	// Activar/desactivar bandera
	if (config.randomSong) {
		config.randomSong = false
		event.srcElement.parentElement.classList.remove('active')
	}
	else {
		config.randomSong = true
		event.srcElement.parentElement.classList.add('active')
	}

	localStorage.setItem('random', config.randomSong)
})

searchInput.addEventListener('input', searchSongs)

/*
 * Eventos del reproductor
 */

// Reproducir música
musicPlayer.addEventListener('play', changePlayerStatus)

// Pausar música
musicPlayer.addEventListener('pause', changePlayerStatus)

// Metadata cargada
musicPlayer.addEventListener('loadedmetadata', () => {
	currentSongDuration = musicPlayer.duration
	playerSeekBar.max = currentSongDuration
})

// Canción terminada
musicPlayer.addEventListener('ended', () => {
	// Regresar rango a cero
	playerSeekBar.value = 0

	// Reproducir la siguiente canción
	playNextSong()
})

// Error al reproducir
musicPlayer.addEventListener('error', () => {
	dialog.showMessageBox({
		title: 'Error',
		message: 'Se ha producido un error al reproducir el audio',
		type: 'error'
	})
})

/*
 * Timers
 */

// Actualizar barra de reproducción
setInterval(changePlayTime, config.tickTime)

/*
 * Actualizaciones automáticas
 */
const updateBox = document.getElementById('updateBox')

// Botones de actualización
const acceptUpdateBtn = document.getElementById('acceptUpdateBtn')
const declineUpdateBtn = document.getElementById('declineUpdateBtn')

/*
 * Eventos de botones
 */
acceptUpdateBtn.addEventListener('click', () => {
	ipc.send('update-accepted')
})

declineUpdateBtn.addEventListener('click', () => {
	// Ocultar caja
	updateBox.classList.remove('show')
})

// Actualización disponible
ipc.on('update-available', () => {
	updateBox.classList.add('show')
})

// Error al actualizar
ipc.on('update-error', () => {
	dialog.showMessageBoxSync({
		title: 'Error de descarga',
		message: 'Hubo un error al descargar la aplicación',
		type: 'error'
	})
})

// Actualización descargada
ipc.on('update-downloaded', () => {
	const response = dialog.showMessageBoxSync({
		title: 'Actualización descargada',
		message: '¿Desea aplicar la actualización? (Se cerrará la aplicación)',
		type: 'question',
		buttons: ['Aceptar', 'Cancelar']
	})

	if (response == 0) {
		ipc.send('quit-and-install')
	}
})
