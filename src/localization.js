// Dependencias
const electron = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_LOCALE = 'en';
const LOCALE_CONFIG_DIR = path.join(os.homedir(), 'az-player', 'localization.json');
const LOCALE_DIR = path.join(__dirname, '../localization');

class LocalizationManager {
	/**
	 * Constructor
	 */
	constructor() {
		// Obtener applicación
		this.app = electron.app ? electron.app : electron.remote.app;
		// Obtener localización
		this.locale = this.getLocale(this.app);
		// Obtener configuración
		this.localeConfig = this.getLocaleConfig(LOCALE_CONFIG_DIR);
		// Cargar archivo de localización
		this.localization = this.getLocaleFile(LOCALE_DIR);

		// Log
		console.log(`Locale: ${this.locale} | Configured locale: ${this.localeConfig}`);
	}

	/**
	 * Obtener localización
	 * @param {Electron.App} app Aplicación de Electron
	 * @returns {string} Localización
	 */
	getLocale(app) {
		return app.getLocale();
	}

	/**
	 * Obtener configuración de localización
	 * @param {string} localizationDir Ubicación de la configuración
	 */
	getLocaleConfig(localizationDir) {
		if (fs.existsSync(localizationDir)) {
			// Leer archivo
			try {
				const read = fs.readFileSync(localizationDir);
				return JSON.parse(read).localization;
			} catch (ex) {
				console.error(ex);
				this.app.exit(-1);
			}
		} else {
			// Crear archivo
			const localization = {
				localization: this.locale
			};
			const data = JSON.stringify(localization, null, 2);

			// Verificar la existencia de la carpeta
			const azFolder = path.join(LOCALE_CONFIG_DIR, '../');
			if (!fs.existsSync(azFolder)) {
				fs.mkdirSync(azFolder);
			}

			// Escribir archivo de localización
			try {
				fs.writeFileSync(localizationDir, data, 'utf-8');
				return localization.localization;
			} catch (ex) {
				console.error(ex);
				this.app.exit(-1);
			}
		}
	}

	/**
	 * Obtener datos de archivo de localización
	 * @return Datos de localización
	 */
	getLocaleFile(localesDir) {
		let localePath = path.join(localesDir, `${this.localeConfig}.json`);
		if (fs.existsSync(localePath)) {
			try {
				const load = fs.readFileSync(localePath);
				return JSON.parse(load);
			} catch (ex) {
				console.error(ex);
				this.app.exit(-1);
			}
		} else {
			// Verificar si variación de idioma
			if (this.localeConfig.includes('-')) {
				const locale = this.localeConfig.split('-');
				localePath = path.join(localesDir, `${locale[0]}.json`);
				// Buscar idioma
				if (fs.existsSync(localePath)) {
					try {
						const load = fs.readFileSync(localePath);
						return JSON.parse(load);
					} catch (ex) {
						console.error(ex);
						this.app.exit(-1);
					}
				} else {
					return DEFAULT_LOCALE;
				}
			} else {
				return DEFAULT_LOCALE;
			}
		}
	}

	/**
	 * Obtener cadena en localización
	 * @param {string} location Localización de la cadena
	 */
	getString(location) {
		if (location) {
			let phrase;
			const positions = location.split('.');
			for (let position of positions) {
				try {
					if (phrase) {
						phrase = phrase[position];
					} else {
						phrase = this.localization[position];
					}
				} catch (ex) {
					console.error(ex);
					this.app.exit(-1);
				}
			}

			return phrase;
		} else {
			throw 'Localization Manager: Falta localización del texto';
		}
	}

	/**
	 * Obtener lista de localizaciones
	 */
	getLocalizationList() {
		const files = fs
			.readdirSync(LOCALE_DIR, { withFileTypes: true })
			.filter((file) => !file.isDirectory())
			.filter((file) => file.name.includes('.json'))
			.map((file) => file.name);

		let locals = [];
		for (let file of files) {
			const location = path.join(LOCALE_DIR, file);
			try {
				const read = fs.readFileSync(location);
				const parts = file.split('.');
				locals.push({
					locale: parts[0],
					localeName: JSON.parse(read).localization
				});
			} catch (ex) {
				console.error(ex);
			}
		}

		return locals;
	}

	/**
	 * Obtener localización actual
	 * @return {string} Localización actual
	 */
	getActualLocale() {
		return this.localeConfig;
	}

	/**
	 * Establecer localización
	 * @param {string} locale Nombre corto de localización
	 * @return {boolean} Se realizó el cambio o no
	 */
	setLocale(locale) {
		if (locale) {
			try {
				const data = JSON.stringify(
					{
						localization: locale
					},
					null,
					2
				);
				fs.writeFileSync(LOCALE_CONFIG_DIR, data);

				return true;
			} catch (ex) {
				// Log
				console.error(ex);
				return false;
			}
		} else {
			throw 'Localization Manager: Falta localización a cambiar';
		}
	}
}

module.exports = LocalizationManager;
