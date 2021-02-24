import { PluginValues, PostProvider, PostRenderContext } from '@doctool/plugin-api';
import RewritingStream from 'parse5-html-rewriting-stream';

export interface MetadataPostProviderData {
	[key: string]: string
}

export class MetadataPostProvider implements PostProvider {
	private addMetadata(rewriter: RewritingStream, data: MetadataPostProviderData): void {
		for (const [name, value] of Object.entries(data)) {
			if (name == 'title') {
				rewriter.emitStartTag({ tagName: 'title', selfClosing: false, attrs: [] });
				rewriter.emitText({ text: value });
				rewriter.emitEndTag({ tagName: 'title' });
			} else {
				rewriter.emitStartTag({
					tagName: 'meta',
					selfClosing: true,
					attrs: [
						{
							name: 'name',
							value: name
						}, {
							name: 'content',
							value: value
						}
					]
				});
			}
		}
	}

	async render(context: PostRenderContext, source: Buffer, data: MetadataPostProviderData): Promise<Buffer> {
		const rewriter = new RewritingStream();
		const resultPromise: Promise<Buffer> = new Promise((resolve, reject) => {
			const buffers: Buffer[] = [];

			rewriter.on('data', buffer => buffers.push(Buffer.from(buffer)));
			rewriter.on('end', () => resolve(Buffer.concat(buffers)));
			rewriter.on('error', err => reject(err));
		});

		rewriter.on('startTag', tag => {
			rewriter.emitStartTag(tag);

			if (tag.tagName == 'head') this.addMetadata(rewriter, data);
		});

		rewriter.end(source.toString());

		return await resultPromise;
	}
}

export default async function (): Promise<PluginValues> {
	return {
		postProviders: {
			'metadata': new MetadataPostProvider()
		}
	}
}
