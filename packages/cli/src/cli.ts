import { cac } from 'cac';
import * as path from 'path';
import { watch } from './command/watch';
import { build } from './command/build';

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
