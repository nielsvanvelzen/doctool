import { RenderContext, Provider } from './common';

export interface PrinterRenderContext extends RenderContext {

}

export interface PrinterSource {
	name: string,
	content: Buffer
}

export interface PrinterProvider extends Provider {
	render<T extends object>(context: PrinterRenderContext, sources: PrinterSource[], data: T): Promise<Buffer>
}
