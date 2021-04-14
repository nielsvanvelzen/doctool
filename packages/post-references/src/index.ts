import { PluginValues, PostProvider, PostRenderContext } from '@doctool/plugin-api';
import parse5, { DocumentFragment } from 'parse5';
import { createTextNode, getAttribute, getText, setAttribute, visit } from './parse5Utils';
import { ReferenceMap, ReferencesPostProviderData, ReferenceStyle } from './types';
import { DefaultStyle } from './style/default';
import { ApaStyle } from './style/apa';
import { CitationStyle } from './style/citationStyle';
import { LinkStyle } from './style/linkStyle';

const styles: { [key: string]: CitationStyle<unknown> } = {
	default: new DefaultStyle(),
	apa: new ApaStyle(),
	link: new LinkStyle(),
};

export class ReferencesPostProvider implements PostProvider {
	/**
	 * Convert [ReferencesPostProviderData] to a flat map to convert references to their list type.
	 */
	private getDefinitionsToList(data: ReferencesPostProviderData): { [key: string]: string } {
		const definitionToList: { [key: string]: string } = {};

		for (const [list, references] of Object.entries(data)) {
			for (const reference of Object.keys(references.definitions)) {
				definitionToList[reference.toLowerCase()] = list;
			}
		}

		return definitionToList;
	}

	private getStyle(list: string, data: ReferencesPostProviderData): CitationStyle<unknown> {
		let style: ReferenceStyle | undefined = undefined;

		if (list && !list.startsWith('#')) style = data[list].style;
		if (!style || !(style in styles)) style = 'default';

		return styles[style] as CitationStyle<unknown>;
	}

	transformReferences(fragment: DocumentFragment, definitionToList: { [key: string]: string }, data: ReferencesPostProviderData): { [list: string]: ReferenceMap } {
		const usedReferences: { [list: string]: ReferenceMap } = {};

		visit(fragment, element => {
			if (element.tagName !== 'abbr') return;

			// Get reference name
			let reference = getAttribute(element, 'href') ?? getText(element);
			if (reference.startsWith('#')) {
				reference = reference.substr(1);
				styles.link.createReference(element, reference, null);
			} else {
				reference = reference.toLowerCase();

				// Find list
				const list = definitionToList[reference];
				if (list) {
					// Create HTML
					const [referenceKey, definition] = Object.entries(data[list].definitions).find(([key]) => key.toLowerCase() == reference)!;
					const style = this.getStyle(list, data);
					style.createReference(element, reference, definition);
			
					// Add to list of known references
					if (!(list in usedReferences)) usedReferences[list] = { style: data[list].style, definitions: {} };
					usedReferences[list].definitions[referenceKey] = definition;
				} else {
					console.warn(`No definition found for reference ${reference}.`);
				}
			}
		});

		return usedReferences;
	}

	findReferences(prefix: string, fragment: DocumentFragment): ReferenceMap<string> {
		const definitions: { [key: string]: string } = {};

		visit(fragment, element => {
			const id = getAttribute(element, 'id');
			if (id?.startsWith(prefix)) definitions[id] = id;
		});

		return {
			style: 'link',
			definitions
		};
	}

	transformIndexes(fragment: DocumentFragment, usedReferences: { [list: string]: ReferenceMap }, data: ReferencesPostProviderData): void {
		visit(fragment, element => {
			if (element.tagName !== 'doctool:references') return;

			// Get attributes
			const list = getAttribute(element, 'type') ?? getAttribute(element, 'list') ?? 'default';

			// Remove custom attributes
			setAttribute(element, 'list', null);
			setAttribute(element, 'type', null);

			// Create HTML
			let map: ReferenceMap;
			if (list.startsWith('#')) map = this.findReferences(list.substr(1), fragment);
			else map = usedReferences[list];

			if (map) {
				const style = styles[map.style];
				style.createDescriptors(element, map);
			} else {
				console.warn(`No references used for list ${list}.`);
				element.tagName = 'strong';
				element.childNodes = [
					createTextNode(element, 'No references found.')
				];
			}
		});
	}

	async render(context: PostRenderContext, source: Buffer, data: ReferencesPostProviderData): Promise<Buffer> {
		const fragment = parse5.parseFragment(source.toString());
		const definitionToList = this.getDefinitionsToList(data);

		const usedReferences = this.transformReferences(fragment, definitionToList, data);
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
