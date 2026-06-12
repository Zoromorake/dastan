import { useEffect, useState, type ReactNode } from 'react';
import type { Editor } from '@tiptap/core';
import {
	Bold as BoldIcon,
	Highlighter,
	Italic as ItalicIcon,
	Redo2,
	Strikethrough,
	StickyNote,
	Type,
	Underline as UnderlineIcon,
	Undo2,
	Users,
} from 'lucide-react';
import type { ScreenplayBlockType } from '../types';
import { isDualDialogueActive, toggleDualDialogue } from '../editor/commands';
import { ElementPicker } from './ElementPicker';

const TEXT_COLORS = ['#1c1917', '#1d4ed8', '#dc2626', '#15803d', '#7c3aed', '#a16207'];
const HIGHLIGHT_COLORS = ['#fef08a', '#bbf7d0', '#fbcfe8', '#bae6fd', '#fde68a', '#e9d5ff'];

interface EditorFloatingToolbarProps {
	editor: Editor;
	currentBlockType: ScreenplayBlockType | null;
	blockTypeLabels: Record<ScreenplayBlockType, string>;
	isDark: boolean;
	floatingBarClass: string;
	floatingBtnClass: string;
	floatingBtnActiveClass: string;
	floatingDividerClass: string;
	onSetBlockType: (blockType: ScreenplayBlockType) => void;
	onToggleBold: () => void;
	onToggleItalic: () => void;
	onToggleUnderline: () => void;
	onToggleStrike: () => void;
	onUndo: () => void;
	onRedo: () => void;
	onOpenScriptNote: () => void;
}

function ColorPopover({
	colors,
	title,
	onSelect,
}: {
	colors: string[];
	title: string;
	onSelect: (color: string) => void;
}) {
	return (
		<div className="absolute bottom-[calc(100%+8px)] left-1/2 z-50 min-w-[148px] -translate-x-1/2 rounded-xl border border-white/10 bg-[#1f1f1f] p-2 shadow-xl">
			<p className="mb-2 px-1 text-[10px] uppercase tracking-[0.16em] text-white/50">{title}</p>
			<div className="grid grid-cols-3 gap-1.5">
				{colors.map((color) => (
					<button
						key={color}
						className="h-7 w-7 rounded-md border border-white/10 transition hover:scale-105"
						style={{ backgroundColor: color }}
						title={color}
						type="button"
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => onSelect(color)}
					/>
				))}
			</div>
		</div>
	);
}

function ToolbarButton({
	className,
	title,
	ariaLabel,
	active = false,
	disabled = false,
	onClick,
	children,
}: {
	className: string;
	title: string;
	ariaLabel: string;
	active?: boolean;
	disabled?: boolean;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<button
			aria-disabled={disabled}
			aria-label={ariaLabel}
			aria-pressed={active}
			className={className}
			disabled={disabled}
			title={title}
			type="button"
			onMouseDown={(event) => event.preventDefault()}
			onClick={onClick}
		>
			{children}
		</button>
	);
}

