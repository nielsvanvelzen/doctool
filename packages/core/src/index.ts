import deepmerge from 'deepmerge';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { TemplateRenderContext, ContentRenderContext, PrinterSource } from '@doctool/plugin-api';
import { Config, Document, DataObject } from './config/config';
import { defaultConfig } from './config/default';
import { Directory } from '@doctool/plugin-api/lib/common';
import { findFile } from './utils/io';
import { readYaml } from './utils/yaml';
import { getContentProvider, getPrinterProvider, getTemplateProvider, validatePlugins } from './plugins';

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
export function getRelevantFiles(config: Config): { [key: string]: string } {
	const paths = {
		[path.resolve(config.workingDirectory, config.location)]: '*'
	};

	if (config.directories.namespaces) {
		const namespaces = Object.entries(config.documents)
			.map(([document, { namespace }]) => ({ document, namespace }));

		for (const { document, namespace } of namespaces) {
			if (!namespace) continue;

			paths[path.resolve(config.workingDirectory, namespace, '.')] = document;
		}

		if (config.directories.shared) {
			paths[path.resolve(config.workingDirectory, config.directories.shared, '.')] = '*';
		}
	} else {
		paths[path.resolve(config.workingDirectory, config.directories.content)] = '*';
		paths[path.resolve(config.workingDirectory, config.directories.template)] = '*';
		paths[path.resolve(config.workingDirectory, config.directories.asset)] = '*';
	}

	return paths;
}

export async function buildDocuments(config: Config): Promise<void> {
	await validatePlugins(config);

	for await (const [document, documentConfig] of Object.entries(config.documents)) {
		buildDocument(config, document, documentConfig);
	}
}

export function createContext(config: Config, document: Document, data: DataObject): TemplateRenderContext {
	let basePath = config.workingDirectory;
	if (config.directories.namespaces && document.namespace) basePath = path.resolve(basePath, document.namespace);

	return {
		resolvePath: (type: Directory, name: string) => {
			if (name.startsWith('#')) return name;
			const location = path.resolve(basePath, config.directories[type], name);
			if (fsSync.existsSync(location)) return location;

			if (config.directories.namespaces && config.directories.shared) {
				const sharedLocation = path.resolve(config.workingDirectory, config.directories.shared, config.directories[type], name);
				if (fsSync.existsSync(sharedLocation)) return sharedLocation;
			}

			throw new Error(`Could not solve path ${type}/${name}.`);
		},
		renderContent: (name: string) => renderContent(config, document, name, data),
		renderTemplate: (name: string) => renderTemplate(config, document, name, data)
	};
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

export async function buildDocument(config: Config, documentName: string, documentConfig: Document): Promise<void> {
	console.info(`Building ${documentName}`);

	const sources: PrinterSource[] = await Promise.all(documentConfig.document.map(async part => {
		return {
			name: part.template,
			content: await renderTemplate(config, documentConfig, part.template, part.with)
		};
	}));

	const provider = await getPrinterProvider(config, documentConfig.printer);
	if (!provider) throw new Error(`No printer provider found for ${documentConfig.printer}`);

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
