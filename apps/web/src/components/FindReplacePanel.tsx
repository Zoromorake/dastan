import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { findTextMatches, replaceAllMatches, replaceMatch, selectMatch, type TextMatch } from '../utils/find-replace';

interface FindReplacePanelProps {
	open: boolean;
	editor: Editor | null;
	isDark: boolean;
	onClose: () => void;
}

export function FindReplacePanel({ open, editor, isDark, onClose }: FindReplacePanelProps) {
	const findInputRef = useRef<HTMLInputElement>(null);
	const [query, setQuery] = useState('');
	const [replacement, setReplacement] = useState('');
	const [caseSensitive, setCaseSensitive] = useState(false);
	const [showReplace, setShowReplace] = useState(false);
	const [matches, setMatches] = useState<TextMatch[]>([]);
	const [matchIndex, setMatchIndex] = useState(0);

	const refreshMatches = useCallback(
		(nextQuery = query, nextCaseSensitive = caseSensitive) => {
			if (!editor || nextQuery.trim().length === 0) {
				setMatches([]);
				setMatchIndex(0);
				return [];
			}

			const nextMatches = findTextMatches(editor.state.doc, nextQuery, nextCaseSensitive);
			setMatches(nextMatches);
			setMatchIndex(0);

			if (nextMatches.length > 0) {
				selectMatch(editor, nextMatches[0]);
			}

			return nextMatches;
		},
		[caseSensitive, editor, query],
	);

	useEffect(() => {
		if (!open) {
			return;
		}

		findInputRef.current?.focus();
		findInputRef.current?.select();
	}, [open]);

	useEffect(() => {
		if (!open || !editor) {
			return;
		}

		const timer = window.setTimeout(() => {
			refreshMatches();
		}, 150);

		return () => {
			window.clearTimeout(timer);
		};
	}, [editor, open, query, caseSensitive, refreshMatches]);

	const goToMatch = useCallback(
		(index: number) => {
			if (!editor || matches.length === 0) {
				return;
			}

			const normalizedIndex = ((index % matches.length) + matches.length) % matches.length;
			setMatchIndex(normalizedIndex);
			selectMatch(editor, matches[normalizedIndex]);
		},
		[editor, matches],
	);

	const goToNext = useCallback(() => {
		goToMatch(matchIndex + 1);
	}, [goToMatch, matchIndex]);

	const goToPrevious = useCallback(() => {
		goToMatch(matchIndex - 1);
	}, [goToMatch, matchIndex]);

	useEffect(() => {
		if (!open) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				onClose();
				return;
			}

			if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'g') {
				return;
			}

			event.preventDefault();

			if (event.shiftKey) {
				goToPrevious();
			} else {
				goToNext();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [goToNext, goToPrevious, onClose, open]);

	const handleReplace = () => {
		if (!editor || matches.length === 0) {
			return;
		}

		const currentMatch = matches[matchIndex];
		replaceMatch(editor, currentMatch, replacement);

		const nextMatches = findTextMatches(editor.state.doc, query, caseSensitive);
		setMatches(nextMatches);

		if (nextMatches.length === 0) {
			setMatchIndex(0);
			return;
		}

		const nextIndex = Math.min(matchIndex, nextMatches.length - 1);
		setMatchIndex(nextIndex);
		selectMatch(editor, nextMatches[nextIndex]);
	};

	const handleReplaceAll = () => {
		if (!editor || query.trim().length === 0) {
			return;
		}

		replaceAllMatches(editor, query, replacement, caseSensitive);
		setMatches([]);
		setMatchIndex(0);
	};

	if (!open) {
		return null;
	}

	const matchLabel =
		matches.length === 0
			? query.trim().length > 0
				? 'No matches'
				: ''
			: `${matchIndex + 1} of ${matches.length}`;

	const panelClass = isDark
		? 'border-b border-slate-700 bg-slate-800 text-slate-100'
		: 'border-b border-stone-300 bg-[#f3eee4] text-stone-900';
	const inputClass = isDark
		? 'h-8 border-slate-600 bg-slate-900 text-sm text-slate-100 placeholder:text-slate-500'
		: 'h-8 border-stone-300 bg-white text-sm text-stone-900 placeholder:text-stone-400';
	const buttonClass = isDark
		? 'rounded-md border border-slate-600 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-300 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40'
		: 'rounded-md border border-stone-300 bg-white px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-stone-600 transition hover:border-stone-400 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40';
	const mutedClass = isDark ? 'text-slate-400' : 'text-stone-500';

	return (
		<div aria-label="Find and replace" className={`relative z-40 shrink-0 px-4 py-2.5 ${panelClass}`} role="search">
			<div className="flex flex-wrap items-center gap-2">
				<div className="flex min-w-[12rem] flex-1 items-center gap-2">
					<label className={`shrink-0 text-[10px] uppercase tracking-[0.14em] ${mutedClass}`} htmlFor="find-input">
						Find
					</label>
					<Input
						ref={findInputRef}
						aria-label="Find text"
						className={`min-w-0 flex-1 ${inputClass}`}
						id="find-input"
						placeholder="Search script…"
						spellCheck={false}
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();

								if (event.shiftKey) {
									goToPrevious();
								} else {
									goToNext();
								}
							}
						}}
					/>
					{matchLabel ? <span className={`shrink-0 text-xs tabular-nums ${mutedClass}`}>{matchLabel}</span> : null}
				</div>

				<div className="flex items-center gap-1.5">
					<button
						aria-label="Previous match"
						className={buttonClass}
						disabled={matches.length === 0}
						type="button"
						onClick={goToPrevious}
					>
						<ChevronUp aria-hidden size={14} />
					</button>
					<button
						aria-label="Next match"
						className={buttonClass}
						disabled={matches.length === 0}
						type="button"
						onClick={goToNext}
					>
						<ChevronDown aria-hidden size={14} />
					</button>
					<button
						aria-expanded={showReplace}
						className={buttonClass}
						type="button"
						onClick={() => setShowReplace((current) => !current)}
					>
						Replace
					</button>
					<label className={`flex items-center gap-1.5 text-xs ${mutedClass}`}>
						<input
							checked={caseSensitive}
							className="size-3.5 rounded border-border"
							type="checkbox"
							onChange={(event) => setCaseSensitive(event.target.checked)}
						/>
						Match case
					</label>
					<button aria-label="Close find and replace" className={buttonClass} type="button" onClick={onClose}>
						<X aria-hidden size={14} />
					</button>
				</div>
			</div>

			{showReplace ? (
				<div className="mt-2 flex flex-wrap items-center gap-2">
					<div className="flex min-w-[12rem] flex-1 items-center gap-2">
						<label className={`shrink-0 text-[10px] uppercase tracking-[0.14em] ${mutedClass}`} htmlFor="replace-input">
							Replace
						</label>
						<Input
							aria-label="Replace with"
							className={`min-w-0 flex-1 ${inputClass}`}
							id="replace-input"
							placeholder="Replacement text…"
							spellCheck={false}
							value={replacement}
							onChange={(event) => setReplacement(event.target.value)}
						/>
					</div>
					<div className="flex items-center gap-1.5">
						<button className={buttonClass} disabled={matches.length === 0} type="button" onClick={handleReplace}>
							Replace
						</button>
						<button className={buttonClass} disabled={matches.length === 0} type="button" onClick={handleReplaceAll}>
							Replace all
						</button>
					</div>
				</div>
			) : null}
		</div>
	);
}
