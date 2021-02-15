import { ContentProvider, PluginValues, ContentRenderContext } from '@doctool/plugin-api';
import handlebars from 'handlebars';

export class HandlebarsContentProvider implements ContentProvider {
	render<T extends object>(context: ContentRenderContext, location: string, source: Buffer, data: T): Promise<Buffer> {
		const template = handlebars.compile(source.toString());
		const options: handlebars.RuntimeOptions = {};
		const buffer = Buffer.from(template(data, options), 'utf-8');

		return Promise.resolve(buffer);
	}
}
export default async function(): Promise<PluginValues> {
	return {
		contentProviders: {
			'.hbs': new HandlebarsContentProvider()
		}
	}
}
