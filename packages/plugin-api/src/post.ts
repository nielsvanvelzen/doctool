import { RenderContext, Provider } from './common';

export interface PostRenderContext extends RenderContext {

}

export interface PostProvider extends Provider {
	render(context: PostRenderContext, source: Buffer, data: any): Promise<Buffer>
}
