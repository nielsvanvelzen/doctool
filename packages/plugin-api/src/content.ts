import { RenderContext, Provider } from './common';

export interface ContentRenderContext extends RenderContext {

}

export interface ContentProvider extends Provider {
	render<T extends object>(context: ContentRenderContext, location: string, source: Buffer, data: T): Promise<Buffer>
}
