import { readConfig, buildDocuments } from '@doctool/core';
import * as path from 'path';
import { Options } from '../options';

export interface BuildOptions extends Options { }

export async function build(workingDirectory: string, options: BuildOptions): Promise<void> {
	try {
		const configLocation = path.resolve(workingDirectory, options.config);
		const config = await readConfig(workingDirectory, configLocation);
		
		await buildDocuments(config);
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
}
