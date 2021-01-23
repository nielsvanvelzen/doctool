import { PluginValues, ContentProvider, ContentRenderContext, PrinterProvider, PrinterRenderContext, PrinterSource } from '@doctool/plugin-api';
import HtmlPrinterPlugin, { HtmlPrinterProvider } from '@doctool/printer-html';
import childProcess from 'child_process';

export class WeasyprintPrinterProvider implements PrinterProvider {
	private readonly htmlPrinterProvider: HtmlPrinterProvider;

	constructor(htmlPrinterProvider: HtmlPrinterProvider) {
		this.htmlPrinterProvider = htmlPrinterProvider;
	}

	async render(context: PrinterRenderContext, sources: PrinterSource[]): Promise<Buffer> {
		const html = await this.htmlPrinterProvider.render(context, sources);
	
		return new Promise((resolve, reject) => {
			const process = childProcess.spawn('weasyprint', ['-f', 'pdf', '-e', 'utf-8', '-', '-']);

			const buffers: Buffer[] = [];
			process.stdout.on('data', chunk => buffers.push(chunk));
			process.stderr.pipe(process.stderr as any);
			process.on('close', () => resolve(Buffer.concat(buffers)));
			process.on('error', err => reject(err));

			process.stdin.write(html, 'utf-8');
			process.stdin.end();
		});
	}
}

export default async function (): Promise<PluginValues> {
	const htmlPrinterPlugin = await HtmlPrinterPlugin();
	const htmlPrinterProvider = htmlPrinterPlugin.printerProviders!['html'] as HtmlPrinterProvider;
		
	return {
		printerProviders: {
			'weasyprint': new WeasyprintPrinterProvider(htmlPrinterProvider)
		}
	}
}
