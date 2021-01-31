import deepmerge from 'deepmerge';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import path from 'path';
import { PluginValues, TemplateProvider, TemplateRenderContext, ContentProvider, ContentRenderContext, PrinterSource, PrinterProvider } from '@doctool/plugin-api';
import { Config, Document, DataObject } from './config/config';
import { defaultConfig } from './config/default';
import { Directory } from '@doctool/plugin-api/lib/common';

export async function readConfig(workingDirectory: string, location: string): Promise<Config> {
	const source = await fs.readFile(location);
	const config = yaml.load(source.toString(), {
		filename: location
	}) as object;

	const mergedConfig = await deepmerge<Config, object>(defaultConfig, config);

	mergedConfig.workingDirectory = workingDirectory;
	mergedConfig.location = location;

	return mergedConfig;
}

/**
 * Returns an array of paths for all relevant files and directories
 * to watch for changes.
 */
export async function getRelevantFiles(config: Config) {
	return [
		// Config
		path.resolve(config.workingDirectory, config.location),
		// Document data
		path.resolve(config.workingDirectory, config.directories.content),
		path.resolve(config.workingDirectory, config.directories.template),
	];
}

export async function buildDocuments(config: Config) {
	await validatePlugins(config);

	for (const [document, documentConfig] of Object.entries(config.documents)) {
		console.info(`Building ${document}`);

		await buildDocument(config, documentConfig);
	}
}

export function createContext(config: Config, data: DataObject): TemplateRenderContext {
	return {
		resolvePath: (type: Directory, name: string) => path.resolve(config.workingDirectory, config.directories[type], name),
		renderContent: (name: string) => renderContent(config, name, data),
		renderTemplate: (name: string) => renderTemplate(config, name, data)
	};
}

async function findFile(directory: string, name: string): Promise<string | null> {
	if (!name) return null;

	const files = await fs.readdir(directory);

	for (const file of files) {
		if (file.startsWith(name)) return path.resolve(directory, file);
	}

	return null;
}

async function renderTemplate(config: Config, name: string, data: DataObject): Promise<Buffer> {
	const templatePath = await findFile(path.resolve(config.workingDirectory, config.directories.template), name);
	if (!templatePath) throw new Error(`Could not find a file for template ${name}`);
	const extension = path.extname(templatePath);
	if (!extension) throw new Error(`Could not find an extension for template at ${templatePath}`);
	const provider = await getTemplateProvider(config, extension);
	if (!provider) throw new Error(`No template provider found for ${extension}`);

	// TODO add file-hashing magic and caching
	const context: TemplateRenderContext = createContext(config, data);
	const rendered = await provider.render(context, templatePath, await fs.readFile(templatePath), data);
	return rendered;
}

async function renderContent(config: Config, name: string, data: DataObject): Promise<Buffer> { 
	const contentPath = await findFile(path.resolve(config.workingDirectory, config.directories.content), name);
	if (!contentPath) throw new Error(`Could not find a file for content ${name}`);
	const extension = path.extname(contentPath);

	if (!extension) throw new Error(`Could not find an extension for content at ${contentPath}`);
	const provider = await getContentProvider(config, extension);
	if (!provider) throw new Error(`No content provider found for ${extension}`);

	// TODO add file-hashing magic and caching
	const context: ContentRenderContext = createContext(config, data);
	const rendered = await provider.render(context, contentPath, await fs.readFile(contentPath), data);
	return rendered;
}

export async function buildDocument(config: Config, documentConfig: Document) {
	const sources: PrinterSource[] = await Promise.all(documentConfig.document.map(async part => {
		return {
			name: part.template,
			content: await renderTemplate(config, part.template, part.with)
		};
	}));

	const provider = await getPrinterProvider(config, documentConfig.printer);
	if (!provider) throw new Error(`No printer provider found for ${name}`);

	// TODO Custom context? don't need render functions right?
	const context: ContentRenderContext = createContext(config, documentConfig.with);
	const rendered = await provider.render(context, sources, documentConfig.with);
	let documentPath = path.resolve(config.workingDirectory, config.directories.dist, documentConfig.file);

	if (!path.extname(documentPath).length) {
		let extension = provider.defaultExtension;
		if (!extension.startsWith('.')) extension = `.${extension}`;

		documentPath += extension;
	}
	
	await fs.mkdir(path.dirname(documentPath), { recursive: true });
	await fs.writeFile(documentPath, rendered);
}

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

async function validatePlugins(config: Config): Promise<void> {
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
