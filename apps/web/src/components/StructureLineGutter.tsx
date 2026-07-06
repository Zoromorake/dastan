import { useCallback, useEffect, useState } from 'react';
import type { Editor } from '@tiptap/core';
import type { StructureLineSpan } from '../utils/structure-line-spans';

interface StructureLineGutterProps {
	editor: Editor | null;
	spans: StructureLineSpan[];
	visible: boolean;
	isDark: boolean;
}

interface RibbonLayout {
	id: string;
	label: string;
	color: string;
	top: number;
	height: number;
}

function measureRibbons(editor: Editor, spans: StructureLineSpan[]): RibbonLayout[] {
	const editorDom = editor.view.dom;
	const editorRect = editorDom.getBoundingClientRect();
	const blockNodes = editorDom.querySelectorAll<HTMLElement>('[data-block-type]');

	return spans
		.map((span) => {
			const startNode = blockNodes.item(span.startBlockIndex);
			const endNode = blockNodes.item(span.endBlockIndex);

			if (!startNode || !endNode) {
				return null;
			}

			const startRect = startNode.getBoundingClientRect();
			const endRect = endNode.getBoundingClientRect();
			const top = startRect.top - editorRect.top;
			const height = Math.max(endRect.bottom - startRect.top, 8);

			return {
				id: span.beatId,
				label: span.label,
				color: span.color,
				top,
				height,
			};
		})
		.filter((ribbon): ribbon is RibbonLayout => ribbon !== null);
}

export function StructureLineGutter({ editor, spans, visible, isDark }: StructureLineGutterProps) {
	const [ribbons, setRibbons] = useState<RibbonLayout[]>([]);

	const syncRibbons = useCallback(() => {
		if (!editor || !visible || spans.length === 0) {
			setRibbons([]);
			return;
		}

		setRibbons(measureRibbons(editor, spans));
	}, [editor, spans, visible]);

	useEffect(() => {
		syncRibbons();

		if (!editor || !visible) {
			return;
		}

		const handleUpdate = () => {
			requestAnimationFrame(syncRibbons);
		};

		editor.on('update', handleUpdate);
		editor.on('selectionUpdate', handleUpdate);
		window.addEventListener('resize', handleUpdate);

		const scrollParent = editor.view.dom.closest('.overflow-y-auto');
		scrollParent?.addEventListener('scroll', handleUpdate, { passive: true });

		return () => {
			editor.off('update', handleUpdate);
			editor.off('selectionUpdate', handleUpdate);
			window.removeEventListener('resize', handleUpdate);
			scrollParent?.removeEventListener('scroll', handleUpdate);
		};
	}, [editor, syncRibbons, visible]);

	if (!visible || ribbons.length === 0) {
		return null;
	}

	return (
		<div
			aria-hidden
			className={`pointer-events-none absolute top-0 bottom-0 -left-3 z-10 w-2 ${isDark ? 'opacity-90' : 'opacity-100'}`}
		>
			{ribbons.map((ribbon) => (
				<div
					key={ribbon.id}
					className="absolute left-0 w-1 rounded-full"
					style={{
						top: ribbon.top,
						height: ribbon.height,
						backgroundColor: ribbon.color,
					}}
					title={ribbon.label}
				/>
			))}
		</div>
	);
}
