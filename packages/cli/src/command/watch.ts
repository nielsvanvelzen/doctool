import { readConfig, buildDocuments, getRelevantFiles, buildDocument } from '@doctool/core';
import * as path from 'path';
import { Options } from '../options';
import chokidar from 'chokidar';

export interface WatchOptions extends Options { }

export async function watch(workingDirectory: string, options: WatchOptions): Promise<void> {
	const configLocation = path.resolve(workingDirectory, options.config);
	const config = await readConfig(workingDirectory, configLocation);
	const files = await getRelevantFiles(config);

	const entries = Object.entries(files);

	let pendingUpdates: string[] = [];
	let pendingTimer: NodeJS.Timeout | null = null;

	chokidar
		.watch(Object.keys(files))
		.on('all', (event, path) => {
			if (!pendingUpdates.includes('*')) {
				for (const [base, document] of entries) {
					if (path.startsWith(base)) {
						if (document == '*') {
							pendingUpdates = ['*'];
							break;
						} else if (!pendingUpdates.includes(document)) {
							pendingUpdates.push(document);
						}
					}
				}
			}

			if (pendingTimer != null) clearTimeout(pendingTimer);
			if (!pendingUpdates.length) return;

			pendingTimer = setTimeout(async () => {
				const documents = pendingUpdates.slice();
				pendingUpdates = [];

				if (documents.includes('*')) {
					await buildDocuments(config);
				} else for (const document of documents) {
					await buildDocument(config, document, config.documents[document]);
				}
			}, 300);
		});
	
	console.log(`Watching ${entries.length} paths.`);
}
