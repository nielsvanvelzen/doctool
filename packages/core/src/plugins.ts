import { TemplateProvider, ContentProvider, PrinterProvider, PluginValues } from '@doctool/plugin-api';
import path from 'path';
import { Config } from './config/config';

const loadedPlugins: string[] = [];
const providers: {
	template: { [key: string]: TemplateProvider },
	content: { [key: string]: ContentProvider },
	printer: { [key: string]: PrinterProvider }
} = {
	template: {},
	content: {},
	printer: {}
};

export async function validatePlugins(config: Config): Promise<void> {
	for (const id of config.plugins) {
		if (!loadedPlugins.includes(id)) {
			await loadPlugin(config, id);
		}
	}
}

export async function getTemplateProvider<T extends TemplateProvider>(config: Config, provider: string): Promise<T | null> {
	return providers.template[provider] as T || null;
}

export async function getContentProvider<T extends ContentProvider>(config: Config, provider: string): Promise<T | null> {
	return providers.content[provider] as T || null;
}

export async function getPrinterProvider<T extends PrinterProvider>(config: Config, provider: string): Promise<T | null> {
	return providers.printer[provider] as T || null;
}

export async function loadPlugin(config: Config, id: string) {
	console.info(`Loading plugin ${id}`);

	let location: string | null = null;
	try {
		location = require.resolve(id, {
			paths: [
				path.resolve(config.workingDirectory),
				path.dirname(config.location),
				process.cwd(),
			]
		});
	} catch (err) { }

	if (!location) throw new Error(`Unable to load plugin ${id}.`);

	const plugin = await import(location).then(module => module?.default);
	let values: PluginValues = {};
	if (typeof plugin === 'function') values = await plugin();

	Object.entries(values.templateProviders || {}).forEach(([extension, provider]) => {
		providers.template[extension] = provider;
	});

	Object.entries(values.contentProviders || {}).forEach(([extension, provider]) => {
		providers.content[extension] = provider;
	});

	Object.entries(values.printerProviders || {}).forEach(([name, provider]) => {
		providers.printer[name] = provider;
	});

	loadedPlugins.push(id);
}
