
import { ParentNode, Node, Element, TextNode } from 'parse5';

export function visit(node: Node, callback: (element: Element) => void) {
	const element = node as Element;
	
	if (!node.nodeName.startsWith('#'))
		callback(element);

	for (const child of element.childNodes || [])
		visit(child, callback);
}

export function getText(element: Element): string {
	const parts: string[] = [];

	for (const node of element.childNodes) {
		if (node.nodeName == '#text') parts.push((node as TextNode).value);
		else if (!node.nodeName.startsWith('#')) parts.push(getText(node as Element));
	}

	return parts.join('');
}

export function getAttribute(element: Element, name: string): string | null {
	const attr = element.attrs.find(attr => attr.name == name);

	if (attr) return attr.value;
	else return null;
}

export function setAttribute(element: Element, name: string, value: string | null): void {
	// Remove attribute (if any) when value is null
	if (value === null) {
		element.attrs = element.attrs.filter(attr => attr.name != name);
		return;
	}

	const attr = element.attrs.find(attr => attr.name == name);

	if (attr) attr.value = value;
	else element.attrs.push({ name, value });
}

export function createTextNode(parent: ParentNode, text: string): TextNode {
	return {
		nodeName: '#text',
		value: text,
		parentNode: parent
	};
}
