import { PluginValues, ContentProvider, ContentRenderContext, PrinterProvider, PrinterRenderContext, PrinterSource } from '@doctool/plugin-api';
import prettier from 'prettier';

export class HtmlPrinterProvider implements PrinterProvider {
	private renderLayout(body: string): string {
		return `<!DOCTYPE html>
			<html>
			<head>
				<title>HTML Output</title>
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

	async render(context: PrinterRenderContext, sources: PrinterSource[]): Promise<Buffer> {
		const body = sources.map(source => source.content.toString()).join('');

		let html = this.renderLayout(body);
		html = this.format(html);

		return Buffer.from(html, 'utf-8');
	}
}

export default async function(): Promise<PluginValues> {
	return {
		printerProviders: {
			'html': new HtmlPrinterProvider()
		}
	}
}
