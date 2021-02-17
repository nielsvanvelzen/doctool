export type Directory = 'content' | 'template' | 'asset' | 'cache' | 'dist';

export interface RenderContext {
	resolvePath(type: Directory, name: string): string
	renderContent(name: string): Promise<Buffer>
	resolveUrl(name: string, origin?: string): string

	awaitAll(): Promise<void>
}

export interface Provider { }
