/**
 * Lightweight hero demo editor — contentEditable blocks + a small state machine.
 *
 * // DECISION: We rejected iframe-embedding the full TipTap app here. The real editor
 * // ships ~500KB+ of JS, fights focus with the landing page, and needs IndexedDB.
 * // A ~10KB island with correct Tab/Enter flow and screenplay margins demonstrates
 * // the product without importing apps/web.
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { KHATAM_PATHS, KHATAM_VIEWBOX } from '../lib/khatam';
import './HeroEditor.css';

type BlockType = 'scene_heading' | 'action' | 'character' | 'dialogue' | 'parenthetical' | 'transition';

interface Block {
	id: string;
	type: BlockType;
	text: string;
}

const CYCLE_ORDER: BlockType[] = [
	'scene_heading',
	'action',
	'character',
	'dialogue',
	'parenthetical',
	'transition',
];

const INITIAL_BLOCKS: Block[] = [
	{ id: '1', type: 'scene_heading', text: 'INT. ROOFTOP GREENHOUSE - NIGHT' },
	{ id: '2', type: 'action', text: 'Rain hammers the glass. A single lamp burns.' },
	{ id: '3', type: 'character', text: 'LENA' },
	{ id: '4', type: 'parenthetical', text: '(checking a gauge)' },
	{ id: '5', type: 'dialogue', text: 'It held through the storm.' },
	{ id: '6', type: 'character', text: 'LENA' },
	{ id: '7', type: 'dialogue', text: 'For one more night.' },
	{ id: '8', type: 'transition', text: 'CUT TO:' },
	{ id: '9', type: 'action', text: '' },
];

function uid(): string {
	return Math.random().toString(36).slice(2, 9);
}

function cycleType(type: BlockType): BlockType {
	const index = CYCLE_ORDER.indexOf(type);
	return CYCLE_ORDER[(index + 1) % CYCLE_ORDER.length];
}

function nextTypeOnEnter(type: BlockType): BlockType {
	switch (type) {
		case 'scene_heading':
			return 'action';
		case 'action':
			return 'character';
		case 'character':
			return 'dialogue';
		case 'dialogue':
			return 'character';
		case 'parenthetical':
			return 'dialogue';
		case 'transition':
			return 'scene_heading';
	}
}

function enforceCase(type: BlockType, text: string): string {
	if (type === 'scene_heading' || type === 'character' || type === 'transition') {
		return text.toUpperCase();
	}

	return text;
}

function isUppercaseType(type: BlockType): boolean {
	return type === 'scene_heading' || type === 'character' || type === 'transition';
}

function KhatamCorner({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox={KHATAM_VIEWBOX} fill="none" aria-hidden="true">
			<path d={KHATAM_PATHS[0]} stroke="currentColor" strokeWidth="0.55" />
			<path d={KHATAM_PATHS[1]} stroke="currentColor" strokeWidth="0.4" />
		</svg>
	);
}

export function HeroEditor() {
	const [blocks, setBlocks] = useState<Block[]>(INITIAL_BLOCKS);
	const [activeId, setActiveId] = useState<string>('9');
	const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});

	const updateBlockText = useCallback((id: string, text: string) => {
		setBlocks((current) =>
			current.map((block) => (block.id === id ? { ...block, text } : block)),
		);
	}, []);

	const focusBlock = useCallback((id: string) => {
		setActiveId(id);
		requestAnimationFrame(() => {
			const node = blockRefs.current[id];

			if (!node) {
				return;
			}

			node.focus();
			const selection = window.getSelection();
			const range = document.createRange();
			range.selectNodeContents(node);
			range.collapse(false);
			selection?.removeAllRanges();
			selection?.addRange(range);
		});
	}, []);

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>, block: Block) => {
		if (event.key === 'Tab') {
			event.preventDefault();
			const nextType = event.shiftKey
				? CYCLE_ORDER[(CYCLE_ORDER.indexOf(block.type) - 1 + CYCLE_ORDER.length) % CYCLE_ORDER.length]
				: cycleType(block.type);

			setBlocks((current) =>
				current.map((entry) =>
					entry.id === block.id
						? { ...entry, type: nextType, text: enforceCase(nextType, entry.text) }
						: entry,
				),
			);
			return;
		}

		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			const nextType = nextTypeOnEnter(block.type);
			const newId = uid();

			setBlocks((current) => {
				const index = current.findIndex((entry) => entry.id === block.id);
				const next = [...current];
				next.splice(index + 1, 0, { id: newId, type: nextType, text: '' });
				return next;
			});
			focusBlock(newId);
		}
	};

	useEffect(() => {
		focusBlock('9');
	}, [focusBlock]);

	return (
		<div className="hero-editor" role="region" aria-label="Try the screenplay editor">
			<div className="hero-editor__page">
				<KhatamCorner className="hero-editor__khatam hero-editor__khatam--tl" />
				<KhatamCorner className="hero-editor__khatam hero-editor__khatam--br" />
				{blocks.map((block) => (
					<div
						key={block.id}
						ref={(node) => {
							blockRefs.current[block.id] = node;
						}}
						className={`hero-editor__block hero-editor__block--${block.type}${
							activeId === block.id ? ' hero-editor__block--active' : ''
						}`}
						contentEditable
						suppressContentEditableWarning
						role="textbox"
						spellCheck={false}
						data-placeholder={block.id === '9' && !block.text ? 'Press Tab. Try it.' : undefined}
						onFocus={() => setActiveId(block.id)}
						onBlur={(event) => {
							const text = event.currentTarget.textContent ?? '';
							updateBlockText(block.id, enforceCase(block.type, text));
						}}
						onInput={(event) => {
							const text = event.currentTarget.textContent ?? '';
							updateBlockText(block.id, isUppercaseType(block.type) ? text.toUpperCase() : text);
						}}
						onKeyDown={(event) => handleKeyDown(event, block)}
					>
						{block.text}
					</div>
				))}
			</div>
			<p className="hero-editor__hint">Tab cycles elements · Enter advances · Courier margins like the real editor</p>
		</div>
	);
}
