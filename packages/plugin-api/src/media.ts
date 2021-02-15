import { RenderContext, Provider } from './common';

export interface MediaRenderContext extends RenderContext {

}

export interface MediaProvider extends Provider {
	readonly defaultExtension: string

	/**
	 * @param context Context for rednering this meaia
	 * @param origin The file this media was originally references from
	 * @param location The location of the referenced media
	 * @param source The source of the referenced media
	 */
	render(context: MediaRenderContext, origin: string, location: string, source: Buffer): Promise<Buffer>
}
