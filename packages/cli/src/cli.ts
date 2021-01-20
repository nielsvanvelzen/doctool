import { cac } from 'cac';

export const cli = (): void => {
	const program = cac('doctool');

	const version = require('../package.json').version;
	program.version(`@doctool/cli@${version}`);

	program.help();

	program
		.command('watch [sourceDir]', 'Start file watcher')
		.option('-c, --config <config>', 'Set path to doctool.yaml file')
		.action(() => {});

	program
		.command('build [sourceDir]', 'Build documents')
		.option('-c, --config <config>', 'Set path to doctool.yaml file')
		.action(() => {});
  
	program.parse(process.argv);
}
  