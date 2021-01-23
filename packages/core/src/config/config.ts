export interface DocumentPartData { }
export interface DocumentPart<T extends DocumentPartData> {
	template: string,
	with: T
}

export type Document = {
	file: string,
	printer: string,
	document: DocumentPart<any>[]
};

export interface Config {
	workingDirectory: string,
	location: string,
	directories: {
		content: string,
		template: string,
		cache: string,
		dist: string
	},
	plugins: string[],
	documents: {
		[key: string]: Document
	}
}
