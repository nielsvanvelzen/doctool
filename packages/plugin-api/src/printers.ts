import { RenderContext, Provider } from './common';

export interface PrinterRenderContext extends RenderContext {

}

export interface PrinterSource {
	name: string,
	content: Buffer
}

export interface PrinterProvider extends Provider {
	render(context: PrinterRenderContext, sources: PrinterSource[]): Promise<Buffer>
}
