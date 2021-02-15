import { ContentProvider, PluginValues, ContentRenderContext } from '@doctool/plugin-api';
import HtmlContentPlugin, { HtmlContentProvider } from '@doctool/content-html';
import nunjucks from 'nunjucks';

export class NunjucksContentProvider implements ContentProvider {
	private readonly htmlContentProvider: HtmlContentProvider;

	constructor(htmlContentProvider: HtmlContentProvider) {
		this.htmlContentProvider = htmlContentProvider;
	}

	async render<T extends object>(context: ContentRenderContext, location: string, source: Buffer, data: T): Promise<Buffer> {
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

		return await this.htmlContentProvider.render(context, location, Buffer.from(result, 'utf-8'), data);
	}
}

export default async function(): Promise<PluginValues> {
	const htmlContentPlugin = await HtmlContentPlugin();
	const htmlContentProvider = htmlContentPlugin.contentProviders!['.html'] as HtmlContentProvider;

	return {
		contentProviders: {
			'.njk': new NunjucksContentProvider(htmlContentProvider)
		}
	}
}
