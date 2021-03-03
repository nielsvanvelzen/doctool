import { Plugin } from 'unified';
import visit from 'unist-util-visit';

const remarkHeadings: Plugin = (options: any) => {
	options = options || {};
	return (tree) => {
		visit(tree, 'heading', (node: any, index, parent) => {
			const lastChild = node.children[node.children.length - 1];
			if (!lastChild || lastChild.type !== 'text') return;

			const str = lastChild.value.trimEnd();
			const selectorMatch = str.match(/ {(.*?)}/);
			if (!selectorMatch) return;

			const selector = selectorMatch[1];
			const attributes: string[] = selector.split(/(?=#|\.)/).map((it: string) => it.trim());
			const className = attributes.filter(it => it.startsWith('.'))
				.map(it => it.substring(1))
				.join(' ');
			const id = attributes.filter(it => it.startsWith('#'))
				.pop()
				?.substring(1)
				?? null;

			if (!node.data) node.data = new Object();
			if (!node.data.hProperties) node.data.hProperties = new Object();

			if (id) {
				node.data.id = id;
				node.data.hProperties.id = id;
			}

			if (className.length > 0) {
				const currentClass = node.data.hProperties.class;
				if (currentClass) node.data.hProperties.class += className;
				else node.data.hProperties.class = className;
			}

			lastChild.value = str.substring(0, selectorMatch.index);
		});
	};
};

export default remarkHeadings;
