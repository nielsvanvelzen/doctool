import { RenderContext, Provider } from './common';

export interface MediaRenderContext extends RenderContext {

}

export interface MediaProvider extends Provider {
	readonly defaultExtension: string

	/**
	 * @param context Context for rendering this media
	 * @param origin The file this media was originally referenced from
	 * @param location The location of the referenced media
	 * @param source The source of the referenced media
	 */
	render(context: MediaRenderContext, origin: string | null, location: string, source: Buffer): Promise<Buffer>
}
