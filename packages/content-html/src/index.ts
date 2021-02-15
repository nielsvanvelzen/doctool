import { ContentProvider, PluginValues, ContentRenderContext } from '@doctool/plugin-api';
import RewritingStream from 'parse5-html-rewriting-stream';
import path from 'path';
import fs from 'fs';
import url, { URL } from 'url';

const rewriteHref = ['a', 'area', 'base', 'link'];
const rewriteSrc = ['audio', 'embed', 'iframe', 'img', 'input', 'script', 'source', 'track', 'video'];

export class HtmlContentProvider implements ContentProvider {
	async render<T extends object>(context: ContentRenderContext, location: string, source: Buffer, data: T): Promise<Buffer> {
		const rewriter = new RewritingStream();
		const resultPromise: Promise<Buffer> = new Promise((resolve, reject) => {
			const buffers: Buffer[] = [];

			rewriter.on('data', buffer => buffers.push(Buffer.from(buffer)));
			rewriter.on('end', () => resolve(Buffer.concat(buffers)));
			rewriter.on('error', err => reject(err));
		});

		rewriter.on('startTag', tag => {
			if (rewriteHref.includes(tag.tagName)) {
				for (const attr of tag.attrs) {
					if (attr.name == 'href') attr.value = context.resolveUrl(attr.value);
				}
			}
			
			if (rewriteSrc.includes(tag.tagName)) {
				for (const attr of tag.attrs) {
					if (attr.name == 'src') attr.value = context.resolveUrl(attr.value);
				}
			}
			
			if (tag.tagName.startsWith('doctool:')) {
				const tagName = tag.tagName.replace(/^doctool:/, '');

				if (tag.selfClosing && tagName == 'data') {
					const key = tag.attrs.find(it => it.name == 'key')?.value;
					const element = tag.attrs.find(it => it.name == 'element')?.value;

					if (key && key in data) {
						const text = (data as any)[key].toString();

						if (element) rewriter.emitStartTag({ tagName: element, attrs: [], selfClosing: false });
						rewriter.emitText({ text });
						if (element) rewriter.emitEndTag({ tagName: element });

						return;
					}
				}
			}

			rewriter.emitStartTag(tag);
		});

		rewriter.end(source.toString());

		return await resultPromise;
	}
}

export default async function(): Promise<PluginValues> {
	return {
		contentProviders: {
			'.html': new HtmlContentProvider()
		}
	}
}
