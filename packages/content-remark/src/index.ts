import { PluginValues, ContentProvider, ContentRenderContext } from '@doctool/plugin-api';
import HtmlContentPlugin, { HtmlContentProvider } from '@doctool/content-html';
import remark from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHighlight from 'remark-highlight.js';
import remarkHtml from 'remark-html';
import remarkAttributes from './remarkAttributes';
import remarkReferences from './remarkReferences';

export class RemarkContentProvider implements ContentProvider {
	private readonly htmlContentProvider: HtmlContentProvider;

	constructor(htmlContentProvider: HtmlContentProvider) {
		this.htmlContentProvider = htmlContentProvider;
	}

	async render<T extends object>(context: ContentRenderContext, location: string, source: Buffer, data: T): Promise<Buffer> {
		const processor = remark();
		processor.use(remarkGfm);
		processor.use(remarkHighlight);
		processor.use(remarkHtml, {
			sanitize: false
		});
		processor.use(remarkAttributes);
		processor.use(remarkReferences);
		const result = await processor.process(source);

		return await this.htmlContentProvider.render(context, location, Buffer.from(String(result), 'utf-8'), data);
	}
}

export default async function(): Promise<PluginValues> {
	const htmlContentPlugin = await HtmlContentPlugin();
	const htmlContentProvider = htmlContentPlugin.contentProviders!['.html'] as HtmlContentProvider;

	return {
		contentProviders: {
			'.md': new RemarkContentProvider(htmlContentProvider)
		}
	}
}
