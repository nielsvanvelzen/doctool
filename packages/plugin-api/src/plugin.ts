import { ContentProvider } from './content';
import { MediaProvider } from './media';
import { PostProvider } from './post';
import { PrinterProvider } from './printers';

export interface PluginValues {
	contentProviders?: { [key: string]: ContentProvider };
	mediaProviders?: { [key: string]: MediaProvider };
	postProviders?: { [key: string]: PostProvider };
	printerProviders?: { [key: string]: PrinterProvider };
}
