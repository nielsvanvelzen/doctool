import { Plugin } from 'unified';
import visit from 'unist-util-visit';

const remarkReferences: Plugin = (options: any) => {
	options = options || {};

	const regex = options.regex || /\*\[(#?[-\w\s]+)\]/g;

	return (tree) => {
		visit(tree, 'text', (node: any, index, parent) => {
			const result = [];

			regex.lastIndex = 0;
			let match = regex.exec(node.value);
			let position = 0;
			let start = 0;
			while (match) {
				position = match.index;
				if (start !== position) result.push({ type: 'text', value: node.value.slice(start, position) });

				result.push({ type: 'html', value: '<abbr>' });
				result.push({ type: 'text', value: match[1] });
				result.push({ type: 'html', value: '</abbr>' });

				start = position + match[0].length;
				match = regex.exec(node.value);
			}

			if (result.length > 0) {
				if (start < node.value.length) result.push({ type: 'text', value: node.value.slice(start) });

				parent?.children.splice(index, 1, ...result);
				return index + result.length;
			}
		});
	};
};

export default remarkReferences;
