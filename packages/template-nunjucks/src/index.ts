import { TemplateProvider, PluginValues } from '@doctool/plugin-api';
import { rejects } from 'assert';
import nunjucks from 'nunjucks';
import { resolve } from 'path';

export class NunjucksTemplateProvider implements TemplateProvider {
	async render<T extends object>(location: string, source: Buffer, data: T): Promise<Buffer> {
		const template = nunjucks.compile(source.toString());
		const result: string = await new Promise((resolve, reject) =>
			template.render(data, (err, res) => err ? reject(err) : resolve(res as string))
		);

		return Buffer.from(result, 'utf-8');
	}
}
export default async function(): Promise<PluginValues> {
	return {
		templateProviders: {
			'.njk': new NunjucksTemplateProvider()
		}
	}
}
