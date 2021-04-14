import { Element } from 'parse5';
import adapter from 'parse5/lib/tree-adapters/default';
import { createTextNode, getAttribute, setAttribute } from '../parse5Utils';
import { ReferenceMap } from '../types';
import { CitationStyle } from './citationStyle';

export class LinkStyle implements CitationStyle<string> {
	createReference(element: Element, reference: string, definition: string): void {
		// Replace element
		element.tagName = 'a';
		setAttribute(element, 'href', `#${reference}`);

		const span = adapter.createElement('span', element.namespaceURI, []);
		setAttribute(span, 'class', 'doctool-reference-link-content');
		span.childNodes = [...element.childNodes];
		element.childNodes = [
			span
		];

		// Append class
		const cls = (getAttribute(element, 'class') ?? '').split(' ');
		if (!cls.includes('doctool-reference')) cls.push('doctool-reference');
		if (!cls.includes('doctool-reference-link')) cls.push('doctool-reference-link');
		setAttribute(element, 'class', cls.join(' '));
	}

	createDescriptors(element: Element, map: ReferenceMap<string>): void {
		element.tagName = 'div';
		element.childNodes = [];

		for (const [id] of Object.entries(map.definitions)) {
			const a = adapter.createElement('a', element.namespaceURI, []);
			setAttribute(a, 'data-reference', id);
			setAttribute(a, 'href', `#${id}`);
			setAttribute(a, 'class', 'doctool-reference-link-anchor');
			element.childNodes.push(a);

			for (const entry of ['label', 'extra']) {
				const el = adapter.createElement('span', element.namespaceURI, []);
				setAttribute(el, 'data-reference', id);
				setAttribute(el, 'href', `#${id}`);
				setAttribute(el, 'class', `doctool-reference-link-${entry}`);
				if (entry === 'label') createTextNode(el, id);
				a.childNodes.push(el);
			}
		}
	}
}
