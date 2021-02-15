import deepmerge from 'deepmerge';
import fs from 'fs/promises';
import path from 'path';
import { PrinterSource } from '@doctool/plugin-api';
import { Config, Document, DataObject } from './config/config';
import { defaultConfig } from './config/default';
import { findFile } from './utils/io';
import { readYaml } from './utils/yaml';
import { getContentProvider, getMediaProvider, getPrinterProvider, validatePlugins } from './plugins';
import { CoreRenderContext } from './coreRenderContext';
import { createHash } from 'crypto';

export async function readConfig(workingDirectory: string, location: string): Promise<Config> {
	const config = await readYaml<Config>(location);
	const mergedConfig = deepmerge<Config, object>(defaultConfig, config);

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

export async function renderContent(config: Config, document: Document, name: string, data: DataObject): Promise<Buffer> {
	const [contentPath, templatePath] = await Promise.all([
		findFile(config, document, config.directories.content, name),
		findFile(config, document, config.directories.template, name),
	]);
	const usedPath = contentPath ?? templatePath ?? null;
	if (!usedPath) throw new Error(`Could not find a content or template file for ${name}`);
	const extension = path.extname(usedPath);

	if (!extension) throw new Error(`Could not find an extension for content at ${usedPath}`);
	const provider = getContentProvider(extension);
	if (!provider) throw new Error(`No content provider found for ${extension}`);

	// TODO add file-hashing magic and caching
	const context = new CoreRenderContext(config, usedPath, document, data);
	const rendered = await provider.render(context, usedPath, await fs.readFile(usedPath), data);
	await context.awaitAll();

	return rendered;
}

export function renderMedia(config: Config, document: Document, origin: string | null, location: string): { fileName: string, promise: Promise<void> } {
	const extension = path.extname(location);
	if (!extension) throw new Error(`Could not find an extension for media at ${location}`);

	const provider = getMediaProvider(extension);
	if (!provider) throw new Error(`No media provider found for ${extension}`);

	let outputExtension = provider.defaultExtension;
	if (!outputExtension.startsWith('.')) outputExtension = `.${outputExtension}`;

	let outputName = createHash('md5').update(location).digest('hex').toString();
	const fileName = path.resolve(config.workingDirectory, config.directories.cache, outputName  + outputExtension);

	return {
		fileName,
		promise: (async () => {
			const context = new CoreRenderContext(config, origin, document, {});
			const rendered = await provider.render(context, origin, location, await fs.readFile(location));
			await fs.mkdir(path.dirname(fileName), { recursive: true });
			await fs.writeFile(fileName, rendered);
			await context.awaitAll();
		})()
	};
}

export async function buildDocument(config: Config, documentName: string, documentConfig: Document): Promise<void> {
	console.info(`Building ${documentName}`);

	const sources: PrinterSource[] = await Promise.all(documentConfig.document.map(async part => {
		return {
			name: part.template,
			content: await renderContent(config, documentConfig, part.template, part.with)
		};
	}));

	const provider = getPrinterProvider(documentConfig.printer);
	if (!provider) throw new Error(`No printer provider found for ${documentConfig.printer}`);

	// TODO Custom context? don't need render functions right?
	const context = new CoreRenderContext(config, null, documentConfig, documentConfig.with);
	const rendered = await provider.render(context, sources, documentConfig.with);
	await context.awaitAll();

	let documentPath = path.resolve(config.workingDirectory, config.directories.dist, documentConfig.file);

	if (!path.extname(documentPath).length) {
		let extension = provider.defaultExtension;
		if (!extension.startsWith('.')) extension = `.${extension}`;

		documentPath += extension;
	}

	await fs.mkdir(path.dirname(documentPath), { recursive: true });
	await fs.writeFile(documentPath, rendered);
}
