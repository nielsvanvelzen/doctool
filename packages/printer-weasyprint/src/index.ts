import { PluginValues, ContentProvider, ContentRenderContext, PrinterProvider, PrinterRenderContext, PrinterSource } from '@doctool/plugin-api';
import HtmlPrinterPlugin, { HtmlPrinterProvider } from '@doctool/printer-html';

export class WeasyprintPrinterProvider implements PrinterProvider {
	private readonly htmlPrinterProvider: HtmlPrinterProvider;

	constructor(htmlPrinterProvider: HtmlPrinterProvider) {
		this.htmlPrinterProvider = htmlPrinterProvider;
	}

	async render(context: PrinterRenderContext, sources: PrinterSource[]): Promise<Buffer> {
		// TODO convert to PDF
		return this.htmlPrinterProvider.render(context, sources);
	}
}

export default async function (): Promise<PluginValues> {
	const htmlPrinterPlugin = await HtmlPrinterPlugin();
	const htmlPrinterProvider: HtmlPrinterProvider = htmlPrinterPlugin.printerProviders!['html'];
		
	return {
		printerProviders: {
			'weasyprint': new WeasyprintPrinterProvider(htmlPrinterProvider)
		}
	}
}
