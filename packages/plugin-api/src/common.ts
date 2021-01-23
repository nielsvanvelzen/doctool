export interface RenderContext {
	renderContent(name: string): Promise<Buffer>
	renderTemplate(name: string): Promise<Buffer>
}

export interface Provider { }
