import { PluginValues, MediaProvider, MediaRenderContext } from '@doctool/plugin-api';
import path from 'path';
import sass from 'sass';

export class SassMediaProvider implements MediaProvider {
	readonly defaultExtension = '.css';

	async render(context: MediaRenderContext, origin: string | null, location: string, source: Buffer): Promise<Buffer> {
		const result = sass.renderSync({
			file: location,
			functions: {
				'url($url)': (relativeUrl) => {
					if (!(relativeUrl instanceof sass.types.String))
						throw '$url: Expected a string.';
					
					return new sass.types.String(`url('${context.resolveUrl(relativeUrl.getValue(), path.dirname(location))}')`);
				}
			}
		});

		return result.css;
	}
	
}

export default async function (): Promise<PluginValues> {
	return {
		mediaProviders: {
			'.sass': new SassMediaProvider(),
			'.scss': new SassMediaProvider()
		}
	}
}
