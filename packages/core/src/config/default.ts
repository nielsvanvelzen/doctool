import { Config } from './config';

export const defaultConfig: Config = {
	workingDirectory: null!,
	location: 'doctool.yaml',
	directories: {
		content: './content/',
		template: './template/',
		cache: './.cache/',
		dist: './dist/'
	},
	plugins: [],
	documents: {}
};
