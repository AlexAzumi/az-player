// Dependencias
const ipc = require('electron').ipcRenderer
const path = require('path')
const slash = require('slash')
const { dialog } = require('electron').remote

/*
 * Configuración
 */
const config = {
	tickTime: 250,
	playerVolume: 100,
	randomSong: false
}

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
	
	// Mostrar en lista
	addSong()

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

/**
 * Agregar canciones a la lista
 */
const addSong = () => {
	// Par
	let pair = false
	// ID
	let songID = 0

	// Pasar por cada canción
	for (let song of songsList) {
		// Crear elemento
		const songElement = document.createElement('div')
		songElement.classList.add('pl-1', 'py-1', 'pr-4', 'position-relative')
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

		// Elemento par
		if (pair) {
			songElement.classList.add('list-pair')
			pair = false
		}
		// Elemento impar
		else {
			songElement.classList.add('list-pair-not')
			pair = true
		}

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

	// Establecer ruta
	musicPlayer.src = songPath

	// Establecer imagen de fondo
	if (songBackground !== 'NONE') {
		playerElement.style.backgroundImage = `url("${slash(songBackground)}")`
	}
	else {
		playerElement.style.backgroundImage = 'url("../../assets/img/placeholder.jpg")'
	}

	// Renderizar título
	updateMusicInfo(songTitle, songArtist)

	// Reproducir
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
				console.log(endedSongs)
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
musicPlayer.addEventListener('error', (err) => {
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
