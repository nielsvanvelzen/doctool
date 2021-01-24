import { PluginValues, ContentProvider, ContentRenderContext, PrinterProvider, PrinterRenderContext, PrinterSource } from '@doctool/plugin-api';
import prettier from 'prettier';
import url from 'url';

export interface HtmlPrinterProviderData {
	css?: string[] | string
}
export class HtmlPrinterProvider implements PrinterProvider {
	readonly defaultExtension: string = 'html';

	private renderLayout(css: string[], body: string): string {
		let head = '';
		for (const href of css) head += `<link rel="stylesheet" href="${url.pathToFileURL(href)}" />`;

		return `<!DOCTYPE html>
			<html>
			<head>
				<title>HTML Output</title>
				${head}
			</head>
			<body>
				${body}
			</body>
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
		const css = (typeof data.css == 'string' ? [data.css] : Array.isArray(data.css) ? data.css : []).map(href => context.resolvePath('asset', href));

		let html = this.renderLayout(css, body);
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
