import fs from 'fs/promises';
import yaml from 'js-yaml';
import path from 'path';

export async function readConfig(location: string) {
	const source = await fs.readFile(location);
	return yaml.load(source.toString(), {
		filename: path.basename(location)
	});
}