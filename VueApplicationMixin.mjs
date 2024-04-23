import { createApp, reactive } from 'vue';

export const VueApplicationMixinVersion = '0.0.2';

/**
 * A mixin class that extends a base application with Vue.js functionality.
 * @template {typeof BaseApplication} BaseApplication - The base application class to extend.
 */
export function VueApplicationMixin(BaseApplication) {
	class VueApplication extends BaseApplication {
		/**
		 * Indicates whether the application is in debug mode.
		 * @type {boolean}
		 */
		static DEBUG = false;

		/**
		 * The parts of the Vue application.
		 * @type {Object<string, *>}
		 */
		static PARTS = {};

		/**
		 * Get the parts of the Vue application.
		 * @returns {Object<string, *>} - The parts of the Vue application.
		 */
		get parts() {
			return this.#parts;
		}

		/**
		 * The private parts of the Vue application.
		 * @type {Object<string, *>}
		 */
		#parts = {};

		/**
		 * The private containers for Vue instances.
		 * @type {Object<string, Vue>}
		 */
		#instances = {};

		/**
		 * The private containers for Vue instances.
		 * @type {Object<string, Object>}
		 */
		#props = {};

		/**
		 * Configure the render options for the Vue application.
		 * @param {Object} options - The render options.
		 */
		_configureRenderOptions(options) {
			super._configureRenderOptions(options);
			options.parts ??= Object.keys(this.constructor.PARTS);
		}

		/**
		 * Perform pre-render operations before the first render of the Vue application.
		 * @param {Object} context - The render context.
		 * @param {Object} options - The render options.
		 * @returns {Promise<void>}
		 */
		async _preFirstRender(context, options) {
			await super._preFirstRender(context, options);
			const allTemplates = new Set();
			for (const part of Object.values(this.constructor.PARTS)) {
				const partTemplates = [
					...(part.templates ?? [part.template]),
					...(part.components ?? [part.component]),
					...[part?.app]
				].filter(p => p !== undefined);
				for (const template of partTemplates) allTemplates.add(template);
			}

			if (this.constructor.DEBUG) console.log(`VueApplicationMixin | _preFirstRender | Retrieved Vue Parts |`, allTemplates);
		}

		/**
		 * Render the HTML content of the Vue application.
		 * @param {Object} context - The render context.
		 * @param {Object} options - The render options.
		 * @returns {Promise<Object<string, string>>} - The rendered HTML content.
		 */
		async _renderHTML(context, options) {
			const rendered = {};
			if (this.constructor.DEBUG) console.log(`VueApplicationMixin | _renderHTML |`, context, options);
			for (const [key, part] of Object.entries(this.constructor.PARTS)) {
				if (!part) {
					ui.notifications.warn(`Part "${key}" is not a supported template part for ${this.constructor.name}`);
					continue;
				}

				// If part is not in options.parts, skip it
				if (!options.parts.includes(key)) continue;
				
				// If instance already exists and force is true, unmount it
				if (this.#instances[part.id] && options?.force === true) this.#instances[part.id].unmount();

				// Get the Vue Instance for the Part if it doesn't exist or force is true
				if (!this.#instances[part.id] || options?.force === true) {
					console.log(`VueApplicationMixin | _renderHTML | Setting Up Vue Instance ${part.id} |`);
					// Get the Vue Instance for the Part
					this.#instances[part.id] = await (part?.app ?? part?.component ?? part?.template);
					// Get the props for the Part using the options or the part props
					this.#props[part.id] = reactive(options?.props ?? part?.props ?? {});

					// If not a Vue Instance, create one
					if (typeof this.#instances[part.id]?.mount !== 'function') this.#instances[part.id] = createApp(this.#instances[part.id], this.#props[part.id]);
				}
				if (this.constructor.DEBUG) console.log(`VueApplicationMixin | _renderHTML | Vue Instance ${part.id} |`, this.#instances[part.id], this.#props[part.id])

				// Add Vue Instance to Rendered Object
				rendered[key] = this.#instances[part.id]
			}
			if (this.constructor.DEBUG) console.log(`VueApplicationMixin | _renderHTML | Vue Instances |`, rendered);
			return rendered;
		}

		/**
		 * Replace the HTML content of the Vue application.
		 * @param {Object<string, string>} result - The rendered HTML content.
		 * @param {HTMLElement} content - The content element.
		 * @param {Object} options - The render options.
		 */
		_replaceHTML(result, content, options) {
			if (this.constructor.DEBUG) console.log(`VueApplicationMixin | _replaceHTML |`, result, content, options);
			for (const [key, part] of Object.entries(this.constructor.PARTS)) {
				const target = content.querySelector(`[data-application-part="${key}"]`);

				// If part is not in options.parts, skip it
				if (!options.parts.includes(key)) continue;

				// Since Vue Components shouldnt be replaced, warn the user
				if (target && (options?.force ?? false) === false) {
					//foundry.utils.mergeObject(this.#props[part.id], options?.props ?? {}, { inplace: true, insertKeys: true});
					this.#props[part.id].title = options?.props?.title ?? this.#props[part.id].title;
					if (this.constructor.DEBUG) console.log(`VueApplicationMixin | _replaceHTML | Update Vue Part |`, target, part.id, this.#instances[part.id], this.#props[part.id]);
					// Force Component to Update
					//this.#instances[part.id].forceUpdate();
					//this.#props[part.id] = options?.props ?? this.#props[part.id];
					//ui.notifications.warn(`Part "${key}" is already rendered for ${this.constructor.name} using Vue. It is not recommended to replace the Vue Component.`);
					continue;
				}
				// TODO: Add a way to update the Vue Instance with new Data
				// ?? Maybe using a method like this.#instances[part.id].update(data)
				// ?? where data is options.data or something similar??

				// Attach Container for Part if it doesn't exist
				if (!target) content.insertAdjacentHTML('beforeend', `<div data-application-part="${key}">$</div>`);

				// Attach Part Listeners
				this._attachPartListeners(content, part.id, this.#instances[part.id], options);

				// Mount the Vue Instance
				this.#instances[part.id].mount(content.querySelector(`[data-application-part="${key}"]`));

				if (this.constructor.DEBUG) console.log(`VueApplicationMixin | _replaceHTML | Mount Vue Part |`, part.id, this.#instances[part.id], this.#props[part.id]);
			}
		}


		/**
		 * Attaches form submission and change event listeners to the specified Vue element for a given part.
		 *
		 * @param {HTMLElement} content - The content of the part.
		 * @param {string} partId - The ID of the part.
		 * @param {Vue} vueElement - The Vue element to attach the listeners to.
		 * @param {Object} options - Additional options for attaching the listeners.
		 */
		_attachPartListeners(content, partId, vueElement, options) {
			const part = this.constructor.PARTS[partId];

			// Attach form submission handlers
			if (part.forms) {
				for (const [selector, formConfig] of Object.entries(part.forms)) {
					vueElement.provide('onSubmit', this.#onSubmitForm.bind(this, content, `[data-application-part="${partId}"] ${selector}`, formConfig, new Event('change')));
					vueElement.provide('onChange', this.#onChangeForm.bind(this, content, `[data-application-part="${partId}"] ${selector}`, formConfig, new Event('change')));
				}
			// Not really needed, but figured it would be nice to provide instead of having an error in the console if someone injecting one of the options into a component
			}else{
				vueElement.provide('onSubmit', () => console.warn("VueApplicationMixin | onSubmit | No forms found for part", partId));
				vueElement.provide('onChange', () => console.warn("VueApplicationMixin | onChange | No forms found for part", partId));
			}
		}

		/**
		 * Closes the application and unmounts all instances.
		 * 
		 * @param {ApplicationClosingOptions} [options] - Optional parameters for closing the application.
		 * @returns {Promise<BaseApplication>} - A Promise which resolves to the rendered Application instance.
		 */
		async close(options = {}) {
			// Loop through Instances and unmount them
			for (const [key, instance] of Object.entries(this.#instances)) {
				await instance.unmount();
				delete this.#instances[key];
			}

			// Call the close method of the base application
			await super.close(options);
		}


		/**
		 * Handles form submission.
		 *
		 * @private
		 * @param {HTMLFormElement} form - The form element.
		 * @param {ApplicationFormSubmission} config - The configuration object.
		 * @param {Function} config.handler - The handler function to be called on form submission.
		 * @param {boolean} config.closeOnSubmit - Whether to close the form on submission.
		 * @param {Event|SubmitEvent} event - The form submission event.
		 * @returns {Promise<void>} - A promise that resolves when the form submission is complete.
		 */
		async #onSubmitForm(content, selector, config, event) {
			event.preventDefault();

			const form = content.querySelector(selector);
			const { handler, closeOnSubmit } = config;
			const formData = new FormDataExtended(form);
			if (handler instanceof Function) await handler.call(this, event, form, formData);
			if (closeOnSubmit) await this.close();
		}


		/**
		 * Handles the change event of a form.
		 *
		 * @private
		 * @param {HTMLFormElement} form - The form element.
		 * @param {ApplicationFormSubmission} config - The configuration object.
		 * @param {boolean} config.submitOnChange - Whether to submit the form on change.
		 * @param {Event|ChangeEvent} event - The change event object.
		 * @returns {void}
		 */
		#onChangeForm(content, selector, config, event) {
			const form = content.querySelector(selector);
			if (config?.submitOnChange) this.#onSubmitForm(content, selector, config, event);
		}
	}

	return VueApplication;
}