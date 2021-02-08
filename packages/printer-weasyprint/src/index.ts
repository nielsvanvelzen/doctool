import { PluginValues, PrinterProvider, PrinterRenderContext, PrinterSource } from '@doctool/plugin-api';
import HtmlPrinterPlugin, { HtmlPrinterProvider, HtmlPrinterProviderData } from '@doctool/printer-html';
import childProcess from 'child_process';

export interface WeasyPrintPrinterProviderData extends HtmlPrinterProviderData {
	weasyprint?: string
}

export class WeasyPrintPrinterProvider implements PrinterProvider {
	readonly defaultExtension: string = 'pdf';
	
	private readonly htmlPrinterProvider: HtmlPrinterProvider;

	constructor(htmlPrinterProvider: HtmlPrinterProvider) {
		this.htmlPrinterProvider = htmlPrinterProvider;
	}

	async render(context: PrinterRenderContext, sources: PrinterSource[], data: WeasyPrintPrinterProviderData): Promise<Buffer> {
		const html = await this.htmlPrinterProvider.render(context, sources, data);
		const bin = data.weasyprint || 'weasyprint';
	
		return new Promise((resolve, reject) => {
			const options = [
				// Format
				'-f', 'pdf',
				// Encoding
				'-e', 'utf-8',
				// Input (stdin)
				'-',
				// Output (stdout)
				'-'
			];
			
			const process = childProcess.spawn(bin, options);
			const buffers: Buffer[] = [];
			process.stdout.on('data', chunk => buffers.push(chunk));
			process.stderr.pipe(process.stderr as any);
			process.on('close', () => resolve(Buffer.concat(buffers)));
			process.on('error', err => reject(err));
			
			process.stdin.on('error', err => reject(err));
			process.stdin.end(html, 'utf-8');
		});
	}
}

export default async function (): Promise<PluginValues> {
	const htmlPrinterPlugin = await HtmlPrinterPlugin();
	const htmlPrinterProvider = htmlPrinterPlugin.printerProviders!['html'] as HtmlPrinterProvider;
		
	return {
		printerProviders: {
			'weasyprint': new WeasyPrintPrinterProvider(htmlPrinterProvider)
		}
	}
}
