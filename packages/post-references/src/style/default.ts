import { Element } from 'parse5';
import adapter from 'parse5/lib/tree-adapters/default';
import { createTextNode, setAttribute } from '../parse5Utils';
import { ReferenceMap } from '../types';
import { getReferenceSlug } from '../utils';

export const defaultStyle = (element: Element, references: ReferenceMap<string>) => {
	element.tagName = 'ul';
	element.childNodes = [];

	for (const [reference, description] of Object.entries(references)) {
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
};
