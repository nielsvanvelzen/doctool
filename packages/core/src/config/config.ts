export type DataObject = {
	[key: string]: string | number | boolean
};
export interface DocumentPart {
	template: string,
	with: DataObject
}

export type Document = {
	namespace?: string,
	file: string,
	printer: string,
	with: DataObject,
	document: DocumentPart[]
};

export interface Config {
	workingDirectory: string,
	location: string,
	directories: {
		namespaces: boolean,
		shared?: string,
		content: string,
		template: string,
		asset: string,
		cache: string,
		dist: string
	},
	plugins: string[],
	documents: {
		[key: string]: Document
	}
}
