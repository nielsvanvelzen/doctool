import yaml, { DEFAULT_SCHEMA } from 'js-yaml';
import fs from 'fs';
import path from 'path';

function createImportType(directory: string, getSchema: () => yaml.Schema) {
	return new yaml.Type('!import', {
		kind: 'scalar',
		resolve: (path) => {
			return typeof path == 'string';
		},
		construct: (file) => {
			const location = path.resolve(directory, file);
			const source = fs.readFileSync(location);

			return yaml.load(source.toString(), {
				filename: location,
				schema: getSchema()
			});
		}
	});
}

export async function readYaml<T>(filename: string): Promise<T> {
	const schema = DEFAULT_SCHEMA.extend([
		createImportType(path.dirname(filename), () => schema)
	]);

	const source = await fs.promises.readFile(filename);
	return yaml.load(source.toString(), {
		filename,
		schema
	}) as unknown as T;
}
