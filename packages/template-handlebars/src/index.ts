import { TemplateProvider, PluginValues } from '@doctool/plugin-api';
import handlebars from 'handlebars';

export class HandlebarsTemplateProvider implements TemplateProvider {
	render<T extends object>(location: string, source: Buffer, data: T): Promise<Buffer> {
		const template = handlebars.compile(source.toString());
		const options: handlebars.RuntimeOptions = {};
		const buffer = Buffer.from(template(data, options), 'utf-8');

		return Promise.resolve(buffer);
	}
}
export default async function(): Promise<PluginValues> {
	return {
		templateProviders: {
			'.hbs': new HandlebarsTemplateProvider()
		}
	}
}
