import { PluginValues, MediaProvider, MediaRenderContext } from '@doctool/plugin-api';
import path from 'path';
import { PlantUmlPipe } from 'plantuml-pipe';

export class PlantUmlContentProvider implements MediaProvider {
	readonly defaultExtension = '.svg';

	render(context: MediaRenderContext, origin: string | null, location: string, source: Buffer): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			const puml = new PlantUmlPipe({
				includePath: path.dirname(location)
			});
			const buffers: Buffer[] = [];

			puml.out.on('data', buffer => buffers.push(buffer));
			puml.out.on('end', () => {
				resolve(Buffer.concat(buffers));
			});
			puml.out.on('error', err => reject(err));
			puml.in.on('error', err => reject(err));
			puml.in.end(source);
		});
	}
}

export default async function (): Promise<PluginValues> {
	return {
		mediaProviders: {
			'.puml': new PlantUmlContentProvider()
		}
	}
}
