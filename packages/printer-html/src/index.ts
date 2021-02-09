import { PluginValues, PrinterProvider, PrinterRenderContext, PrinterSource } from '@doctool/plugin-api';
import prettier from 'prettier';
import sass from 'sass';
import url from 'url';
import escapeHtml from 'escape-html';

export interface HtmlPrinterProviderData {
	title?: string,
	css?: string[] | string
}

export class HtmlPrinterProvider implements PrinterProvider {
	readonly defaultExtension: string = 'html';

	private async renderCss(location: string): Promise<string> {
		if (location.endsWith('.scss')) {
			const result = sass.renderSync({
				file: location
			});

			return `<style>${result.css}</style>`;
		}

		return `<link rel="stylesheet" href="${url.pathToFileURL(location)}" />`;
	}

	private async renderLayout(title: string|null, css: string[], body: string): Promise<string> {
		let head = '';

		if (title) head += `<title>${escapeHtml(title)}</title>`;
		for (const href of css) head += await this.renderCss(href);

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
		const css = (typeof data.css == 'string' ? [data.css] : Array.isArray(data.css) ? data.css : []).map(href => context.resolvePath('asset', href));

		let html = await this.renderLayout(data.title ?? null, css, body);
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
