import { Config, Document } from '../config/config';
import fs from 'fs';
import path from 'path';

export async function findFile(config: Config, document: Document, directory: string, name: string): Promise<string | null> {
	if (!name) return null;

	let basePath = config.workingDirectory;
	if (config.directories.namespaces && document.namespace) basePath = path.resolve(basePath, document.namespace);
	basePath = path.resolve(basePath, directory, path.dirname(name));

	if (fs.existsSync(basePath)) {
		const files = await fs.promises.readdir(basePath);
		const fileName = path.basename(name);

		if (files.includes(fileName)) return path.resolve(basePath, fileName);
		for (const file of files) {
			if (path.basename(file, path.extname(file)) == fileName) return path.resolve(basePath, file);
		}
	}

	if (config.directories.namespaces && config.directories.shared) {
		basePath = path.resolve(config.workingDirectory, config.directories.shared, directory, path.dirname(name));

		if (fs.existsSync(basePath)) {
			const files = await fs.promises.readdir(basePath);
			const fileName = path.basename(name);

			if (files.includes(fileName)) return path.resolve(basePath, fileName);
			for (const file of files) {
				if (path.basename(file, path.extname(file)) == fileName) return path.resolve(basePath, file);
			}
		}
	}

	return null;
}
