import { TemplateProvider, PluginValues, TemplateRenderContext } from '@doctool/plugin-api';
import nunjucks from 'nunjucks';

export class NunjucksTemplateProvider implements TemplateProvider {
	async render<T extends object>(context: TemplateRenderContext, location: string, source: Buffer, data: T): Promise<Buffer> {
		const env = new nunjucks.Environment();
		env.addFilter('renderContent', (name: string, callback: nunjucks.Callback<string, nunjucks.runtime.SafeString>) => {
			context.renderContent(name)
				.then(buffer => buffer.toString())
				.then(html => new nunjucks.runtime.SafeString(html))
				.then(safeString => callback(null, safeString))
				.catch(err => callback(err, null));
		}, true);

		const result: string = await new Promise((resolve, reject) =>
			env.renderString(source.toString(), data, (err, res) => err ? reject(err) : resolve(res as string))
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
