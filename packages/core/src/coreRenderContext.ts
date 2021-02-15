import fsSync from 'fs';
import path from 'path';
import { RenderContext } from '@doctool/plugin-api';
import { Config, Document, DataObject } from './config/config';
import { Directory } from '@doctool/plugin-api/lib/common';
import { renderContent } from './index';
import url from 'url';

export class CoreRenderContext implements RenderContext {
	private config: Config;
	private document: Document;
	private data: DataObject;
	private origin: string | null;
	private basePath: string;

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
		if (name.startsWith('#'))
			return name;
		const location = path.resolve(this.basePath, this.config.directories[type], name);
		if (fsSync.existsSync(location))
			return location;

		if (this.config.directories.namespaces && this.config.directories.shared) {
			const sharedLocation = path.resolve(this.config.workingDirectory, this.config.directories.shared, this.config.directories[type], name);
			if (fsSync.existsSync(sharedLocation))
				return sharedLocation;
		}

		throw new Error(`Could not solve path ${type}/${name}.`);
	}

	resolveUrl(name: string): string {
		// Hash
		if (name.startsWith('#'))
			return name;

		try {
			// Validate current format
			return new URL(name).href;
		} catch (err) {
			// Invalid URL, probably relative so ignore!
		}

		if (this.origin) {
			const relativePath = path.resolve(this.origin, name);
			if (fsSync.existsSync(relativePath)) return url.pathToFileURL(relativePath).href;
		}

		try {
			const assetPath = this.resolvePath('asset', name);
			return url.pathToFileURL(assetPath).href;
		} catch (err) {
			console.error(`Could not resolve path ${name} from ${origin}.`);
			return name;
		}
	}

	async renderContent(name: string): Promise<Buffer> {
		return renderContent(this.config, this.document, name, this.data);
	}
}
