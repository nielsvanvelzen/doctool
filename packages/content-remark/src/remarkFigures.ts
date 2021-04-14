
import { Plugin } from 'unified';
import visit from 'unist-util-visit';

const remarkFigures: Plugin = (options: any) => {
	options = options || {};

	return (tree) => visit(tree, (node: any, index: number, parent: any) => {
		if (node.type !== 'image' || !node.title) return;

		const children = [];
		children.push({ type: 'html', value: '<figure>' });
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
