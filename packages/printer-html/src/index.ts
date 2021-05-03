import { PluginValues, PrinterProvider, PrinterRenderContext } from '@doctool/plugin-api';
import prettier from 'prettier';

export class HtmlPrinterProvider implements PrinterProvider {
	readonly defaultExtension: string = 'html';

	async render<T extends object>(context: PrinterRenderContext, source: Buffer, data: T): Promise<Buffer> {
		const options: prettier.Options = {
			parser: 'html',
			endOfLine: 'auto'
		};

		try {
			const formatted = prettier.format(source.toString(), options);
			return Buffer.from(formatted, 'utf-8');
		} catch (err) {
			console.error(err);
			return source;
		}
	}
}

export default async function (): Promise<PluginValues> {
	return {
		printerProviders: {
			'html': new HtmlPrinterProvider()
		}
	}
}
