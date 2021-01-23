import { TemplateProvider } from './templates';
import { ContentProvider } from './content';
import { PrinterProvider } from './printers';

export interface PluginValues {
	templateProviders?: { [key: string]: TemplateProvider };
	contentProviders?: { [key: string]: ContentProvider };
	printerProviders?: { [key: string]: PrinterProvider };
}
