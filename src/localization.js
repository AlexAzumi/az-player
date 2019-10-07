// Dependencias
const electron = require('electron')
const fs = require('fs')
const os = require('os')
const path = require('path')

const LOCALE_CONFIG_DIR = path.join(os.homedir(), 'osu-player', 'localization.json')
const LOCALE_DIR = path.join(__dirname, '../localization')

class LocalizationManager {
	/**
	 * Constructor
	 */
	constructor() {
		// Obtener applicación
		this.app = electron.app ? electron.app : electron.remote.app
		// Obtener localización
		this.locale = this.getLocale(this.app)
		// Obtener configuración
		this.localeConfig = this.getLocaleConfig(LOCALE_CONFIG_DIR)
		// Cargar archivo de localización
		this.localization = this.getLocaleFile(LOCALE_DIR)

		// Log
		console.log(`Locale: ${this.locale} | Configured locale: ${this.localeConfig}`)
	}

	/**
	 * Obtener localización
	 * @param {Electron.App} app Aplicación de Electron
	 * @returns {string} Localización
	 */
	getLocale(app) {
		return app.getLocale()
	}

	/**
	 * Obtener configuración de localización
	 * @param {string} localizationDir Ubicación de la configuración
	 */
	getLocaleConfig(localizationDir) {
		if (fs.existsSync(localizationDir)) {
			// Leer archivo
			try {
				const read = fs.readFileSync(localizationDir)
				return JSON.parse(read).localization
			} catch (ex) {
				console.error(ex)
				this.app.exit(-1)
			}
		} else {
			// Crear archivo
			const localization = {
				localization: this.locale
			}
			const data = JSON.stringify(localization, null, 2)
			try {
				fs.writeFileSync(localizationDir, data, 'utf-8')
				return localization.localization
			} catch (ex) {
				console.error(ex)
				this.app.exit(-1)
			}
		}
	}

	/**
	 * Obtener datos de archivo de localización
	 * @return Datos de localización
	 */
	getLocaleFile(localesDir) {
		let localePath = path.join(localesDir, `${this.localeConfig}.json`)
		if (fs.existsSync(localePath)) {
			try {
				const load = fs.readFileSync(localePath)
				return JSON.parse(load)
			} catch (ex) {
				console.error(ex)
				this.app.exit(-1)
			}
		} else {
			// Verificar si variación de idioma
			if (this.localeConfig.includes('-')) {
				const locale = this.localeConfig.split('-')
				localePath = path.join(localesDir, `${locale[0]}.json`)
				// Buscar idioma
				if (fs.existsSync(localePath)) {
					try {
						const load = fs.readFileSync(localePath)
						return JSON.parse(load)
					} catch (ex) {
						console.error(ex)
						this.app.exit(-1)
					}
				} else {
					console.error(ex)
					this.app.exit(-1)
				}
			} else {
				console.error(ex)
				this.app.exit(-1)
			}
		}
	}

	/**
	 * Obtener cadena en localización
	 * @param {string} location Localización de la cadena
	 */
	getString(location) {
		if (location) {
			let phrase
			const positions = location.split('.')
			for (let position of positions) {
				try {
					if (phrase) {
						phrase = phrase[position]
					} else {
						phrase = this.localization[position]
					}
				} catch (ex) {
					console.error(ex)
					this.app.exit(-1)
				}
			}

			return phrase
		} else {
			throw 'Localization Manager: Falta localización del texto'
		}
	}
}

module.exports = LocalizationManager
