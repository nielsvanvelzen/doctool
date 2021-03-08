import { Element } from 'parse5';
import adapter from 'parse5/lib/tree-adapters/default';
import { createTextNode, getAttribute, setAttribute } from '../parse5Utils';
import { Apa, ReferenceMap } from '../types';
import { getReferenceSlug } from '../utils';
import { CitationStyle } from './citationStyle';

export class ApaStyle implements CitationStyle<Apa> {
	createReference(element: Element, reference: string, definition: Apa): void {
		// Replace element
		element.tagName = 'a';
		setAttribute(element, 'href', `#${getReferenceSlug(reference)}`);

		// Append class
		const cls = (getAttribute(element, 'class') ?? '').split(' ');
		if (!cls.includes('doctool-reference')) cls.push('doctool-reference');
		setAttribute(element, 'class', cls.join(' '));

		// Replace text
		const authors = Array.isArray(definition.authors) ? definition.authors : [definition.authors].map(author => author?.split(', ')[0]).join(', ');
		const year = definition.year;

		element.childNodes = [
			createTextNode(element, `${authors}, ${year}`)
		];
	}

	private createCitation(values: Apa): string {
		const parts = [];

		// Prefix
		const authors = Array.isArray(values.authors) ? values.authors : [values.authors];
		const prefix = [];
		if (authors.length) prefix.push(`${authors.join(', ')}`);
		if (values.year) prefix.push(`(${values.year})`);
		if (prefix.length) parts.push(prefix.join(' '));

		// Known parts
		if (values.title) parts.push(values.title);
		if (values.publisher) parts.push(values.publisher);
		if (values.url) parts.push(values.url);

		return parts.join('. ');
	}

	createDescriptors(element: Element, map: ReferenceMap<Apa>): void {
		element.tagName = 'ul';
		element.childNodes = [];

		for (const [reference, values] of Object.entries(map.definitions)) {
			const li = adapter.createElement('li', element.namespaceURI, []);
			setAttribute(li, 'id', getReferenceSlug(reference));
			element.childNodes.push(li);

			const p = adapter.createElement('p', element.namespaceURI, []);
			li.childNodes.push(p);
			p.childNodes.push(createTextNode(p, this.createCitation(values || {})));
		}
	}
}
