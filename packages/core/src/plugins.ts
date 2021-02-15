import { ContentProvider, MediaProvider, PrinterProvider, PluginValues } from '@doctool/plugin-api';
import path from 'path';
import { Config } from './config/config';

const loadedPlugins: string[] = [];
const providers: {
	content: { [key: string]: ContentProvider },
	media: { [key: string]: MediaProvider },
	printer: { [key: string]: PrinterProvider }
} = {
	content: {},
	media: {},
	printer: {}
};

export async function validatePlugins(config: Config): Promise<void> {
	for (const id of config.plugins) {
		if (!loadedPlugins.includes(id)) {
			await loadPlugin(config, id);
		}
	}
}

export function getContentProvider<T extends ContentProvider>(provider: string): T | null {
	return providers.content[provider] as T || null;
}

export function getMediaProvider<T extends MediaProvider>(provider: string): T | null {
	return providers.media[provider] as T || null;
}

export function getPrinterProvider<T extends PrinterProvider>(provider: string): T | null {
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

	Object.entries(values.contentProviders || {}).forEach(([extension, provider]) => {
		providers.content[extension] = provider;
	});

	Object.entries(values.mediaProviders || {}).forEach(([extension, provider]) => {
		providers.media[extension] = provider;
	});

	Object.entries(values.printerProviders || {}).forEach(([name, provider]) => {
		providers.printer[name] = provider;
	});

	loadedPlugins.push(id);
}
