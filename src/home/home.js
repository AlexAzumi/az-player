// Dependencias
const ipc = require('electron').ipcRenderer
const path = require('path')
const slash = require('slash')

/*
 * Configuración
 */
const config = {
	tickTime: 250
}

/*
 * Elementos
 */
const playerElement = document.getElementById('player')
const songTitle = document.getElementById('songTitle')
const songList = document.getElementById('songList')
const songTitleContainer = document.getElementById('songTitleContainer')

// Controles
const playPauseBtn = document.getElementById('playPauseBtn')
const nextBtn = document.getElementById('nextBtn')
const previousBtn = document.getElementById('previousBtn')
const playerRange = document.getElementById('playerRange')
const playerVolume = document.getElementById('playerVolume')
const volumeText = document.getElementById('volumeText')

// Variables
let songs
let currentSongDuration
let titleAnimation

let currentSong = 0

// Reproductor
let musicPlayer = new Audio()

// Recibir datos del main
ipc.on('loaded-songs', (event, args) => {
	// Asignar a variable
	songs = args
	
	// Mostrar en lista
	addSong()

	volumeText.innerText = `${playerVolume.value}%`
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
	for (let song of songs) {
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
		songList.appendChild(songElement)

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
	const songArtist= songElement.getAttribute('song-artist')
	const songPath = songElement.getAttribute('song-path')
	const songBackground = songElement.getAttribute('song-background')
	currentSong = songElement.id

	// Eliminar clase activo
	songList.querySelectorAll('.active').forEach((element) => {
		element.classList.remove('active')
	})

	songList.querySelectorAll('.playIcon').forEach((element) => {
		element.classList.remove('playIcon-show')
	})

	// Establecer como activo
	songElement.classList.add('active')

	songElement.childNodes[2].classList.add('playIcon-show')

	// Establecer ruta
	musicPlayer.src = songPath

	// Establecer imagen de fondo
	playerElement.style.backgroundImage = `url("${slash(songBackground)}")`

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
	// Establecer título
	songTitle.innerText = `${title} - `

	// Crear subtítulo con artista y establecer valores
	const artistElement = document.createElement('span')
	artistElement.innerHTML = artist

	// Unir elementos
	songTitle.appendChild(artistElement)

	//console.warn(`${songTitle.clientWidth} - ${songTitleContainer.offsetWidth}`)

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
		playerRange.value = currentTime
	}
}

/**
 * Siguiente canción
 */
const playNextSong = () => {
 // Verificar si hay más canciones
	if (currentSong < songs.length - 1) {
		if (musicPlayer.readyState != 0) {
			currentSong++
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
		currentSong = songs.length - 1
	}

	// Iniciar canción
	startSong()
}

/*
 * Eventos de los controles
 */

// Botón de pausa
playPauseBtn.addEventListener('click', playPauseSong)

// Cambiar punto de reproducción
playerRange.addEventListener('input', () => {
	musicPlayer.currentTime = playerRange.value
})

// Cambiar volumen
playerVolume.addEventListener('input', () => {
	musicPlayer.volume = playerVolume.value / 100
	volumeText.innerText = `${playerVolume.value}%`
})

// Siguiente canción
nextBtn.addEventListener('click', playNextSong)

// Canción anterior
previousBtn.addEventListener('click', playPreviousSong)

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
	playerRange.max = currentSongDuration
})

// Canción terminada
musicPlayer.addEventListener('ended', () => {
	// Regresar rango a cero
	playerRange.value = 0

	// Reproducir la siguiente canción
	playNextSong()
})

/**
 * Timers
 */

// Actualizar barra de reproducción
setInterval(changePlayTime, config.tickTime)
