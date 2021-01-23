import { RenderContext, Provider } from './common';

export interface TemplateRenderContext extends RenderContext {

}

export interface TemplateProvider extends Provider {
	render<T extends object>(context: TemplateRenderContext, location: string, source: Buffer, data: T): Promise<Buffer>
}
