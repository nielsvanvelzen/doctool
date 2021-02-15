import { ContentProvider } from './content';
import { PrinterProvider } from './printers';

export interface PluginValues {
	contentProviders?: { [key: string]: ContentProvider };
	printerProviders?: { [key: string]: PrinterProvider };
}
