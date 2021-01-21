export interface DocumentPartData { }
export interface DocumentPart<T extends DocumentPartData> {
	template: string,
	data: T
}

export type Document = {
	type: string,
	file: string,
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
