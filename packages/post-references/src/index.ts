import { PluginValues, PostProvider, PostRenderContext } from '@doctool/plugin-api';
import parse5, { DocumentFragment } from 'parse5';
import adapter from 'parse5/lib/tree-adapters/default';
import { createTextNode, getAttribute, getText, setAttribute, visit } from './parse5Utils';

export interface ReferencesPostProviderData {
	[key: string]: { [key: string]: string }
}

export class ReferencesPostProvider implements PostProvider {
	getReferenceSlug(reference: string) {
		return 'doctool-reference-' + reference.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
	}

	transformReferences(fragment: DocumentFragment, data: ReferencesPostProviderData): string[] {
		const usedReferences: string[] = [];

		visit(fragment, element => {
			if (element.tagName !== 'abbr') return;

			// Get reference name
			let reference = getAttribute(element, 'href') ?? getText(element);
			if (reference.startsWith('#')) reference = reference.substr(1);
			reference = reference.toLowerCase();

			// Add to list of known references
			if (!usedReferences.includes(reference)) usedReferences.push(reference);

			// Replace element
			element.tagName = 'a';
			setAttribute(element, 'href', `#${this.getReferenceSlug(reference)}`);

			// Append class
			const cls = (getAttribute(element, 'class') ?? '').split(' ');
			if (!cls.includes('doctool-reference')) cls.push('doctool-reference');
			setAttribute(element, 'class', cls.join(' '));
		});

		return usedReferences;
	}

	transformIndexes(fragment: DocumentFragment, usedReferences: string[], data: ReferencesPostProviderData): void {
		const generatedReferences: string[] = [];

		visit(fragment, element => {
			if (element.tagName !== 'doctool:references') return;

			const type = getAttribute(element, 'type') ?? '*';
			const references: { [key: string]: string } = {};

			// Retrieve all references from requested type that are used in the document
			for (const [reference, description] of Object.entries(data[type] || {})) {
				if (usedReferences.includes(reference.toLowerCase())) {
					references[reference] = description;
					generatedReferences.push(reference.toLowerCase());
				}
			}

			element.tagName = 'ul';
			element.childNodes = [];

			for (const [reference, description] of Object.entries(references)) {
				const li = adapter.createElement('li', element.namespaceURI, []);
				setAttribute(li, 'id', this.getReferenceSlug(reference));
				element.childNodes.push(li);

				const p = adapter.createElement('p', element.namespaceURI, []);
				li.childNodes.push(p);

				const strong = adapter.createElement('strong', element.namespaceURI, []);
				strong.childNodes.push(createTextNode(strong, reference));
				p.childNodes.push(strong);
				p.childNodes.push(adapter.createElement('br', element.namespaceURI, []));
				p.childNodes.push(createTextNode(p, description));
			}
		});

		for (const reference of usedReferences) {
			if (!generatedReferences.includes(reference)) {
				console.warn(`Reference ${reference} not found in definitions!`);
			}
		}
	}

	async render(context: PostRenderContext, source: Buffer, data: ReferencesPostProviderData): Promise<Buffer> {
		const fragment = parse5.parseFragment(source.toString());

		const usedReferences = this.transformReferences(fragment, data);
		this.transformIndexes(fragment, usedReferences, data);

		return Buffer.from(parse5.serialize(fragment), 'utf-8');
	}
}

export default async function (): Promise<PluginValues> {
	return {
		postProviders: {
			'references': new ReferencesPostProvider(),
		}
	}
}
