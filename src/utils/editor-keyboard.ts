import type { Editor } from '@tiptap/react';
import { SCREENPLAY_BLOCK_TYPES, type ScreenplayBlockType } from '../types';
import {
	blockTypeForShortcut,
	getCurrentBlockText,
	getEditorBlockType,
	isBlockShortcut,
	replaceCurrentBlockText,
	setBlockType,
	splitToBlockType,
} from '../editor/commands';
import {
	advanceSceneHeadingOnTab,
	canonicalizeSceneHeadingIntro,
	hasStartedSceneHeading,
	isSceneHeadingReadyForAction,
} from './scene-heading-tab';
import {
	applySmartTypeSelection,
	extractSmartTypeSuggestions,
	getPrimarySmartTypeSuggestion,
	type SmartTypeBlockType,
	type SmartTypeSourceData,
	type SmartTypeSuggestions,
} from './smarttype';

const ALT_ELEMENT_SHORTCUTS: Partial<Record<string, ScreenplayBlockType>> = {
	s: 'scene_heading',
	a: 'action',
	c: 'character',
	p: 'parenthetical',
	d: 'dialogue',
	t: 'transition',
	g: 'general',
};

export interface SmartTypeKeyboardContext {
	blockType: ScreenplayBlockType | null;
	query: string;
	suggestions: SmartTypeSuggestions;
	source: SmartTypeSourceData;
	highlightIndex: number;
	onHighlightIndexChange: (index: number) => void;
}

export interface EmptyElementMenuContext {
	open: boolean;
	highlightIndex: number;
	onOpen: () => void;
	onClose: () => void;
	onHighlightIndexChange: (index: number) => void;
	onSelect: (blockType: ScreenplayBlockType) => void;
}

export interface EditorKeyboardContext {
	smartType: SmartTypeKeyboardContext;
	emptyElementMenu: EmptyElementMenuContext;
}

function isSmartTypeBlockType(blockType: ScreenplayBlockType | null): blockType is SmartTypeBlockType {
	return blockType === 'character' || blockType === 'scene_heading' || blockType === 'transition';
}

function isCurrentBlockEmpty(editor: Editor): boolean {
	return getCurrentBlockText(editor).trim().length === 0;
}

function shortcutKey(event: KeyboardEvent): string | null {
	if (isBlockShortcut(event.key)) {
		return event.key;
	}

	const digit = event.code.replace(/^Digit/u, '').replace(/^Numpad/u, '');

	if (isBlockShortcut(digit)) {
		return digit;
	}

	return null;
}

export function handleElementShortcut(editor: Editor, event: KeyboardEvent): boolean {
	if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) {
		return false;
	}

	const key = shortcutKey(event);

	if (!key || !editor.isFocused) {
		return false;
	}

	event.preventDefault();
	return setBlockType(editor, blockTypeForShortcut(key as '1'));
}

function handleAltElementShortcut(editor: Editor, event: KeyboardEvent): boolean {
	if (!event.altKey || event.metaKey || event.ctrlKey || event.shiftKey || !editor.isFocused) {
		return false;
	}

	const blockType = ALT_ELEMENT_SHORTCUTS[event.key.toLowerCase()];

	if (!blockType) {
		return false;
	}

	event.preventDefault();
	return setBlockType(editor, blockType);
}

function applyHighlightedSuggestion(
	editor: Editor,
	blockType: SmartTypeBlockType,
	query: string,
	suggestions: SmartTypeSuggestions,
	highlightIndex: number,
): boolean {
	const item = suggestions.items[highlightIndex] ?? getPrimarySmartTypeSuggestion(suggestions);

	if (!item) {
		return false;
	}

	const nextText = applySmartTypeSelection(blockType, query, item.value, item.group);
	return replaceCurrentBlockText(editor, nextText);
}

function moveHighlight(
	itemCount: number,
	currentIndex: number,
	direction: 1 | -1,
	onHighlightIndexChange: (index: number) => void,
): boolean {
	if (itemCount === 0) {
		return false;
	}

	const nextIndex = (currentIndex + direction + itemCount) % itemCount;
	onHighlightIndexChange(nextIndex);
	return true;
}

