import { PluginValues, ContentProvider, ContentRenderContext } from '@doctool/plugin-api';
import HtmlContentPlugin, { HtmlContentProvider } from '@doctool/content-html';
import marked from 'marked';

export class MarkedContentProvider implements ContentProvider {
	private readonly htmlContentProvider: HtmlContentProvider;

	constructor(htmlContentProvider: HtmlContentProvider) {
		this.htmlContentProvider = htmlContentProvider;
	}

	async render<T extends object>(context: ContentRenderContext, location: string, source: Buffer, data: T): Promise<Buffer> {
		const options: marked.MarkedOptions = {};
		const result: string = await new Promise((resolve, reject) => {
			marked(source.toString(), options, (error, result) => error ? reject(error) : resolve(result));
		});

		return await this.htmlContentProvider.render(context, location, Buffer.from(result, 'utf-8'), data);
	}
}

export default async function(): Promise<PluginValues> {
	const htmlContentPlugin = await HtmlContentPlugin();
	const htmlContentProvider = htmlContentPlugin.contentProviders!['.html'] as HtmlContentProvider;

	return {
		contentProviders: {
			'.md': new MarkedContentProvider(htmlContentProvider)
		}
	}
}
