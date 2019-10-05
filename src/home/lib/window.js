// Dependencias
const { remote } = require('electron')

/*
 * Controles de ventana
 */
class Window {
	/**
	 * Constructor
	 */
	constructor() {
		// Obtener elementos
		this.minimizeButton = document.getElementById('minimizeButton')
		this.maximizeButton = document.getElementById('maximizeButton')
		this.closeButton = document.getElementById('closeButton')

		/*
		 * Listeners
		 */

		// Minimizar ventana
		this.minimizeButton.addEventListener('click', () => {
			const window = remote.getCurrentWindow()
			window.minimize()
		})
		// Maximizar ventana
		this.maximizeButton.addEventListener('click', () => {
			const window = remote.getCurrentWindow()
			if (window.isMaximized()) {
				// Cambiar icono
				this.maximizeButton.innerHTML = '<i class="fas fa-window-maximize fa-fw"></i>'
				window.unmaximize()
			}
			else {
				// Cambiar icono
				this.maximizeButton.innerHTML = '<i class="far fa-window-maximize fa-fw"></i>'
				window.maximize()
			}
		})
		// Cerrar ventana
		this.closeButton.addEventListener('click', () => {
			const window = remote.getCurrentWindow()
			window.close()
		})
	}
}

module.exports = Window
