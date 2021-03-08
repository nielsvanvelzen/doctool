import { Element } from 'parse5';
import { ReferenceMap } from '../types';

export interface CitationStyle<T> {
	createReference(element: Element, reference: string, definition: T): void;
	createDescriptors(element: Element, map: ReferenceMap<T>): void;
}
