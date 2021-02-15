import { ContentProvider } from './content';
import { MediaProvider } from './media';
import { PrinterProvider } from './printers';

export interface PluginValues {
	mediaProviders?: { [key: string]: MediaProvider };
	contentProviders?: { [key: string]: ContentProvider };
	printerProviders?: { [key: string]: PrinterProvider };
}
