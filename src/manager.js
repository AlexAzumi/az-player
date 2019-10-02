// Dependencias
const { dialog } = require('electron')
const fs = require('fs')
const lineByLine = require('n-readlines')
const path = require('path')
const sentry = require('@sentry/electron')

class Manager {
	/**
	 * Constructor
	 * @param application Aplicación de Electron
	 */
	constructor(application) {
		// Aplicación
		this.app = application
	}

	/**
	 * Seleccionar carpeta de osu!
	 * @return Carpeta seleccionada
	 */
	selectGameFolder() {
		// Solicitar carpeta al usuario
		const folder = dialog.showOpenDialogSync({
			title: 'Selecciona la carpeta de osu!',
			properties: [
				'openDirectory'
			]
		})
		// Carpeta seleccionada
		if (folder !== undefined) {
			return folder[0]
		}
		// No se seleccionó una carpeta
		return undefined
	}
	
	/**
	 * Verifica si existe la carpeta de canciones
	 * @param {string} gameLocation 
	 * @return Se encontró la carpeta o no
	 */
	searchSongsFolder(gameLocation) {
		// Nunca se seleccionó carpeta
		if (gameLocation === undefined) {
			this.app.exit(-1)
		}
		// Se seleccionó la carpeta correcta
		else if (fs.existsSync(path.join(gameLocation, 'Songs'))) {
			return true
		}
		// Se seleccionó la carpeta incorrecta
		else {
			return false
		}
	}
	
	/**
	 * Enlistar las carpetas dentro de "Songs"
	 * @param {string} songsLocation Directorio de canciones
	 * @return Lista de carpetas encontradas
	 */
	listSongsFolder(songsLocation) {
		// Buscar y filtrar directorios
		return fs.readdirSync(songsLocation, { withFileTypes: true })
			.filter(dir => dir.isDirectory())
			.map(dir => dir.name)
	}

	/**
	 * Cargar base de datos
	 * @param {string} location Localización de la base de datos
	 * @return Lista de canciones
	 */
	loadDatabase(location) {
		let file
		// Cargar archivo
		try {
			file = fs.readFileSync(location)
			// Log
			console.log(`Base de datos cargada | ${location}`)
		}
		catch (ex) {
			// Capturar excepción
			sentry.captureException(ex)
			// Mostrar mensaje
			dialog.showErrorBox(
				'Error',
				'No se pudo leer la base de datos')
			// Terminar aplicación
			this.app.quit()
		}
		// Regresar lista de archivos
		return JSON.parse(file)
	}

	/**
	 * Crear base de datos
	 * @param {string} databaseLocation Localización de la base de datos
	 * @param songsData Información de la base de datos
	 */
	createDatabase({location, folder}, songsData) {
		// Verificar si existe la base de datos
		if (fs.existsSync(location)) {
			fs.unlinkSync(location)
		}
		// Dar formato apropiado
		let content = JSON.stringify(songsData, null, 2)
		// Crear carpeta
		if (!fs.existsSync(folder)) {
			fs.mkdirSync(folder)
		}
		// Escribir archivo
		try {
			fs.writeFileSync(location, content, 'utf-8')
		}
		catch (ex) {
			// Capturar
			sentry.captureException(ex)
			// Mostrar error
			dialog.showErrorBox(
				'Error',
				'No se pudo crear la base de datos')
			// Salir de la aplicación
			this.app.quit()
		}
	}

	/**
	 * Obtener información de las canciones
	 * @param {string} songsLocation Localización de la carpeta de canciones
	 * @return Lista de canciones
	 */
	getSongsData(songsLocation) {
		// Información alamacenada temporalmente
		let tempPath = []
		let tempMusics = []
		let tempTitles = []
		let tempArtists = []
		let tempBgs = []

		// Pasar canción por canción encontrada
		for (let song of songList) {
			let files
			// Unir carpetas
			const folderPath = path.join(songsLocation, song);
			// Leer directorio
			try {
				files = fs.readdirSync(folderPath)
			}
			catch(ex) {
				// Reportar error
				sentry.captureException(ex)
				// Pasar a la siguiente canción
				continue
			}
			// Almacenar dirección
			tempPath.push(folderPath)
			// Buscar archivos
			for (let file of files) {
				if (file.includes('.osu') || file.includes('.OSU')) {
					// Crear liner
					let liner
					// Log
					console.log(`Archivo .osu encontrado! ${file}`)
					// Banderas
					let foundMusic = false
					let foundTitle = false
					let foundArtist = false
					let foundBg = false

					let nextIsBg = false

					// Dirección del archivo
					let filePath = path.join(songsLocation, song, file)

					// Crear instancia
					try {
						liner = new lineByLine(filePath)
					}
					catch (ex) {
						// Reportar a sentry
						sentry.withScope((scope) => {
							// Añadir extras
							scope.setExtra('Archivo', filePath)
							// Mandar excepción
							sentry.captureException(ex)
						})
						// Leer siguiente beatmap
						continue
					}

					// Línea
					let line
					// Leer archivo linea por línea
					while (line !== false) {
						// Leer línea
						line = liner.next()

						// Verificar si existe una línea
						if (!line) {
							break
						}
						line = line.toString('ascii')

						// Título encontrado
						if (line.includes('Title:')) {
							line = line.replace('Title:', '')
							tempTitles.push(line)
							foundTitle = true
						}
						// Artista encontrado
						else if (line.includes('Artist:')) {
							line = line.replace('Artist:', '')
							console.log(`Artista: ${line}`)
							tempArtists.push(line)
							foundArtist = true
						}
						// Nombre de audio encontrado
						else if (line.includes('AudioFilename:')) {
							line = line.replace('AudioFilename: ', '')
							tempMusics.push(line)
							foundMusic = true
						}
						else if (nextIsBg) {
							// Crear regex
							const checkRegex = RegExp('\"(.)+.(jpg|png)\"', 'i')
							// Probar regex
							if (checkRegex.test(line)) {
								line = line.split('"')
								tempBgs.push(line[1])

								foundBg = true
								nextIsBg = false
							}
						}
						else if (line.includes('[Events]'))
						{
							nextIsBg = true
						}

						// Toda la información necesaria fue encontrada
						if (foundMusic && foundArtist && foundTitle && foundBg) {
							break
						}
					}
					// No se encontró un fondo
					if (nextIsBg) {
						tempBgs.push('NONE')
					}
					// Dejar de buscar archivos en carpeta
					break
				}
			}
		}

		// Almacenar información temporalmente
		let tempMusicInfo = []

		// Crear lista de canciones
		for (let i = 0; i < tempMusics.length; i++) {
			tempMusicInfo.push({
				path: tempPath[i],
				musicFile: tempMusics[i].replace(/\r/, ''),
				title: tempTitles[i].replace(/\r/, ''),
				artist: tempArtists[i].replace(/\r/, ''),
				background: tempBgs[i].replace(/\r/, '')
			})
		}
		// Regresar lista de música
		return tempMusicInfo
	}
}

module.exports = Manager;
