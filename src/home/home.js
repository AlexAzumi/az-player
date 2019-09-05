// Dependencias
const ipc = require('electron').ipcRenderer
const path = require('path')
const slash = require('slash')

/*
 * Elementos
 */
const playerElement = document.getElementById('player')
const songTitle = document.getElementById('songTitle')
const songList = document.getElementById('songList')

// Controles
const playPauseBtn = document.getElementById('playPauseBtn')
const playerRange = document.getElementById('playerRange')

// Variables
let songs
let currentSongDuration

// Reproductor
let musicPlayer = new Audio()

// Recibir datos del main
ipc.on('loaded-songs', (event, args) => {
	// Asignar a variable
	songs = args
	
	// Mostrar en lista
	addSong()
})

/**
 * Agregar canciones a la lista
 */
const addSong = () => {
	// Par
	let pair = false

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
	}
}

/**
 * Reproducir canción selecionada
 */
const playSelectedSong = (event) => {
	// Obtener elemento
	const songElement = event.srcElement
	// Extraer información
	const songTitle = songElement.getAttribute('song-title')
	const songArtist= songElement.getAttribute('song-artist')
	const songPath = songElement.getAttribute('song-path')
	const songBackground = songElement.getAttribute('song-background')

	// Eliminar clase activo
	event.target.parentElement.querySelectorAll('.active').forEach((element) => {
		element.classList.remove('active')
	})

	event.target.parentElement.querySelectorAll('.playIcon').forEach((element) => {
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
}

/**
 * Estado del reproductor ha cambiado
 */
const changePlayerStatus = (event) => {
	if (event.type === 'play') {
		playPauseBtn.innerHTML = '<i class="fas fa-pause fa-2x"></i>'
	}
	else if (event.type === 'pause') {
		playPauseBtn.innerHTML = '<i class="fas fa-play fa-2x"></i>'
	}
}

/**
 * Establecer tiempo actual de la canción
 */
const changePlayTime = () => {
	if (!musicPlayer.ended) {
		const currentTime = musicPlayer.currentTime
		playerRange.value = currentTime
	}
}

/*
 * Eventos de los controles
 */
// Botón de pausa
playPauseBtn.addEventListener('click', playPauseSong)

playerRange.addEventListener('input', (event) => {
	console.log(playerRange.value)
	musicPlayer.currentTime = playerRange.value
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
	playerRange.max = currentSongDuration
})
// Canción terminada
musicPlayer.addEventListener('ended', () => {
	playerRange.value = 0
})

/**
 * Timers
 */
setInterval(changePlayTime, 250)