export function EditorFloatingToolbar({
	editor,
	currentBlockType,
	blockTypeLabels,
	isDark,
	floatingBarClass,
	floatingBtnClass,
	floatingBtnActiveClass,
	floatingDividerClass,
	onSetBlockType,
	onToggleBold,
	onToggleItalic,
	onToggleUnderline,
	onToggleStrike,
	onUndo,
	onRedo,
	onOpenScriptNote,
}: EditorFloatingToolbarProps) {
	const [textColorOpen, setTextColorOpen] = useState(false);
	const [highlightOpen, setHighlightOpen] = useState(false);
	const [dualActive, setDualActive] = useState(false);
	const [canUndo, setCanUndo] = useState(false);
	const [canRedo, setCanRedo] = useState(false);

	useEffect(() => {
		setDualActive(isDualDialogueActive(editor));
		setCanUndo(editor.can().undo());
		setCanRedo(editor.can().redo());
	}, [editor, editor.state.selection, editor.state.doc, currentBlockType]);

	const applyTextColor = (color: string) => {
		editor.chain().focus().setMark('textColor', { color }).run();
		setTextColorOpen(false);
	};

	const applyHighlightColor = (color: string) => {
		editor.chain().focus().setMark('highlightColor', { color }).run();
		setHighlightOpen(false);
	};

	return (
		<div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
			<div className={`pointer-events-auto flex max-w-[calc(100vw-2rem)] items-stretch overflow-visible rounded-[1.35rem] border backdrop-blur-md ${floatingBarClass}`}>
				<ToolbarButton className={floatingBtnClass} disabled={!canUndo} title="Undo" ariaLabel="Undo" onClick={onUndo}>
					<Undo2 size={20} strokeWidth={2.2} />
				</ToolbarButton>
				<ToolbarButton className={floatingBtnClass} disabled={!canRedo} title="Redo" ariaLabel="Redo" onClick={onRedo}>
					<Redo2 size={20} strokeWidth={2.2} />
				</ToolbarButton>

				<div className={floatingDividerClass} />

				<ElementPicker
					isDark={isDark}
					labels={blockTypeLabels}
					value={currentBlockType ?? 'action'}
					variant="toolbar"
					onChange={onSetBlockType}
				/>

				<div className="relative">
					<ToolbarButton
						className={floatingBtnClass}
						title="Text color"
						ariaLabel="Text color"
						onClick={() => {
							setTextColorOpen((open) => !open);
							setHighlightOpen(false);
						}}
					>
						<Type size={20} strokeWidth={2.2} />
					</ToolbarButton>
					{textColorOpen ? <ColorPopover colors={TEXT_COLORS} title="Text color" onSelect={applyTextColor} /> : null}
				</div>

				<div className="relative">
					<ToolbarButton
						className={floatingBtnClass}
						title="Highlight color"
						ariaLabel="Highlight color"
						onClick={() => {
							setHighlightOpen((open) => !open);
							setTextColorOpen(false);
						}}
					>
						<Highlighter size={20} strokeWidth={2.1} />
					</ToolbarButton>
					{highlightOpen ? <ColorPopover colors={HIGHLIGHT_COLORS} title="Highlight" onSelect={applyHighlightColor} /> : null}
				</div>

				<ToolbarButton
					active={dualActive}
					className={`${floatingBtnClass} ${dualActive ? floatingBtnActiveClass : ''}`}
					title="Dual dialogue"
					ariaLabel="Dual dialogue"
					onClick={() => {
						toggleDualDialogue(editor);
						setDualActive(isDualDialogueActive(editor));
					}}
				>
					<Users size={20} strokeWidth={2.1} />
				</ToolbarButton>

				<ToolbarButton className={floatingBtnClass} title="Script note" ariaLabel="Script note" onClick={onOpenScriptNote}>
					<StickyNote size={20} strokeWidth={2.1} />
				</ToolbarButton>

				<div className={floatingDividerClass} />

				<ToolbarButton
					active={editor.isActive('bold')}
					className={`${floatingBtnClass} ${editor.isActive('bold') ? floatingBtnActiveClass : ''}`}
					title="Bold"
					ariaLabel="Bold"
					onClick={onToggleBold}
				>
					<BoldIcon size={18} strokeWidth={2.4} />
				</ToolbarButton>
				<ToolbarButton
					active={editor.isActive('italic')}
					className={`${floatingBtnClass} ${editor.isActive('italic') ? floatingBtnActiveClass : ''}`}
					title="Italic"
					ariaLabel="Italic"
					onClick={onToggleItalic}
				>
					<ItalicIcon size={18} strokeWidth={2.4} />
				</ToolbarButton>
				<ToolbarButton
					active={editor.isActive('underline')}
					className={`${floatingBtnClass} ${editor.isActive('underline') ? floatingBtnActiveClass : ''}`}
					title="Underline"
					ariaLabel="Underline"
					onClick={onToggleUnderline}
				>
					<UnderlineIcon size={18} strokeWidth={2.4} />
				</ToolbarButton>
				<ToolbarButton
					active={editor.isActive('strike')}
					className={`${floatingBtnClass} ${editor.isActive('strike') ? floatingBtnActiveClass : ''}`}
					title="Strikethrough"
					ariaLabel="Strikethrough"
					onClick={onToggleStrike}
				>
					<Strikethrough size={18} strokeWidth={2.4} />
				</ToolbarButton>
			</div>
		</div>
	);
}
