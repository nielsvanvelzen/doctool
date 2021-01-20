import { cac } from 'cac';
import { readConfig } from '@doctool/core';
import * as path from 'path';
interface Options {
	config: string
}

interface WatchOptions extends Options {}
interface BuildOptions extends Options {}

async function watch(directory: string, options: WatchOptions) {
	console.error('Watch command is not implemented. Running build instead.');
	await build(directory, options);
}

async function build(directory: string, options: BuildOptions) {
	console.log('directory', directory);
	console.log('options', options);

	const configLocation = path.resolve(directory, options.config);
	const config = await readConfig(configLocation);
	console.log(config);
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
  