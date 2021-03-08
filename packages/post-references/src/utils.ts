export function getReferenceSlug(reference: string) {
	return 'doctool-reference-' + reference.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
}
