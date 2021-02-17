import { RenderContext, Provider } from './common';

export interface PrinterRenderContext extends RenderContext {

}

export interface PrinterSource {
	name: string,
	content: Buffer
}

export interface PrinterProvider extends Provider {
	readonly defaultExtension: string

	render<T extends object>(context: PrinterRenderContext, source: Buffer, data: T): Promise<Buffer>
}
