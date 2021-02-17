import { PluginValues, PrinterProvider, PrinterRenderContext, PrinterSource } from '@doctool/plugin-api';
import prettier from 'prettier';
import escapeHtml from 'escape-html';

export interface HtmlPrinterProviderData {
	title?: string,
	css?: string[] | string
}

export class HtmlPrinterProvider implements PrinterProvider {
	readonly defaultExtension: string = 'html';

	private async renderLayout(context: PrinterRenderContext, title: string | null, css: string[], body: string): Promise<string> {
		let head = '';

		if (title) head += `<title>${escapeHtml(title)}</title>`;
		for (const href of css) head += `<link rel="stylesheet" href="${context.resolveUrl(href)}" />`;;

		return `<!DOCTYPE html>
			<html>
			<head>${head}</head>
			<body>${body}</body>
			</html>
		`;
	}

	private format(source: string): string {
		const options: prettier.Options = {
			parser: 'html',
			endOfLine: 'auto'
		};

		return prettier.format(source, options);
	}

	async render(context: PrinterRenderContext, sources: PrinterSource[], data: HtmlPrinterProviderData): Promise<Buffer> {
		const body = sources.map(source => source.content.toString()).join('');
		const css = typeof data.css == 'string' ? [data.css] : Array.isArray(data.css) ? data.css : [];

		let html = await this.renderLayout(context, data.title ?? null, css, body);
		html = this.format(html);

		return Buffer.from(html, 'utf-8');
	}
}

export default async function (): Promise<PluginValues> {
	return {
		printerProviders: {
			'html': new HtmlPrinterProvider()
		}
	}
}
