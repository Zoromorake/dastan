import { useState } from 'react';
import type { CodexDomain, CodexItem, CodexScope, CodexStyle, CodexType } from '../../utils/codex-storage';
import {
	APPLIES_WHEN_CRAFT_MOMENT,
	APPLIES_WHEN_SCENE_TEXTURE,
	labelAppliesWhen,
	normalizeAppliesWhenTag,
} from '../../utils/codex-applies-when';

export interface CodexFormState {
	type: CodexType;
	title: string;
	content: string;
	scope: CodexScope;
	projectId?: string;
	documentId?: string;
	tags: string;
	pinned: boolean;
	source: string;
	domain: CodexDomain;
	appliesWhen: string[];
	instinct: string;
	rationale: string;
	exemplars: string;
}

export function emptyCodexForm(defaults?: Partial<CodexFormState>): CodexFormState {
	return {
		type: 'style',
		title: '',
		content: '',
		scope: 'global',
		tags: '',
		pinned: false,
		source: '',
		domain: 'visual',
		appliesWhen: [],
		instinct: '',
		rationale: '',
		exemplars: '',
		...defaults,
	};
}

export function formFromCodexItem(item: CodexItem): CodexFormState {
	if (item.type === 'style') {
		return {
			type: 'style',
			title: item.title,
			content: item.content,
			scope: item.scope,
			projectId: item.projectId,
			documentId: item.documentId,
			tags: item.tags.join(', '),
			pinned: item.pinned,
			source: '',
			domain: item.domain,
			appliesWhen: [...item.appliesWhen],
			instinct: item.instinct,
			rationale: item.rationale ?? '',
			exemplars: (item.exemplars ?? []).join(', '),
		};
	}

	return {
		type: 'reference',
		title: item.title,
		content: item.content,
		scope: item.scope,
		projectId: item.projectId,
		documentId: item.documentId,
		tags: item.tags.join(', '),
		pinned: item.pinned,
		source: item.source ?? '',
		domain: 'visual',
		appliesWhen: [],
		instinct: '',
		rationale: '',
		exemplars: '',
	};
}

export function parseTagList(raw: string): string[] {
	return raw
		.split(/[,;\n]/)
		.map((tag) => tag.trim())
		.filter(Boolean);
}

const DOMAINS: CodexDomain[] = ['visual', 'structural', 'tonal', 'dialogue', 'character', 'other'];

interface CodexEditorFormProps {
	value: CodexFormState;
	onChange: (next: CodexFormState) => void;
	inputClass: string;
	labelClass: string;
	chipClass: string;
	chipActiveClass: string;
	showTypeToggle?: boolean;
	scopeOptions?: CodexScope[];
	projectOptions?: Array<{ id: string; title: string }>;
	documentLabel?: string;
}

