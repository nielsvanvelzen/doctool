import { PluginValues, PostProvider, PostRenderContext } from '@doctool/plugin-api';
import RewritingStream from 'parse5-html-rewriting-stream';

interface TableOfContentsEntry {
	id: string,
	depth: number, // 1 - 6
	visibility: 'visible' | 'hidden' | 'hidden-entries'
	entries: TableOfContentsEntry[]
}

export class TableOfContentsPostProvider implements PostProvider {
	async renderHeadings(source: Buffer, data: any): Promise<{ result: Buffer, toc: TableOfContentsEntry | null }> {
		let idCounter = 0;
		let toc: TableOfContentsEntry | null = null;

		const rewriter = new RewritingStream();
		const resultPromise: Promise<{ result: Buffer, toc: TableOfContentsEntry | null }> = new Promise((resolve, reject) => {
			const buffers: Buffer[] = [];

			rewriter.on('data', buffer => buffers.push(Buffer.from(buffer)));
			rewriter.on('end', () => resolve({ result: Buffer.concat(buffers), toc }));
			rewriter.on('error', err => reject(err));
		});

		rewriter.on('startTag', tag => {
			let depth: number | null = null;
			if (tag.tagName == 'h1') depth = 1;
			else if (tag.tagName == 'h2') depth = 2;
			else if (tag.tagName == 'h3') depth = 3;
			else if (tag.tagName == 'h4') depth = 4;
			else if (tag.tagName == 'h5') depth = 5;
			else if (tag.tagName == 'h6') depth = 6;
			
			if (depth != null) {
				let id = tag.attrs.find(it => it.name == 'id')?.value;
				if (!id) {
					id = `doctool-toc-${idCounter++}`;
					tag.attrs.push({ name: 'id', value: id });
				}

				const entry: TableOfContentsEntry = { id, depth, entries: [], visibility: 'visible' };
				
				if (entry.depth == 1) toc = entry;
				else {
					let parent = toc;
					let currentDepth = 0;
					while (currentDepth < entry.depth - 1) {
						currentDepth++;

						if (parent && parent.entries.length >= 1)
							parent = parent.entries[parent.entries.length - 1];
					}

					parent?.entries.push(entry);
				}

				rewriter.emitStartTag(tag);
			} else {
				rewriter.emitStartTag(tag);
			}
		});

		rewriter.end(source.toString());

		return resultPromise;
	}

	async renderToc(source: Buffer, toc: TableOfContentsEntry, data: any): Promise<Buffer> {
		const rewriter = new RewritingStream();
		const resultPromise: Promise<Buffer> = new Promise((resolve, reject) => {
			const buffers: Buffer[] = [];

			rewriter.on('data', buffer => buffers.push(Buffer.from(buffer)));
			rewriter.on('end', () => resolve(Buffer.concat(buffers)));
			rewriter.on('error', err => reject(err));
		});

		rewriter.on('startTag', tag => {
			if (tag.tagName != 'doctool:toc') return rewriter.emitStartTag(tag);
			if (!tag.selfClosing) throw '<doctool:toc /> should be self-closing!';

			function renderEntry(entry: TableOfContentsEntry) {
				// Title
				rewriter.emitStartTag({
					tagName: `a`,
					attrs: [
						{
							name: 'href',
							value: `#${entry.id}`
						},
						{
							name: 'data-reference',
							value: entry.id
						},
						{
							name: 'data-depth',
							value: entry.depth.toString()
						}
					],
					selfClosing: false
				});
				rewriter.emitEndTag({ tagName: `a` });

				// Entries
				if (entry.entries) {
					rewriter.emitStartTag({ tagName: 'ul', attrs: [], selfClosing: false });
					for (const subEntry of entry.entries) {
						rewriter.emitStartTag({ tagName: 'li', attrs: [], selfClosing: false });
						renderEntry(subEntry);
						rewriter.emitEndTag({ tagName: 'li' });
					}
					rewriter.emitEndTag({ tagName: 'ul' });
				}
			}

			rewriter.emitStartTag({ tagName: 'div', attrs: [{ name: 'class', value: 'toc' }], selfClosing: false });
			for (const entry of toc.entries) {
				renderEntry(entry);
			}
			rewriter.emitEndTag({ tagName: 'div' });
		});

		rewriter.end(source.toString());

		return resultPromise;
	}

	async render(context: PostRenderContext, source: Buffer, data: any): Promise<Buffer> {
		let { result, toc } = await this.renderHeadings(source, data);

		if (toc != null) result = await this.renderToc(result, toc, data);

		return result;
	}
}

export default async function(): Promise<PluginValues> {
	return {
		postProviders: {
			'toc': new TableOfContentsPostProvider(),
		}
	}
}
