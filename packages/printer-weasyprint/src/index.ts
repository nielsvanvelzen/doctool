import { PluginValues, PrinterProvider, PrinterRenderContext, PrinterSource } from '@doctool/plugin-api';
import childProcess from 'child_process';

export interface WeasyPrintPrinterProviderData {
	weasyprint?: string
}

export class WeasyPrintPrinterProvider implements PrinterProvider {
	readonly defaultExtension: string = 'pdf';

	async render(context: PrinterRenderContext, source: Buffer, data: WeasyPrintPrinterProviderData): Promise<Buffer> {
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
			
			const child = childProcess.spawn(bin, options);
			const buffers: Buffer[] = [];
			child.stdout.on('data', chunk => buffers.push(chunk));
			child.stderr.pipe(process.stderr);
			child.on('close', () => resolve(Buffer.concat(buffers)));
			child.on('error', err => reject(err));
			
			child.stdin.on('error', err => reject(err));
			child.stdin.end(source, 'utf-8');
		});
	}
}

export default async function (): Promise<PluginValues> {
	return {
		printerProviders: {
			'weasyprint': new WeasyPrintPrinterProvider()
		}
	}
}
