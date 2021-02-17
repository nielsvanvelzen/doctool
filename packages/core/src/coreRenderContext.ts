import fsSync from 'fs';
import path from 'path';
import { RenderContext } from '@doctool/plugin-api';
import { Config, Document, DataObject } from './config/config';
import { Directory } from '@doctool/plugin-api/lib/common';
import { renderContent, renderMedia } from './index';
import url, { URL } from 'url';

function isValidUrl(url: string) {
	try {
		new URL(url);

		return true;
	} catch (err) {
		return false;
	}
}

function resolvePath(config: Config, basePath: string, type: Directory, name: string) {
	const location = path.resolve(basePath, config.directories[type], name);
	if (fsSync.existsSync(location))
		return location;

	if (config.directories.namespaces && config.directories.shared) {
		const sharedLocation = path.resolve(config.workingDirectory, config.directories.shared, config.directories[type], name);
		if (fsSync.existsSync(sharedLocation))
			return sharedLocation;
	}

	return null;
}

export class CoreRenderContext implements RenderContext {
	private config: Config;
	private document: Document;
	private data: DataObject;
	private origin: string | null;
	private basePath: string;
	private promises: Promise<unknown>[] = [];

	constructor(config: Config, origin: string | null, document: Document, data: DataObject) {
		this.config = config;
		this.document = document;
		this.data = data;
		this.origin = origin;

		let basePath = config.workingDirectory;
		if (config.directories.namespaces && document.namespace)
			basePath = path.resolve(basePath, document.namespace);
		this.basePath = basePath;
	}

	resolvePath(type: Directory, name: string): string {
		// Fragment should not be resolved
		if (name.startsWith('#')) return name;

		const location = resolvePath(this.config, this.basePath, type, name);
		if (location == null) throw new Error(`Could not solve path ${type}/${name}.`);

		return location;
	}

	resolveUrl(name: string, origin?: string | null): string {
		// Fragment should not be resolved
		if (name.startsWith('#')) return name;

		if (!origin) origin = this.origin;

		let candidate: URL | null = null;

		if (isValidUrl(name)) candidate = new URL(name);

		if (candidate == null && origin) {
			const relativePath = path.resolve(origin, name);
			if (fsSync.existsSync(relativePath)) candidate =  url.pathToFileURL(relativePath);
		}

		if (candidate == null) {
			const assetPath = resolvePath(this.config, this.basePath, 'asset', name);
			if (assetPath) candidate =  url.pathToFileURL(assetPath);
		}

		if (candidate != null) {
			if (candidate.protocol == 'file:') {
				try {
					const { fileName, promise } = renderMedia(this.config, this.document, origin, url.fileURLToPath(candidate));
					this.promises.push(promise);

					candidate = url.pathToFileURL(fileName);
				} catch (err) {
					// Ignore, mostly means no extension was found for the media
				}
			}

			return candidate.href;
		} else {
			console.error(`Could not resolve path ${name} from ${origin}.`);
			return name;
		}
	}

	async renderContent(name: string): Promise<Buffer> {
		return renderContent(this.config, this.document, name, this.data);
	}

	async awaitAll() {
		await Promise.all(this.promises);
	}
}
