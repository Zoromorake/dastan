import { useMemo, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { Download, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getEditorTheme } from '../utils/editor-theme';
import {
	buildCharacterReport,
	buildLocationReport,
	buildSceneReport,
	type CharacterReportRow,
	type LocationReportRow,
	type SceneReportRow,
} from '../utils/production-reports';

type ReportTab = 'scenes' | 'characters' | 'locations';

interface ReportsPanelProps {
	open: boolean;
	content: JSONContent | null;
	documentTitle: string;
	resolvedTheme: 'light' | 'dark';
	onClose: () => void;
}

function toCsv(headers: string[], rows: string[][]): string {
	const escape = (value: string) => `"${value.replace(/"/gu, '""')}"`;
	return [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n');
}

function downloadFile(filename: string, contents: string, mimeType: string) {
	const blob = new Blob([contents], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
}

function buildPrintableHtml(title: string, body: string): string {
	return `<!doctype html><html><head><meta charset="utf-8" /><title>${title}</title>
<style>body{font-family:"Courier Prime",monospace;font-size:12pt;max-width:7in;margin:1in auto;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ccc;padding:6px;text-align:left;} th{background:#f5f5f5;}</style>
</head><body><h1>${title}</h1>${body}</body></html>`;
}

export function ReportsPanel({ open, content, documentTitle, resolvedTheme, onClose }: ReportsPanelProps) {
	const isDark = resolvedTheme === 'dark';
	const theme = getEditorTheme(isDark);
	const [tab, setTab] = useState<ReportTab>('scenes');

	const sceneRows = useMemo(() => buildSceneReport(content), [content]);
	const characterRows = useMemo(() => buildCharacterReport(content), [content]);
	const locationRows = useMemo(() => buildLocationReport(content), [content]);

	const exportCsv = () => {
		if (tab === 'scenes') {
			downloadFile(
				`${documentTitle}-scene-report.csv`,
				toCsv(
					['Scene', 'Heading', 'INT/EXT', 'Day/Night', 'Characters', 'Pages', 'Omitted'],
					sceneRows.map((row) => [
						String(row.sceneNumber),
						row.heading,
						row.intExt,
						row.dayNight,
						row.characters.join('; '),
						String(row.estimatedPages),
						row.omitted ? 'yes' : 'no',
					]),
				),
				'text/csv;charset=utf-8',
			);
			return;
		}

		if (tab === 'characters') {
			downloadFile(
				`${documentTitle}-character-report.csv`,
				toCsv(
					['Character', 'Scenes', 'Dialogue Blocks', 'Words', 'First Scene', 'Last Scene'],
					characterRows.map((row) => [
						row.name,
						String(row.sceneCount),
						String(row.dialogueBlocks),
						String(row.wordCount),
						String(row.firstScene),
						String(row.lastScene),
					]),
				),
				'text/csv;charset=utf-8',
			);
			return;
		}

		downloadFile(
			`${documentTitle}-location-report.csv`,
			toCsv(
				['Location', 'Scenes'],
				locationRows.map((row) => [row.location, String(row.sceneCount)]),
			),
			'text/csv;charset=utf-8',
		);
	};

	const printReport = () => {
		const tableForScenes = `<table><thead><tr><th>#</th><th>Heading</th><th>INT/EXT</th><th>Day/Night</th><th>Characters</th><th>Pages</th></tr></thead><tbody>${sceneRows
			.filter((row) => !row.omitted)
			.map(
				(row) =>
					`<tr><td>${row.sceneNumber}</td><td>${row.heading}</td><td>${row.intExt}</td><td>${row.dayNight}</td><td>${row.characters.join(', ')}</td><td>${row.estimatedPages}</td></tr>`,
			)
			.join('')}</tbody></table>`;
		const html = buildPrintableHtml(`${documentTitle} — Production Report`, tableForScenes);
		const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200');

		if (!printWindow) {
			return;
		}

		printWindow.document.write(html);
		printWindow.document.close();
		printWindow.focus();
		printWindow.print();
	};

	const empty = sceneRows.length === 0;

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
			<DialogContent className={`max-h-[85vh] max-w-3xl overflow-hidden ${theme.surface}`}>
				<DialogHeader>
					<DialogTitle>Production Reports</DialogTitle>
				</DialogHeader>

				<div className="flex flex-wrap gap-2">
					{(['scenes', 'characters', 'locations'] as ReportTab[]).map((entry) => (
						<button
							key={entry}
							type="button"
							className={`rounded-md border px-3 py-1 text-xs capitalize ${tab === entry ? theme.accentPill : theme.statusPill}`}
							onClick={() => setTab(entry)}
						>
							{entry}
						</button>
					))}
					<div className="ml-auto flex gap-2">
						<Button type="button" size="sm" variant="outline" onClick={exportCsv} disabled={empty}>
							<Download className="mr-1 size-3.5" />
							CSV
						</Button>
						<Button type="button" size="sm" variant="outline" onClick={printReport} disabled={empty}>
							<Printer className="mr-1 size-3.5" />
							Print
						</Button>
					</div>
				</div>

				<div className={`mt-3 max-h-[55vh] overflow-auto rounded-lg border ${theme.border}`}>
					{empty ? (
						<p className={`p-4 text-sm ${theme.statusText}`}>Add scene headings to generate reports.</p>
					) : tab === 'scenes' ? (
						<SceneTable rows={sceneRows} theme={theme} />
					) : tab === 'characters' ? (
						<CharacterTable rows={characterRows} theme={theme} />
					) : (
						<LocationTable rows={locationRows} theme={theme} />
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

function SceneTable({ rows, theme }: { rows: SceneReportRow[]; theme: ReturnType<typeof getEditorTheme> }) {
	return (
		<table className="w-full text-left text-xs">
			<thead className={theme.statusPill}>
				<tr>
					<th className="px-3 py-2">#</th>
					<th className="px-3 py-2">Heading</th>
					<th className="px-3 py-2">INT/EXT</th>
					<th className="px-3 py-2">Characters</th>
					<th className="px-3 py-2">Pages</th>
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => (
					<tr key={row.sceneNumber} className={`border-t ${theme.border}`}>
						<td className="px-3 py-2">{row.sceneNumber}</td>
						<td className="px-3 py-2">{row.omitted ? 'OMITTED' : row.heading}</td>
						<td className="px-3 py-2">{row.intExt}</td>
						<td className="px-3 py-2">{row.characters.join(', ')}</td>
						<td className="px-3 py-2">{row.estimatedPages}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

function CharacterTable({ rows, theme }: { rows: CharacterReportRow[]; theme: ReturnType<typeof getEditorTheme> }) {
	return (
		<table className="w-full text-left text-xs">
			<thead className={theme.statusPill}>
				<tr>
					<th className="px-3 py-2">Character</th>
					<th className="px-3 py-2">Scenes</th>
					<th className="px-3 py-2">Dialogue</th>
					<th className="px-3 py-2">Words</th>
					<th className="px-3 py-2">First/Last</th>
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => (
					<tr key={row.name} className={`border-t ${theme.border}`}>
						<td className="px-3 py-2">{row.name}</td>
						<td className="px-3 py-2">{row.sceneCount}</td>
						<td className="px-3 py-2">{row.dialogueBlocks}</td>
						<td className="px-3 py-2">{row.wordCount}</td>
						<td className="px-3 py-2">
							{row.firstScene}/{row.lastScene}
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

function LocationTable({ rows, theme }: { rows: LocationReportRow[]; theme: ReturnType<typeof getEditorTheme> }) {
	return (
		<table className="w-full text-left text-xs">
			<thead className={theme.statusPill}>
				<tr>
					<th className="px-3 py-2">Location</th>
					<th className="px-3 py-2">Scenes</th>
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => (
					<tr key={row.location} className={`border-t ${theme.border}`}>
						<td className="px-3 py-2">{row.location}</td>
						<td className="px-3 py-2">{row.sceneCount}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