export function CodexEditorForm({
	value,
	onChange,
	inputClass,
	labelClass,
	chipClass,
	chipActiveClass,
	showTypeToggle = true,
	scopeOptions = ['global', 'project', 'document'],
	projectOptions = [],
	documentLabel = 'This script',
}: CodexEditorFormProps) {
	const [customWhen, setCustomWhen] = useState('');

	const toggleWhen = (tag: string) => {
		const normalized = normalizeAppliesWhenTag(tag);
		const has = value.appliesWhen.includes(normalized);
		onChange({
			...value,
			appliesWhen: has
				? value.appliesWhen.filter((t) => t !== normalized)
				: [...value.appliesWhen, normalized],
		});
	};

	const addCustomWhen = () => {
		const normalized = normalizeAppliesWhenTag(customWhen);
		if (!normalized) {
			return;
		}
		if (!value.appliesWhen.includes(normalized)) {
			onChange({ ...value, appliesWhen: [...value.appliesWhen, normalized] });
		}
		setCustomWhen('');
	};

	return (
		<div className="space-y-3">
			{showTypeToggle ? (
				<div>
					<p className={labelClass}>Type</p>
					<div className="mt-1 flex gap-2">
						{(['style', 'reference'] as const).map((type) => (
							<button
								key={type}
								className={value.type === type ? chipActiveClass : chipClass}
								type="button"
								onClick={() => onChange({ ...value, type })}
							>
								{type === 'style' ? 'Style' : 'Reference'}
							</button>
						))}
					</div>
				</div>
			) : null}

			<label className="block">
				<span className={labelClass}>Title</span>
				<input
					className={`mt-1 w-full ${inputClass}`}
					value={value.title}
					placeholder={value.type === 'style' ? 'Optional title' : 'Note title'}
					onChange={(event) => onChange({ ...value, title: event.target.value })}
				/>
			</label>

			<div>
				<p className={labelClass}>Scope</p>
				<div className="mt-1 flex flex-wrap gap-2">
					{scopeOptions.map((scope) => (
						<button
							key={scope}
							className={value.scope === scope ? chipActiveClass : chipClass}
							type="button"
							onClick={() => onChange({ ...value, scope })}
						>
							{scope === 'global' ? 'Global' : scope === 'project' ? 'Project' : documentLabel}
						</button>
					))}
				</div>
			</div>

			{value.scope === 'project' && projectOptions.length > 0 ? (
				<label className="block">
					<span className={labelClass}>Project</span>
					<select
						className={`mt-1 w-full ${inputClass}`}
						value={value.projectId ?? ''}
						onChange={(event) => onChange({ ...value, projectId: event.target.value || undefined })}
					>
						<option value="">Select project…</option>
						{projectOptions.map((project) => (
							<option key={project.id} value={project.id}>
								{project.title || 'Untitled project'}
							</option>
						))}
					</select>
				</label>
			) : null}

			<label className="flex items-center gap-2 text-sm">
				<input
					checked={value.pinned}
					type="checkbox"
					onChange={(event) => onChange({ ...value, pinned: event.target.checked })}
				/>
				<span>Pin — always include in AI context</span>
			</label>

			{value.type === 'style' ? (
				<>
					<div>
						<p className={labelClass}>Domain</p>
						<div className="mt-1 flex flex-wrap gap-2">
							{DOMAINS.map((domain) => (
								<button
									key={domain}
									className={value.domain === domain ? chipActiveClass : chipClass}
									type="button"
									onClick={() => onChange({ ...value, domain })}
								>
									{domain}
								</button>
							))}
						</div>
					</div>

					<div>
						<p className={labelClass}>Applies when</p>
						<div className="mt-1 flex flex-wrap gap-1.5">
							{[...APPLIES_WHEN_SCENE_TEXTURE, ...APPLIES_WHEN_CRAFT_MOMENT].map((tag) => (
								<button
									key={tag}
									className={value.appliesWhen.includes(tag) ? chipActiveClass : chipClass}
									type="button"
									onClick={() => toggleWhen(tag)}
								>
									{labelAppliesWhen(tag)}
								</button>
							))}
						</div>
						<div className="mt-2 flex gap-2">
							<input
								className={`min-w-0 flex-1 ${inputClass}`}
								placeholder="Custom tag…"
								value={customWhen}
								onChange={(event) => setCustomWhen(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault();
										addCustomWhen();
									}
								}}
							/>
							<button className={chipClass} type="button" onClick={addCustomWhen}>
								Add
							</button>
						</div>
						{value.appliesWhen.some((tag) => !(APPLIES_WHEN_SCENE_TEXTURE as readonly string[]).includes(tag) && !(APPLIES_WHEN_CRAFT_MOMENT as readonly string[]).includes(tag)) ? (
							<p className="mt-1 text-xs text-muted-foreground">
								Custom: {value.appliesWhen.filter((tag) => !(APPLIES_WHEN_SCENE_TEXTURE as readonly string[]).includes(tag) && !(APPLIES_WHEN_CRAFT_MOMENT as readonly string[]).includes(tag)).join(', ')}
							</p>
						) : null}
					</div>

					<label className="block">
						<span className={labelClass}>Instinct (required)</span>
						<textarea
							className={`mt-1 min-h-20 w-full resize-y ${inputClass}`}
							placeholder="Prefer tactile/practical approach when emotion or physicality carries the scene"
							value={value.instinct}
							onChange={(event) => onChange({ ...value, instinct: event.target.value })}
						/>
					</label>

					<label className="block">
						<span className={labelClass}>Why (rationale)</span>
						<textarea
							className={`mt-1 min-h-16 w-full resize-y ${inputClass}`}
							placeholder="Weight and realism ground stakes (Del Toro, Nolan)"
							value={value.rationale}
							onChange={(event) => onChange({ ...value, rationale: event.target.value })}
						/>
					</label>

					<label className="block">
						<span className={labelClass}>Exemplars</span>
						<input
							className={`mt-1 w-full ${inputClass}`}
							placeholder="Pacific Rim kaiju weight, Rogue One Death Star"
							value={value.exemplars}
							onChange={(event) => onChange({ ...value, exemplars: event.target.value })}
						/>
					</label>
				</>
			) : (
				<>
					<label className="block">
						<span className={labelClass}>Source</span>
						<input
							className={`mt-1 w-full ${inputClass}`}
							placeholder="Save the Cat, Ch. 4"
							value={value.source}
							onChange={(event) => onChange({ ...value, source: event.target.value })}
						/>
					</label>

					<label className="block">
						<span className={labelClass}>Content</span>
						<textarea
							className={`mt-1 min-h-40 w-full resize-y font-mono text-xs ${inputClass}`}
							placeholder="Paste craft notes or markdown…"
							value={value.content}
							onChange={(event) => onChange({ ...value, content: event.target.value })}
						/>
					</label>
				</>
			)}

			<label className="block">
				<span className={labelClass}>Tags</span>
				<input
					className={`mt-1 w-full ${inputClass}`}
					placeholder="midpoint, structure, craft"
					value={value.tags}
					onChange={(event) => onChange({ ...value, tags: event.target.value })}
				/>
			</label>

			{value.type === 'style' ? (
				<label className="block">
					<span className={labelClass}>Expanded notes (optional)</span>
					<textarea
						className={`mt-1 min-h-16 w-full resize-y ${inputClass}`}
						value={value.content}
						onChange={(event) => onChange({ ...value, content: event.target.value })}
					/>
				</label>
			) : null}
		</div>
	);
}

export function stylePreviewLine(item: CodexStyle): string {
	return item.instinct;
}
