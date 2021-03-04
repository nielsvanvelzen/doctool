import { Element } from 'parse5';
import adapter from 'parse5/lib/tree-adapters/default';
import { createTextNode, setAttribute } from '../parse5Utils';
import { Apa, ReferenceMap } from '../types';
import { getReferenceSlug } from '../utils';

function createCitation(values: Apa): string {
	const parts = [];

	// Prefix
	const authors = Array.isArray(values.author) ? values.author : [values.author];
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

export const apaStyle = (element: Element, references: ReferenceMap<Apa>) => {
	element.tagName = 'ul';
	element.childNodes = [];

	for (const [reference, values] of Object.entries(references)) {
		const li = adapter.createElement('li', element.namespaceURI, []);
		setAttribute(li, 'id', getReferenceSlug(reference));
		element.childNodes.push(li);

		const p = adapter.createElement('p', element.namespaceURI, []);
		li.childNodes.push(p);
		p.childNodes.push(createTextNode(p, createCitation(values || {})));
	}
};
