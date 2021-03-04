export type Apa = {
	author?: string | string[],
	year?: string,
	title?: string,
	publisher?: string,
	url?: string,
};

export type ReferenceMap<T = string | Apa> = { [key: string]: T };

export interface ReferencesPostProviderData {
	[key: string]: ReferenceMap<any>
}
