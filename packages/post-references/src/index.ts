import { PluginValues, PostProvider, PostRenderContext } from '@doctool/plugin-api';
import parse5, { DocumentFragment, ParentNode, Node, Element, TextNode } from 'parse5';
import adapter from 'parse5/lib/tree-adapters/default';

interface ReferencesDictionary {
	[key: string]: string
}

export interface ReferencesPostProviderData {
	// categories
	[key: string]: ReferencesDictionary
}

export class ReferencesPostProvider implements PostProvider {
	visit(node: Node, callback: (el: Element) => void) {
		const el = node as Element;
		const childs = el.childNodes || [];

		if (!node.nodeName.startsWith('#')) callback(el);

		for (const child of childs) this.visit(child, callback);
	}

	getText(el: Element): string {
		const parts: string[] = [];

		for (const node of el.childNodes) {
			if (node.nodeName == '#text') parts.push((node as TextNode).value);
			else if (!node.nodeName.startsWith('#')) parts.push(this.getText(node as Element));
		}

		return parts.join('');
	}

	getAttribute(el: Element, name: string): string | null {
		const attr = el.attrs.find(attr => attr.name == name);

		if (attr) return attr.value;
		else return null;
	}

	setAttribute(el: Element, name: string, value: string): void {
		const attr = el.attrs.find(attr => attr.name == name);

		if (attr) attr.value = value;
		else el.attrs.push({ name, value });
	}

	createTextNode(parent: ParentNode, text: string): TextNode {
		return {
			nodeName: '#text',
			value: text,
			parentNode: parent
		};
	}

	transformReferences(source: Buffer, data: ReferencesPostProviderData): { fragment: DocumentFragment, usedReferences: ReferencesDictionary | null } {
		let usedReferences: ReferencesDictionary | null = null;
		const fragment = parse5.parseFragment(source.toString());

		this.visit(fragment, element => {
			if (element.nodeName == 'abbr') {
				const title = this.getAttribute(element, 'title');
				const reference = this.getAttribute(element, 'href') ?? this.getText(element);

				if (usedReferences == null) usedReferences = {};

				usedReferences[reference] = usedReferences[reference] || title || '';

				element.tagName = 'a';
				this.setAttribute(element, 'href', '#' + encodeURIComponent(reference));

				const cls = this.getAttribute(element, 'class') ?? '';
				this.setAttribute(element, 'class', cls ? `${cls} abbr` : 'abbr');
			}
		});

		return {
			fragment,
			usedReferences
		};
	}

	transformIndexes(fragment: DocumentFragment, usedReferences: ReferencesDictionary, data: ReferencesPostProviderData): Buffer {
		this.visit(fragment, element => {
			if (element.tagName === 'doctool:references') {
				const type = this.getAttribute(element, 'type') ?? '*';

				element.tagName = 'ul';
				element.childNodes = [];

				for (const [reference, inlineDescription] of Object.entries(usedReferences)) {
					let definition = { reference, description: inlineDescription };
					if (!definition.description && type in data) {
						let search = Object.entries(data[type]).find(([key, _]) => key.toLowerCase() == reference.toLowerCase());
						
						if (search) {
							let [reference, description] = search;
							definition = { reference, description };
						}
					}

					// No description, skip
					if (!definition.description) continue;

					const li = adapter.createElement('li', element.namespaceURI, []);
					this.setAttribute(li, 'id', encodeURIComponent(reference));
					element.childNodes.push(li);

					const p = adapter.createElement('p', element.namespaceURI, []);
					li.childNodes.push(p);

					const strong = adapter.createElement('strong', element.namespaceURI, []);
					strong.childNodes.push(this.createTextNode(strong, definition.reference));
					p.childNodes.push(strong);
					p.childNodes.push(adapter.createElement('br', element.namespaceURI, []));
					p.childNodes.push(this.createTextNode(p, definition.description));
				}
			}
		});

		return Buffer.from(parse5.serialize(fragment), 'utf-8');
	}

	async render(context: PostRenderContext, source: Buffer, data: ReferencesPostProviderData): Promise<Buffer> {
		let { fragment, usedReferences } = this.transformReferences(source, data);

		let result = source;
		if (usedReferences != null) result = this.transformIndexes(fragment, usedReferences, data);

		return result;
	}
}

export default async function (): Promise<PluginValues> {
	return {
		postProviders: {
			'references': new ReferencesPostProvider(),
		}
	}
}
