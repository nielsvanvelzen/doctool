import { Plugin } from 'unified';
import visit from 'unist-util-visit';

type attributesObject = { id: string | null, className: string, customAttributes: { key: string, value: string }[] };
	
function parseAttributes(str: string): attributesObject {
	const attributes: string[] = str.split(/(?=#|\.|:)/).map((it: string) => it.trim());
	const customAttributes = attributes.filter(it => it.startsWith(':'))
		.map(it => it.substring(1).split((/=(.*)$/)))
		.map(([key, value]) => ({ key, value }));
	const className = attributes.filter(it => it.startsWith('.'))
		.map(it => it.substring(1))
		.join(' ');
	const id = attributes.filter(it => it.startsWith('#'))
		.pop()
		?.substring(1)
		?? null;
	
	return { id, className, customAttributes };
}

function applyAttributes(node: any, { id, className, customAttributes }: attributesObject) {
	if (!node.data) node.data = new Object();
	if (!node.data.hProperties) node.data.hProperties = new Object();

	for (const { key, value } of customAttributes) {
		node.data.hProperties[key] = value;
	}

	if (id) {
		node.data.id = id;
		node.data.hProperties.id = id;
	}

	if (className.length > 0) {
		const currentClass = node.data.hProperties.class;
		if (currentClass) node.data.hProperties.class += className;
		else node.data.hProperties.class = className;
	}
}

function visitLastChild(node: any, index: number, parent: any) {
	if (!node.children.length) return;

	const lastChild = node.children[node.children.length - 1];
	if (!lastChild || lastChild.type !== 'text') return;

	const str = lastChild.value.trimEnd();
	const selectorMatch = str.match(/ {(.*?)}\s*$/);
	if (!selectorMatch) return;

	const selector = selectorMatch[1];
	const attrs = parseAttributes(selector);
	applyAttributes(node, attrs);

	lastChild.value = str.substring(0, selectorMatch.index);
}

function visitNext(node: any, index: number, parent: any) {
	if (parent.children.length <= index + 1) return;

	let next = parent.children[index + 1];
	if (next && next.type === 'paragraph' && next.children.length) next = next.children[0];
	if (!next || next.type !== 'text') return;

	const str = next.value.trimEnd();
	const selectorMatch = str.match(/^\s*{(.*?)}/);
	if (!selectorMatch) return;

	const selector = selectorMatch[1];
	const attrs = parseAttributes(selector);
	applyAttributes(node, attrs);

	next.value = str.substring(selectorMatch[0].length);
}

function visitMeta(node: any, index: number, parent: any) {
	if (!node.meta) return;

	const selectorMatch = node.meta.match(/{(.*?)}/);
	if (!selectorMatch) return;

	const selector = selectorMatch[1];
	const attrs = parseAttributes(selector);
	applyAttributes(node, attrs);

	node.meta = node.meta.substring(selectorMatch.index, selector.length + 1);
}

function visitPrevious(node: any, index: number, parent: any) {
	if (index <= 0) return;

	let previous = parent.children[index - 1];
	if (previous && previous.type === 'paragraph' && previous.children.length) previous = previous.children[previous.children.length - 1];
	if (!previous || previous.type !== 'text') return;

	const str = previous.value.trimEnd();
	const selectorMatch = str.match(/{(.*?)}\s*$/);
	if (!selectorMatch) return;

	const selector = selectorMatch[1];
	const attrs = parseAttributes(selector);
	applyAttributes(node, attrs);

	previous.value = str.substring(0, selectorMatch.index);
}

function visitor(node: any, index: number, parent: any) {
	if (node.type === 'heading') return visitLastChild(node, index, parent);
	else if (node.type === 'image') return visitNext(node, index, parent);
	else if (node.type === 'code') return visitMeta(node, index, parent);
	else if (node.type === 'table') return visitPrevious(node, index, parent);
}

const remarkAttributes: Plugin = (options: any) => {
	options = options || {};
	return (tree) => visit(tree, visitor);
};

export default remarkAttributes;
