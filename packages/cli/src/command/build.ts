import { readConfig, buildDocuments } from '@doctool/core';
import * as path from 'path';
import { Options } from '../options';

export interface BuildOptions extends Options { }

export async function build(workingDirectory: string, options: BuildOptions): Promise<void> {
	const configLocation = path.resolve(workingDirectory, options.config);
	const config = await readConfig(workingDirectory, configLocation);
	
	await buildDocuments(config);
}
