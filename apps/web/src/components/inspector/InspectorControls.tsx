import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ScreenplayColorSetting } from '../../types';

export const colorSettingOptions: Array<{ value: ScreenplayColorSetting; label: string }> = [
	{ value: 'automatic', label: 'Automatic' },
	{ value: 'black', label: 'Black' },
	{ value: 'blue', label: 'Blue' },
	{ value: 'red', label: 'Red' },
	{ value: 'green', label: 'Green' },
	{ value: 'purple', label: 'Purple' },
	{ value: 'orange', label: 'Orange' },
	{ value: 'gray', label: 'Gray' },
];

interface InspectorRowProps {
	label: string;
	children: ReactNode;
	isDark: boolean;
}

export function InspectorRow({ label, children, isDark }: InspectorRowProps) {
	return (
		<div className={`flex items-center justify-between gap-3 py-2 ${isDark ? 'border-b border-slate-800' : 'border-b border-stone-100'}`}>
			<span className="text-xs">{label}</span>
			<div className="shrink-0">{children}</div>
		</div>
	);
}

interface YesNoToggleProps {
	value: boolean;
	isDark: boolean;
	onChange: (value: boolean) => void;
}

export function YesNoToggle({ value, isDark, onChange }: YesNoToggleProps) {
	const activeClass = isDark ? 'bg-emerald-700/80 text-emerald-50' : 'bg-emerald-600 text-white';
	const inactiveClass = isDark ? 'text-slate-400 hover:text-slate-200' : 'text-stone-500 hover:text-stone-800';

	return (
		<div className={`inline-flex overflow-hidden rounded-md border text-[11px] ${isDark ? 'border-slate-600' : 'border-stone-300'}`}>
			<button
				className={`px-2.5 py-1 transition ${value ? activeClass : inactiveClass}`}
				type="button"
				onClick={() => onChange(true)}
			>
				Yes
			</button>
			<button
				className={`px-2.5 py-1 transition ${!value ? activeClass : inactiveClass}`}
				type="button"
				onClick={() => onChange(false)}
			>
				No
			</button>
		</div>
	);
}

interface CollapsibleSectionProps {
	title: string;
	isDark: boolean;
	defaultOpen?: boolean;
	children: ReactNode;
}

export function CollapsibleSection({ title, isDark, defaultOpen = true, children }: CollapsibleSectionProps) {
	const [open, setOpen] = useState(defaultOpen);
	const borderClass = isDark ? 'border-slate-700' : 'border-stone-300';

	return (
		<section className={`rounded-2xl border ${borderClass} ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
			<button
				className={`flex w-full items-center justify-between px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-muted-foreground' : 'text-muted-foreground'}`}
				type="button"
				onClick={() => setOpen((current) => !current)}
			>
				<span>{title}</span>
				<ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
			</button>
			{open ? <div className="px-4 pb-4">{children}</div> : null}
		</section>
	);
}

interface ColorSettingSelectProps {
	value: ScreenplayColorSetting;
	isDark: boolean;
	selectClass: string;
	onChange: (value: ScreenplayColorSetting) => void;
}

export function ColorSettingSelect({ value, isDark, selectClass, onChange }: ColorSettingSelectProps) {
	return (
		<select className={selectClass} value={value} onChange={(event) => onChange(event.target.value as ScreenplayColorSetting)}>
			{colorSettingOptions.map((option) => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
		</select>
	);
}

interface MarginInchesInputProps {
	value: number;
	isDark: boolean;
	inputClass: string;
	onChange: (value: number) => void;
}

export function MarginInchesInput({ value, isDark, inputClass, onChange }: MarginInchesInputProps) {
	return (
		<input
			className={`${inputClass} w-16 text-right`}
			max={3}
			min={0.25}
			step={0.1}
			type="number"
			value={value}
			onChange={(event) => onChange(Number.parseFloat(event.target.value) || 0)}
		/>
	);
}

interface StyleToggleButtonProps {
	active: boolean;
	isDark: boolean;
	label: string;
	onClick: () => void;
}

export function KeyCap({ children, isDark }: { children: ReactNode; isDark: boolean }) {
	return (
		<span
			className={`inline-flex h-7 min-w-[2.5rem] shrink-0 items-center justify-center rounded-md border px-2 font-mono text-[11px] font-semibold shadow-sm ${
				isDark ? 'border-slate-500 bg-slate-800 text-slate-100' : 'border-stone-300 bg-stone-50 text-stone-800'
			}`}
		>
			{children}
		</span>
	);
}

export function StyleToggleButton({ active, isDark, label, onClick }: StyleToggleButtonProps) {
	return (
		<button
			className={`h-8 min-w-8 rounded-md border px-2 text-xs font-semibold transition ${
				active
					? isDark
						? 'border-emerald-600 bg-emerald-900/50 text-emerald-100'
						: 'border-emerald-500 bg-emerald-50 text-emerald-900'
					: isDark
						? 'border-slate-600 text-slate-300 hover:border-slate-500'
						: 'border-stone-300 text-stone-600 hover:border-stone-400'
			}`}
			type="button"
			onClick={onClick}
		>
			{label}
		</button>
	);
}
