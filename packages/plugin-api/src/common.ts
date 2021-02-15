export type Directory = 'content' | 'template' | 'asset' | 'cache' | 'dist';

export interface RenderContext {
	resolvePath(type: Directory, name: string): string
	renderContent(name: string): Promise<Buffer>
	resolveUrl(name: string): string
}

export interface Provider { }
