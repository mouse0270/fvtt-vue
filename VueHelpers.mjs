const localize = (stringId, data=null) => {
	return typeof data !== 'object' ? game.i18n.localize(stringId, data) : game.i18n.format(stringId, data);
};

const formField = (field, options) => {
	return HandlebarsHelpers.formField(field, options);
}

export { localize, formField };