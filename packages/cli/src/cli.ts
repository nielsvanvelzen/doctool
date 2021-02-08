import { cac } from 'cac';
import { watch } from './command/watch';
import { build } from './command/build';

function runCommand<T>(promise: Promise<T>): void {
	promise.catch(err => {
		console.error('Command failed unexpectedly.');
		console.error(err);
		process.exit(1);
	});
}

export const cli = (): void => {
	const program = cac('doctool');

	const version = require('../package.json').version;
	program.version(`@doctool/cli@${version}`);

	program.help();

	program
		.command('watch [directory]', 'Start file watcher')
		.option('-c, --config <config>', 'Set path to configuration file', { default: 'doctool.yaml' })
		.action((directory, options) => runCommand(watch(directory || process.cwd(), options)));

	program
		.command('build [directory]', 'Build documents', {})
		.option('-c, --config <config>', 'Set path to configuration file', { default: 'doctool.yaml' })
		.action((directory, options) => runCommand(build(directory || process.cwd(), options)));

	program.parse(process.argv);
}
