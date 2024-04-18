# Foundry VTT Vue.js Template
These are files for creating Foundry VTT modules using Vue.js. It includes a basic setup for a Vue.js project that can be used to create Foundry VTT modules.

## Files
- `VueApplicationMixin.mjs`: A Mixin that can be used as a Replacement for Foundry's `HandlebarsApplicationMixin` to create a Vue.js application.
- `VueGetTemplate.mjs`: A collection of functions that will let you load `.vue` files as Single File Components using [Vue3 SFC Loader](https://github.com/FranckFreiburger/vue3-sfc-loader)
- `VueHelpers.mjs`: A collection of helper functions that can be used to interact with Vue.js components from within Foundry VTT.

### VueApplicationMixin
Some things to not about the difference between `VueApplicationMixin` and `HandlebarsApplicationMixin`:
- **PARTS**: You can use `app`, `component`, and `template` to define the Vue component that will be rendered. instead of just the `template` property. 
  - *Explain why I did this later*
- **_preFirstRender**: No longer attempts to grab a file and instead is expecting your parts to include a Vue Instance or Component.
- **_renderHTML**: This function basically does what it did before, but now it will create Vue Instances and save this to `this.#instances[part.id]`.
- **_replaceHTML**: This function no longers uses handlebars to render the HTML and instead will mount the instances created in `_renderHTML` to the DOM.
  - This function needs to be updated so when you call `app.render({parts: ["app"], data: {}})` it will update the Vue Instance with the new data. This is not currently implemented and I am happy to take any feedback on how this should work.
- **_attachPartListeners**: This function has been updated to use [Provide / Inject](https://vuejs.org/guide/components/provide-inject.html) to give components the ability to call `onSubmit` and `onChange`.
  - These functions will only work if `part.forms` is defined in the part object. If they are missing the functions will still be provided, but will simply output a warning to the console.
- **close**: This function has been updated to `unmount` the vue instances before the application is closed.

## Example Projects
- [Foundry VTT Vue.js | ESM](https://github.com/mouse0270/fvtt-vue-esm)
- [Foundry VTT Vue.js | Vite](https://github.com/mouse0270/fvtt-vue-vite)

## Example Usage
```javascript
// File that contains constants for your module
import Module from "./module.mjs";
// Import the VueApplicationMixin
import { VueApplicationMixin } from './VueApplicationMixin.mjs';
// Get Your Vue Component
import App from "./templates/App.vue";

// Get Foundry's `ApplicationV2` Class
const { ApplicationV2 } = foundry.applications.api;

// Create a New Class that extends `VueApplicationMixin(ApplicationV2)`
class VueApplication extends VueApplicationMixin(ApplicationV2) {
	static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
		id: `app-${Math.random().toString(36).substr(2, 9)}`,
		window: {
			title: `${Module.id}.title`,
			icon: "fa-solid fa-triangle-exclamation"
		},
		position: {
			width: 680,
			height: "auto"
		},
		actions: { }
	}, { inplace: false });

	static PARTS = {
		app: {
			id: "app",
			component: App
		}
	}
}

// Display the Application when Foundry is Ready
Hooks.once('ready', async () => {
	new VueApplication().render(true);
});
```