import deepmerge from 'deepmerge';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import path from 'path';
import { PluginValues, TemplateProvider, TemplateRenderContext, ContentProvider, ContentRenderContext } from '@doctool/plugin-api';
import { Config, Document, DocumentPartData } from './config/config';
import { defaultConfig } from './config/default';

export async function readConfig(workingDirectory: string, location: string): Promise<Config> {
	const source = await fs.readFile(location);
	const config = yaml.load(source.toString(), {
		filename: location
	}) as object;

	const mergedConfig = await deepmerge<Config, object>(defaultConfig, config, {
		arrayMerge: (_, sourceArray) => sourceArray
	});

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
	for (const [document, documentConfig] of Object.entries(config.documents)) {
		console.info(`Building ${document}`);

		await buildDocument(config, documentConfig);
	}
}

async function renderTemplate(config: Config, name: string, data: DocumentPartData): Promise<Buffer> {
	const templatePath = path.resolve(config.workingDirectory, config.directories.template, name);
	const extension = path.extname(templatePath);

	if (!extension) throw new Error(`Could not find an extension for template at ${templatePath}`);
	const provider = await getTemplateProvider(config, extension);
	if (!provider) throw new Error(`No provider found for ${extension}`);

	// TODO add file-hashing magic and caching
	const context: TemplateRenderContext = {
		renderContent: (name) => renderContent(config, name, data),
		renderTemplate: (name: string) => renderTemplate(config, name, data)
	};
	const rendered = await provider.render(context, templatePath, await fs.readFile(templatePath), data);
	return rendered;
}

async function renderContent(config: Config, name: string, data: DocumentPartData): Promise<Buffer> { 
	const contentPath = path.resolve(config.workingDirectory, config.directories.content, name);
	const extension = path.extname(contentPath);

	if (!extension) throw new Error(`Could not find an extension for content at ${contentPath}`);
	const provider = await getContentProvider(config, extension);
	if (!provider) throw new Error(`No provider found for ${extension}`);

	// TODO add file-hashing magic and caching
	const context: ContentRenderContext = {
		renderContent: (name) => renderContent(config, name, data),
		renderTemplate: (name: string) => renderTemplate(config, name, data)
	};
	const rendered = await provider.render(context, contentPath, await fs.readFile(contentPath), data);
	return rendered;
}

export async function buildDocument(config: Config, documentConfig: Document) {
	// TODO get renderer

	for (const part of documentConfig.document) {
		const rendered = await renderTemplate(config, part.template, part.data);
		console.log(rendered.toString());
	}
}

const loadedPlugins: string[] = [];
const providers: {
	template: { [key: string]: TemplateProvider },
	content: { [key: string]: ContentProvider },
	renderer: { [key: string]: TemplateProvider }
} = {
	template: {},
	content: {},
	renderer: {}
};

async function validatePlugins(config: Config): Promise<void> {
	for (const id of config.plugins) {
		if (!loadedPlugins.includes(id)) {
			await loadPlugin(config, id);
		}
	}
}

export async function getTemplateProvider<T extends TemplateProvider>(config: Config, provider: string): Promise<T | null> {
	await validatePlugins(config);

	return providers.template[provider] as T || null;
}

export async function getContentProvider<T extends ContentProvider>(config: Config, provider: string): Promise<T | null> {
	await validatePlugins(config);

	return providers.content[provider] as T || null;
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

	loadedPlugins.push(id);
}
