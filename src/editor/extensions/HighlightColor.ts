import { Mark, mergeAttributes } from '@tiptap/core';

export const HighlightColor = Mark.create({
	name: 'highlightColor',
	addAttributes() {
		return {
			color: {
				default: '#fef08a',
				parseHTML: (element) => element.style.backgroundColor || '#fef08a',
				renderHTML: (attributes) => ({
					style: `background-color: ${attributes.color}`,
				}),
			},
		};
	},
	parseHTML() {
		return [{ tag: 'span[style*="background-color"]' }];
	},
	renderHTML({ HTMLAttributes }) {
		return ['span', mergeAttributes(HTMLAttributes), 0];
	},
});
