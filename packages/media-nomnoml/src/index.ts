import { PluginValues, MediaProvider, MediaRenderContext } from '@doctool/plugin-api';
import nomnoml from 'nomnoml';

export class NomnomlMediaProvider implements MediaProvider {
	readonly defaultExtension = '.svg';

	async render(context: MediaRenderContext, origin: string | null, location: string, source: Buffer): Promise<Buffer> {
		const result = nomnoml.renderSvg(source.toString());
		return Buffer.from(result, 'utf-8');
	}
}

export default async function (): Promise<PluginValues> {
	return {
		mediaProviders: {
			'.nomnoml': new NomnomlMediaProvider()
		}
	}
}
