import { cac } from 'cac';
import { readConfig, buildDocuments, getRelevantFiles } from '@doctool/core';
import * as path from 'path';

interface Options {
	config: string
}

interface WatchOptions extends Options { }
interface BuildOptions extends Options { }

async function watch(workingDirectory: string, options: WatchOptions): Promise<void> {
	try {
		const configLocation = path.resolve(workingDirectory, options.config);
		const config = await readConfig(workingDirectory, configLocation);
		const files = await getRelevantFiles(config);

		console.log(files);
		await buildDocuments(config);
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
}

async function build(workingDirectory: string, options: BuildOptions): Promise<void> {
	try {
		const configLocation = path.resolve(workingDirectory, options.config);
		const config = await readConfig(workingDirectory, configLocation);
		// const files = await getRelevantFiles(config);

		// console.log(config);
		// console.log(files);
		await buildDocuments(config);
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
}

export const cli = (): void => {
	const program = cac('doctool');

	const version = require('../package.json').version;
	program.version(`@doctool/cli@${version}`);

	program.help();

	program
		.command('watch [directory]', 'Start file watcher')
		.option('-c, --config <config>', 'Set path to configuration file', { default: 'doctool.yaml' })
		.action((directory, options) => watch(directory || process.cwd(), options));

	program
		.command('build [directory]', 'Build documents', {})
		.option('-c, --config <config>', 'Set path to configuration file', { default: 'doctool.yaml' })
		.action((directory, options) => build(directory || process.cwd(), options));

	program.parse(process.argv);
}
