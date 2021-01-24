export type Directory = 'content' | 'template' | 'asset' | 'cache' | 'dist';

export interface RenderContext {
	resolvePath(type: Directory, name: string): string
	renderContent(name: string): Promise<Buffer>
	renderTemplate(name: string): Promise<Buffer>
}

export interface Provider { }
