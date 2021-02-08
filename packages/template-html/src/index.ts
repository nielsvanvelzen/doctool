import { TemplateProvider, PluginValues, TemplateRenderContext } from '@doctool/plugin-api';

export class HtmlTemplateProvider implements TemplateProvider {
	async render<T extends object>(context: TemplateRenderContext, location: string, source: Buffer, data: T): Promise<Buffer> {
		return source;
	}
}

export default async function(): Promise<PluginValues> {
	return {
		templateProviders: {
			'.html': new HtmlTemplateProvider()
		}
	}
}
