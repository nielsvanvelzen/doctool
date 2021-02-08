import { PluginValues, ContentProvider, ContentRenderContext } from '@doctool/plugin-api';
import path from 'path';
import marked from 'marked';

export class MarkedContentProvider implements ContentProvider {
	async render<T extends object>(context: ContentRenderContext, location: string, source: Buffer, data: T): Promise<Buffer> {
		const options: marked.MarkedOptions = {
			baseUrl: new URL(`file:///${context.resolvePath('asset', '.')}`).href + '/',
		};

		const result: string = await new Promise((resolve, reject) => {
			marked(source.toString(), options, (error, result) => error ? reject(error) : resolve(result));
		});

		return Buffer.from(result, 'utf-8');
	}
}

export default async function(): Promise<PluginValues> {
	return {
		contentProviders: {
			'.md': new MarkedContentProvider()
		}
	}
}
