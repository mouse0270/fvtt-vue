import * as Vue from 'vue';
import * as SFC from 'vue3-sfc-loader';

export const loadModule = (...args) => SFC.loadModule(...args);


const VuePartials = {};
/**
 * Options object for Vue Single File Components (SFC).
 *
 * @typedef {Object} VueSFCOptions
 * @property {Object} moduleCache - The module cache object.
 * @property {Function} getFile - A function that retrieves the content of a file.
 * @property {Function} addStyle - A function that adds styles to the document head.
 */
export const VueSFCOptions = {
	moduleCache: { vue: Vue },
	/**
	 * Retrieves the content of a file from the specified URL.
	 * @param {string} url - The URL of the file to fetch.
	 * @returns {Promise<{ getContentData: (asBinary: boolean) => Promise<ArrayBuffer | string> }>} - A promise that resolves to an object with a `getContentData` function.
	 * The `getContentData` function can be used to retrieve the content of the file as either an `ArrayBuffer` or a string, depending on the `asBinary` parameter.
	 * @throws {Error} - If the fetch request fails, an error is thrown with the status text and URL.
	 */
	async getFile(url) {
		const res = await fetch(url);
		if (!res.ok) throw Object.assign(new Error(res.statusText + ' ' + url), { res });

		// SFCLoader assumes .js files are not ES Modules, so we need to change the extension to .mjs
		// ?? This is a workaround, to make the loader assume that the file is an ES Module
		// ?? Probably not the best way to do it, but it works for now
		let extension = `.${url.split('.').pop()}`;
		if (extension === '.js') extension = '.mjs';

		// Return the content data and the type of the file
		return { getContentData: asBinary => asBinary ? res.arrayBuffer() : res.text(), type: extension };
	},
	/**
	 * Adds a new style element to the document's head with the provided text content.
	 *
	 * @param {string} textContent - The CSS rules to be added as text content of the style element.
	 * @returns {void}
	 */
	addStyle(textContent) {
		const style = Object.assign(document.createElement('style'), { textContent });
		const ref = document.head.getElementsByTagName('style')[0] || null;
		document.head.insertBefore(style, ref);
	},
	log(type, ...args) {
        console[type](...args);
	},
}

/**
 * Retrieves and compiles a Vue template from the specified path.
 * If the template has already been loaded, it returns the cached version.
 *
 * @param {string} path - The path to the Vue template.
 * @param {string} [id] - Optional identifier for the template. If not provided, the path will be used as the identifier.
 * @returns {Promise<object>} - A promise that resolves to the compiled Vue template.
 */
export async function vueGetTemplate(path, id) {
	if (path in VuePartials) return VuePartials[path];
	const vueComponent = await SFC.loadModule(path, VueSFCOptions);
	console.log(`VueGetTemplate | Retrieved and compiled template ${path}`, vueComponent);
	VuePartials[id ?? path] = vueComponent;
	return vueComponent;
}

/**
 * Renders a Vue template using the specified path and data.
 *
 * @param {string} path - The path to the Vue template.
 * @param {Object} data - The data to be passed to the Vue template.
 * @returns {Promise} - A promise that resolves when the template is rendered.
 */
async function vueRenderTemplate(path, data) {
	return await vueGetTemplate(path);
}

/**
 * Loads Vue templates asynchronously.
 *
 * @param {Object|string[]} paths - The paths to the templates to be loaded. If an object is provided, each key-value pair represents a template name and its corresponding path. If an array is provided, each element represents a template path.
 * @returns {Promise[]} - An array of promises that resolve when all templates are loaded.
 */
async function vueLoadTemplates(paths) {
	let promises;
	if (foundry.utils.getType(paths) === "Object") promises = Object.entries(paths).map(([k, p]) => vueGetTemplate(p, k));
	else promises = paths.map(p => vueGetTemplate(p));
	return Promise.all(promises);
}