
import { Plugin } from 'unified';
import visit from 'unist-util-visit';

const remarkFigures: Plugin = (options: any) => {
	options = options || {};

	return (tree) => visit(tree, (node: any, index: number, parent: any) => {
		if (node.type !== 'image' || !node.title) return;

		const children = [];

		// Move id attribute to the figure container
		let id = null;
		if (node.data?.hProperties?.id) {
			id = node.data.hProperties.id;
			delete node.data.hProperties.id;
		} else if (node.data?.id) {
			id = node.data.id;
			delete node.data.id;
		} else if (node.id) {
			id = node.id;
			delete node.id;
		}
		if (id) children.push({ type: 'html', value: `<figure id="${id}">` });
		else children.push({ type: 'html', value: `<figure>` });
		children.push(node);
		children.push({ type: 'html', value: '<figcaption>' });
		children.push({ type: 'text', value: node.title });
		children.push({ type: 'html', value: '</figcaption>' });
		children.push({ type: 'html', value: '</figure>' });

		parent.children[index] = {
			type: 'parent',
			children
		};
	});
};

export default remarkFigures;
