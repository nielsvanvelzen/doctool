import { Element } from 'parse5';
import adapter from 'parse5/lib/tree-adapters/default';
import { createTextNode, getAttribute, setAttribute } from '../parse5Utils';
import { ReferenceMap } from '../types';
import { getReferenceSlug } from '../utils';
import { CitationStyle } from './citationStyle';

export class DefaultStyle implements CitationStyle<string> {
	createReference(element: Element, reference: string, definition: string): void {
		// Replace element
		element.tagName = 'a';
		setAttribute(element, 'href', `#${getReferenceSlug(reference)}`);

		// Append class
		const cls = (getAttribute(element, 'class') ?? '').split(' ');
		if (!cls.includes('doctool-reference')) cls.push('doctool-reference');
		setAttribute(element, 'class', cls.join(' '));
	}

	createDescriptors(element: Element, map: ReferenceMap<string>): void {
		element.tagName = 'ul';
		element.childNodes = [];

		const entries = Object.entries(map.definitions).sort((a, b) => {
			if (a[0] < b[0]) return -1;
			else if (a[0] > b[0]) return 1;
			else return 0;
		});
		
		for (const [reference, description] of entries) {
			const li = adapter.createElement('li', element.namespaceURI, []);
			setAttribute(li, 'id', getReferenceSlug(reference));
			element.childNodes.push(li);

			const p = adapter.createElement('p', element.namespaceURI, []);
			li.childNodes.push(p);

			const strong = adapter.createElement('strong', element.namespaceURI, []);
			strong.childNodes.push(createTextNode(strong, reference));
			p.childNodes.push(strong);
			p.childNodes.push(adapter.createElement('br', element.namespaceURI, []));
			p.childNodes.push(createTextNode(p, description));
		}
	}
}