function handleSceneHeadingTab(editor: Editor, query: string): boolean {
	if (isSceneHeadingReadyForAction(query)) {
		return splitToBlockType(editor, 'action');
	}

	if (!hasStartedSceneHeading(query)) {
		return false;
	}

	const advance = advanceSceneHeadingOnTab(query);

	if (advance.kind === 'action') {
		return splitToBlockType(editor, 'action');
	}

	return replaceCurrentBlockText(editor, advance.text, advance.cursor);
}

function handleActionSceneHeadingShortcut(editor: Editor): boolean {
	const text = getCurrentBlockText(editor).trim();
	const canonical = canonicalizeSceneHeadingIntro(text);

	if (!canonical || /\s/u.test(text)) {
		return false;
	}

	if (!setBlockType(editor, 'scene_heading')) {
		return false;
	}

	return replaceCurrentBlockText(editor, canonical);
}

function handleEmptyElementMenuKeyboard(editor: Editor, event: KeyboardEvent, menu: EmptyElementMenuContext): boolean {
	if (event.key === 'Escape' && menu.open) {
		event.preventDefault();
		menu.onClose();
		return true;
	}

	if (!menu.open) {
		if (event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey && isCurrentBlockEmpty(editor)) {
			event.preventDefault();
			menu.onOpen();
			return true;
		}

		return false;
	}

	if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
		if (
			moveHighlight(
				SCREENPLAY_BLOCK_TYPES.length,
				menu.highlightIndex,
				event.key === 'ArrowDown' ? 1 : -1,
				menu.onHighlightIndexChange,
			)
		) {
			event.preventDefault();
			return true;
		}
	}

	if (event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
		const blockType = SCREENPLAY_BLOCK_TYPES[menu.highlightIndex];

		if (blockType) {
			event.preventDefault();
			menu.onSelect(blockType);
			menu.onClose();
			return true;
		}
	}

	menu.onClose();
	return false;
}

function handleSmartTypeKeyboard(editor: Editor, event: KeyboardEvent, context: SmartTypeKeyboardContext): boolean {
	const blockType = context.blockType ?? getEditorBlockType(editor);

	if (!isSmartTypeBlockType(blockType)) {
		return false;
	}

	const query = context.query || getCurrentBlockText(editor);
	const suggestions =
		context.suggestions.items.length > 0
			? context.suggestions
			: extractSmartTypeSuggestions(context.source, query, blockType);

	if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !event.metaKey && !event.ctrlKey) {
		if (
			moveHighlight(
				suggestions.items.length,
				context.highlightIndex,
				event.key === 'ArrowDown' ? 1 : -1,
				context.onHighlightIndexChange,
			)
		) {
			event.preventDefault();
			return true;
		}

		return false;
	}

	if (event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
		if (blockType === 'scene_heading' && isSceneHeadingReadyForAction(query)) {
			return false;
		}

		if (suggestions.items.length > 0) {
			event.preventDefault();
			return applyHighlightedSuggestion(editor, blockType, query, suggestions, context.highlightIndex);
		}

		return false;
	}

	if (event.key !== 'Tab' || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) {
		return false;
	}

	if (blockType === 'scene_heading') {
		if (handleSceneHeadingTab(editor, query)) {
			event.preventDefault();
			return true;
		}
	}

	return false;
}

export function handleEditorSmartKeyboard(editor: Editor, event: KeyboardEvent, context: EditorKeyboardContext): boolean {
	if (handleAltElementShortcut(editor, event)) {
		return true;
	}

	const blockType = context.smartType.blockType ?? getEditorBlockType(editor);

	if (event.key === ' ' && blockType === 'action' && !event.metaKey && !event.ctrlKey) {
		if (handleActionSceneHeadingShortcut(editor)) {
			event.preventDefault();
			return true;
		}
	}

	if (handleEmptyElementMenuKeyboard(editor, event, context.emptyElementMenu)) {
		return true;
	}

	if (context.emptyElementMenu.open) {
		return true;
	}

	return handleSmartTypeKeyboard(editor, event, context.smartType);
}
