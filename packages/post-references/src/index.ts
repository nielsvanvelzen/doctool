import { PluginValues, PostProvider, PostRenderContext } from '@doctool/plugin-api';
import parse5, { DocumentFragment, Element } from 'parse5';
import { getAttribute, getText, setAttribute, visit } from './parse5Utils';
import { ReferenceMap, ReferencesPostProviderData } from './types';
import { getReferenceSlug } from './utils';
import { defaultStyle } from './style/default';
import { apaStyle } from './style/apa';

const styles: { [key: string]: (element: Element, references: ReferenceMap<any>) => void } = {
	default: defaultStyle,
	apa: apaStyle
};

export class ReferencesPostProvider implements PostProvider {
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
			setAttribute(element, 'href', `#${getReferenceSlug(reference)}`);

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
			const style = (getAttribute(element, 'style') ?? 'default').toLowerCase();
			const references: ReferenceMap = {};

			// Retrieve all references from requested type that are used in the document
			for (const [reference, description] of Object.entries(data[type] || {})) {
				if (usedReferences.includes(reference.toLowerCase())) {
					references[reference] = description;
					generatedReferences.push(reference.toLowerCase());
				}
			}

			let useStyle = style;
			if (!(style in styles)) {
				console.warn(`Reference style ${style} not found. Valid styles are: ${Object.keys(styles).join(', ')}`);
				// Fallback to default
				useStyle = 'default';
			}

			styles[useStyle](element, references);
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
