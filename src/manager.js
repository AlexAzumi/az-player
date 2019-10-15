// Dependencias
const { dialog, app } = require('electron');
const log = require('electron-log');
const fs = require('fs');
const LineByLine = require('n-readlines');
const path = require('path');
const sentry = require('@sentry/electron');

const LocalizationManager = require('./localization');

log.catchErrors({
	showDialog: true
});

class Manager {
	/**
	 * Constructor
	 */
	constructor() {
		// Localización
		this.localization = new LocalizationManager();
		// Aplicación
		this.app = app;
	}

	/**
	 * Seleccionar carpeta de osu!
	 * @return Carpeta seleccionada
	 */
	selectGameFolder() {
		// Solicitar carpeta al usuario
		const folder = dialog.showOpenDialogSync({
			title: this.localization.getString('openFolderDialog.title'),
			properties: [ 'openDirectory' ]
		});
		// Carpeta seleccionada
		if (folder !== undefined) {
			return folder[0];
		}
		// No se seleccionó una carpeta
		return undefined;
	}

	/**
	 * Verifica si existe la carpeta de canciones
	 * @param {string} gameLocation 
	 * @return Se encontró la carpeta o no
	 */
	searchSongsFolder(gameLocation) {
		// Nunca se seleccionó carpeta
		if (gameLocation === undefined) {
			this.app.exit(0);
		} else if (fs.existsSync(path.join(gameLocation, 'Songs'))) {
			// Se seleccionó la carpeta correcta
			return true;
		} else {
			// Se seleccionó la carpeta incorrecta
			return false;
		}
	}

	/**
	 * Enlistar las carpetas dentro de "Songs"
	 * @param {string} songsLocation Directorio de canciones
	 * @return Lista de carpetas encontradas
	 */
	listSongsFolder(songsLocation) {
		// Buscar y filtrar directorios
		return fs
			.readdirSync(songsLocation, { withFileTypes: true })
			.filter((dir) => dir.isDirectory())
			.map((dir) => dir.name);
	}

	/**
	 * Cargar base de datos
	 * @param {string} location Localización de la base de datos
	 * @return Lista de canciones
	 */
	loadDatabase(location) {
		let file;
		// Cargar archivo
		try {
			file = fs.readFileSync(location);
			// Log
			console.log(`Base de datos cargada | ${location}`);
		} catch (ex) {
			// Capturar excepción
			sentry.captureException(ex);
			// Mostrar mensaje
			dialog.showErrorBox('Error', 'No se pudo leer la base de datos');
			// Terminar aplicación
			this.app.quit();
		}
		// Regresar lista de archivos
		return JSON.parse(file);
	}

	/**
	 * Crear base de datos
	 * @param {string} databaseLocation Localización de la base de datos
	 * @param songsData Información de la base de datos
	 */
	createDatabase({ location, folder }, songsData) {
		// Verificar si existe la base de datos
		if (fs.existsSync(location)) {
			fs.unlinkSync(location);
		}
		// Dar formato apropiado
		let content = JSON.stringify(songsData, null, 2);
		// Crear carpeta
		if (!fs.existsSync(folder)) {
			fs.mkdirSync(folder);
		}
		// Escribir archivo
		try {
			fs.writeFileSync(location, content, 'utf-8');
		} catch (ex) {
			// Capturar
			sentry.captureException(ex);
			// Mostrar error
			dialog.showErrorBox('Error', 'No se pudo crear la base de datos');
			// Salir de la aplicación
			this.app.quit();
		}
	}

	/**
	 * Obtener información de las canciones
	 * @param {string} songsLocation Localización de la carpeta de canciones
	 * @return Lista de canciones
	 */
	getSongsData(songsLocation) {
		// Canciones
		let songs = new Array();

		// Pasar canción por canción encontrada
		for (let song of songList) {
			let files;
			// Unir carpetas
			const folderPath = path.join(songsLocation, song);
			// Leer directorio
			try {
				files = fs.readdirSync(folderPath);
			} catch (ex) {
				// Reportar error
				sentry.captureException(ex);
				// Pasar a la siguiente canción
				continue;
			}
			// Obtener canción
			const data = this.getSong(files, folderPath, songsLocation);
			if (data) {
				songs.push(data);
			}
		}
		// Regresar lista de música
		return songs;
	}

	/**
	 * Obtener información de canciones
	 * @param {string[]} files Lista de archivos
	 * @param {string} folderPath Localización de los archivos
	 */
	getSong(files, folderPath) {
		// Canción
		let song = {
			path: null,
			audio: null,
			title: null,
			artist: null,
			background: null
		};
		// Almacenar dirección
		song.path = folderPath;
		// Buscar archivos
		for (let file of files) {
			if (file.includes('.osu') || file.includes('.OSU')) {
				// Bandera
				let isNextBG = false;
				// Crear liner
				let liner;
				// Log
				console.log(`Archivo .osu encontrado! ${file}`);
				// Dirección del archivo
				let filePath = path.join(song.path, file);

				// Crear liner
				try {
					liner = new LineByLine(filePath);
				} catch (ex) {
					console.log(ex);
					// Reportar a sentry
					sentry.withScope((scope) => {
						// Añadir extras
						scope.setExtra('Archivo', filePath);
						// Mandar excepción
						sentry.captureException(ex);
					});
					// Leer siguiente beatmap
					continue;
				}

				// Línea
				let line;
				// Leer archivo linea por línea
				while (line !== false) {
					// Leer línea
					line = liner.next();
					// Verificar si existe una línea
					if (!line) {
						break;
					}
					line = line.toString('ascii');

					// Título encontrado
					if (line.includes('Title:')) {
						line = line.replace('Title:', '');
						line = this.deleteSpecialCharacter(line);
						song.title = line;
					} else if (line.includes('Artist:')) {
						// Artista encontrado
						line = line.replace('Artist:', '');
						line = this.deleteSpecialCharacter(line);
						song.artist = line;
					} else if (line.includes('AudioFilename:')) {
						// Nombre de audio encontrado
						line = line.replace('AudioFilename: ', '');
						line = this.deleteSpecialCharacter(line);
						song.audio = line;
					} else if (isNextBG) {
						// Crear regex
						const checkRegex = RegExp('"(.)+.(jpg|png)"', 'i');
						// Probar regex
						if (checkRegex.test(line)) {
							line = line.split('"');
							song.background = line[1];
							isNextBG = false;
						}
					} else if (line.includes('[Events]')) {
						isNextBG = true;
					}

					if (song.artist && song.audio && song.background && song.path && song.title) {
						return song;
					}
				}
				// No se encontró un fondo
				if (isNextBG) {
					song.background = 'NONE';
				}
				// Dejar de buscar archivos en carpeta
				return song;
			}
		}
		return null;
	}

	/**
	 * Eliminar caracteres especiales
	 * @param string text 
	 */
	deleteSpecialCharacter(text) {
		return text.replace(/\r/, '');
	}
}

module.exports = Manager;
