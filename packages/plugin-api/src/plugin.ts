import { TemplateProvider } from './templates';
import { ContentProvider } from './content';

export interface PluginValues {
	templateProviders?: { [key: string]: TemplateProvider };
	contentProviders?: { [key: string]: ContentProvider };
}
