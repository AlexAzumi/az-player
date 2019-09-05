// Dependencias
const ipc = require('electron').ipcRenderer
const path = require('path')
const slash = require('slash')

// Elementos
const playerElement = document.getElementById('player')
const songTitle = document.getElementById('songTitle')
const songList = document.getElementById('songList')

// Variables
let songs

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
		songElement.innerText = `${song.title} - `
		// Crear subelemento de artista
		const songArtist = document.createElement('span')
		songArtist.innerHTML = song.artist
		songArtist.classList.add('text-muted')
		// Combinar elementos
		songElement.appendChild(songArtist)
		// Agregar clases
		songElement.classList.add('px-1', 'py-1')

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

	// Establecer como activo
	songElement.classList.add('active')

	// Establecer ruta
	musicPlayer.src = songPath

	// Establecer imagen de fondo
	console.log(slash(songBackground))
	playerElement.style.backgroundImage = `url("${slash(songBackground)}")`

	// Renderizar título
	updateMusicInfo(songTitle, songArtist)

	musicPlayer.play()
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
