export interface Provider { }

export interface TemplateProvider {
	render<T extends object>(location: string, source: Buffer, data: T): Promise<Buffer>
}

export interface PluginValues {
	templateProviders?: {
		[key: string]: TemplateProvider
	}
}
