import { PluginValues, ContentProvider, ContentRenderContext } from '@doctool/plugin-api';
import createAsciidoctor, { Asciidoctor }  from 'asciidoctor';

export class AsciidoctorContentProvider implements ContentProvider {
	async render<T extends object>(context: ContentRenderContext, location: string, source: Buffer, data: T): Promise<Buffer> {
		const asciidoctor = createAsciidoctor();

		const options: Asciidoctor.ProcessorOptions = {
			base_dir: context.resolvePath('asset', '.')
		};

		const result: string = asciidoctor.convert(source, options) as string;

		return Buffer.from(result, 'utf-8');
	}
}

export default async function(): Promise<PluginValues> {
	return {
		contentProviders: {
			'.adoc': new AsciidoctorContentProvider()
		}
	}
}
