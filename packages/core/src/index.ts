import deepmerge from 'deepmerge';
import fs from 'fs/promises';
import fsSync from 'fs';
import yaml, { DEFAULT_SCHEMA } from 'js-yaml';
import path from 'path';
import { PluginValues, TemplateProvider, TemplateRenderContext, ContentProvider, ContentRenderContext, PrinterSource, PrinterProvider } from '@doctool/plugin-api';
import { Config, Document, DataObject } from './config/config';
import { defaultConfig } from './config/default';
import { Directory } from '@doctool/plugin-api/lib/common';


function createImportType(directory: string, getSchema: () => yaml.Schema) {
	return new yaml.Type('!import', {
		kind: 'scalar',
		resolve: (path) => {
			return typeof path == 'string';
		},
		construct: (file) => {
			const location = path.resolve(directory, file);
			const source = fsSync.readFileSync(location);

			return yaml.load(source.toString(), {
				filename: location,
				schema: getSchema()
			});
		}
	});
}

export async function readYaml<T>(filename: string): Promise<T> {
	const schema = DEFAULT_SCHEMA.extend([
		createImportType(path.dirname(filename), () => schema)
	]);

	const source = await fs.readFile(filename);
	return yaml.load(source.toString(), {
		filename,
		schema
	}) as unknown as T;
}

export async function readConfig(workingDirectory: string, location: string): Promise<Config> {
	const config = await readYaml<Config>(location);
	const mergedConfig = await deepmerge<Config, object>(defaultConfig, config);

	mergedConfig.workingDirectory = workingDirectory;
	mergedConfig.location = location;

	Object.entries(mergedConfig.documents).forEach(([name, document]) => {
		if (!document.namespace) document.namespace = name;
		if (!document.with) document.with = {};
	});

	return mergedConfig;
}

/**
 * Returns an array of paths for all relevant files and directories
 * to watch for changes.
 */
export async function getRelevantFiles(config: Config) {
	//TODO add namespace paths

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

export function createContext(config: Config, document: Document, data: DataObject): TemplateRenderContext {
	let basePath = config.workingDirectory;
	if (config.directories.namespaces && document.namespace) basePath = path.resolve(basePath, document.namespace);

	return {
		resolvePath: (type: Directory, name: string) => {
			if (name.startsWith('#')) return name;
			
			return path.resolve(basePath, config.directories[type], name)
		},
		renderContent: (name: string) => renderContent(config, document, name, data),
		renderTemplate: (name: string) => renderTemplate(config, document, name, data)
	};
}

async function findFile(config: Config, document: Document, directory: string, name: string): Promise<string | null> {
	if (!name) return null;

	let basePath = config.workingDirectory;
	if (config.directories.namespaces && document.namespace) basePath = path.resolve(basePath, document.namespace);
	basePath = path.resolve(basePath, directory);

	const files = await fs.readdir(basePath);

	for (const file of files) {
		if (file.startsWith(name)) return path.resolve(basePath, file);
	}

	return null;
}

async function renderTemplate(config: Config, document: Document, name: string, data: DataObject): Promise<Buffer> {
	const templatePath = await findFile(config, document, config.directories.template, name);
	if (!templatePath) throw new Error(`Could not find a file for template ${name}`);
	const extension = path.extname(templatePath);
	if (!extension) throw new Error(`Could not find an extension for template at ${templatePath}`);
	const provider = await getTemplateProvider(config, extension);
	if (!provider) throw new Error(`No template provider found for ${extension}`);

	// TODO add file-hashing magic and caching
	const context: TemplateRenderContext = createContext(config, document, data);
	const rendered = await provider.render(context, templatePath, await fs.readFile(templatePath), data);
	return rendered;
}

async function renderContent(config: Config, document: Document, name: string, data: DataObject): Promise<Buffer> { 
	const contentPath = await findFile(config, document, config.directories.content, name);
	if (!contentPath) throw new Error(`Could not find a file for content ${name}`);
	const extension = path.extname(contentPath);

	if (!extension) throw new Error(`Could not find an extension for content at ${contentPath}`);
	const provider = await getContentProvider(config, extension);
	if (!provider) throw new Error(`No content provider found for ${extension}`);

	// TODO add file-hashing magic and caching
	const context: ContentRenderContext = createContext(config, document, data);
	const rendered = await provider.render(context, contentPath, await fs.readFile(contentPath), data);
	return rendered;
}

export async function buildDocument(config: Config, documentConfig: Document) {
	const sources: PrinterSource[] = await Promise.all(documentConfig.document.map(async part => {
		return {
			name: part.template,
			content: await renderTemplate(config, documentConfig, part.template, part.with)
		};
	}));

	const provider = await getPrinterProvider(config, documentConfig.printer);
	if (!provider) throw new Error(`No printer provider found for ${name}`);

	// TODO Custom context? don't need render functions right?
	const context: ContentRenderContext = createContext(config, documentConfig, documentConfig.with);
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
