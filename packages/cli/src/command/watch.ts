import { readConfig, buildDocuments, getRelevantFiles, buildDocument } from '@doctool/core';
import path from 'path';
import { Options } from '../options';
import chokidar from 'chokidar';
import { Config } from '@doctool/core/lib/config/config';

export interface WatchOptions extends Options { }

let pendingDocuments: string[] = [];
let pendingConfigChange = false;
let pendingTimer: NodeJS.Timeout | null = null;
let watcher: chokidar.FSWatcher | null = null;
let initialBuild = false;

async function buildPendingDocuments(config: Config, configLocation: string) {
	if (!initialBuild) {
		console.log('Starting initial build.');
		initialBuild = true;
	}

	if (pendingConfigChange) {
		console.log('Detected configuration changes, reloading config.');
		await resetWatcher(config.workingDirectory, configLocation);

		pendingConfigChange = false;
		return;
	}

	const documents = pendingDocuments.slice();
	pendingDocuments = [];

	if (documents.includes('*')) {
		await buildDocuments(config);
	} else for (const document of documents) {
		await buildDocument(config, document, config.documents[document]);
	}

	console.log('Finished building');
}

function onFileChanged(config: Config, entries: { base: string, document: string }[], location: string, configLocation: string) {
	if (initialBuild && location.endsWith('.yaml')) pendingConfigChange = true;

	if (!pendingDocuments.includes('*')) {
		for (const { base, document } of entries) {
			if (location.startsWith(base)) {
				if (document == '*') {
					pendingDocuments = ['*'];
					break;
				} else if (!pendingDocuments.includes(document)) {
					pendingDocuments.push(document);
				}
			}
		}
	}

	if (pendingTimer != null) clearTimeout(pendingTimer);
	if (!pendingDocuments.length && !pendingConfigChange) return;

	pendingTimer = setTimeout(() => buildPendingDocuments(config, configLocation).catch(err => {
		console.error('Command failed unexpectedly.');
		console.error(err);
		process.exit(1);
	}), 300);
}

async function resetWatcher(workingDirectory: string, configLocation: string) {
	const config = await readConfig(workingDirectory, configLocation);
	const files = getRelevantFiles(config);
	
	let newWatcher = chokidar.watch(Object.keys(files));
	if (watcher != null) {
		console.log('Stopping old watcher.');
		await watcher.close();
	}
	watcher = newWatcher;
	initialBuild = false;
	
	const entries = Object.entries(files).map(([base, document]) => ({ base, document }));
	newWatcher.on('all', (_event, location) => onFileChanged(config, entries, location, configLocation));

	console.log(`Watching ${entries.length} paths.`);
}

export async function watch(workingDirectory: string, options: WatchOptions): Promise<void> {
	const configLocation = path.resolve(workingDirectory, options.config);

	await resetWatcher(workingDirectory, configLocation);
}
