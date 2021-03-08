export type Apa = {
	authors?: string | string[],
	year?: string,
	title?: string,
	publisher?: string,
	url?: string,
};

export type ReferenceStyle = 'apa' | 'default';

export type ReferenceMap<T = string | Apa> = {
	style: ReferenceStyle,
	definitions: {
		[key: string]: T
	}
};

export interface ReferencesPostProviderData {
	[key: string]: ReferenceMap<any>
}
