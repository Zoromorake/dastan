import type { ScreenplayDocumentLayout } from '../types';
import { inchesToPx } from '../utils/screenplay-page';
import { renderLayoutTemplate } from '../utils/screenplay-layout';
import { SCRIPT_PAGE_WIDTH_PX, SCRIPT_PAGE_HEIGHT_PX } from '../utils/screenplay-page-constants';

interface ScriptPageChromeProps {
	layout: ScreenplayDocumentLayout;
	pageNumber: number;
	scriptPageIndex: number;
	documentTitle: string;
	isDark: boolean;
}

function shouldShowHeader(layout: ScreenplayDocumentLayout, scriptPageIndex: number): boolean {
	const { headerFooter } = layout;

	if (scriptPageIndex === 0) {
		return headerFooter.showHeaderOnFirstPage;
	}

	return headerFooter.showHeader;
}

function shouldShowFooter(layout: ScreenplayDocumentLayout, scriptPageIndex: number): boolean {
	const { headerFooter } = layout;

	if (scriptPageIndex === 0) {
		return headerFooter.showFooterOnFirstPage;
	}

	return headerFooter.showFooter;
}

export function ScriptPageChrome({ layout, pageNumber, scriptPageIndex, documentTitle, isDark }: ScriptPageChromeProps) {
	const showHeader = shouldShowHeader(layout, scriptPageIndex);
	const showFooter = shouldShowFooter(layout, scriptPageIndex);

	if (!showHeader && !showFooter) {
		return null;
	}

	const headerTop = inchesToPx(layout.headerFooterMargins.headerTop);
	const footerBottom = inchesToPx(layout.headerFooterMargins.footerBottom);
	const textClass = isDark ? 'text-slate-400' : 'text-stone-500';

	const values = {
		title: documentTitle.trim() || 'Untitled',
		page: pageNumber,
		author: layout.authorName,
		date: new Date().toLocaleDateString(),
	};

	return (
		<div
			className="pointer-events-none absolute inset-0 z-20"
			style={{ width: SCRIPT_PAGE_WIDTH_PX, height: SCRIPT_PAGE_HEIGHT_PX }}
		>
			{showHeader ? (
				<div
					className={`absolute right-0 left-0 px-6 text-right font-mono text-[10pt] uppercase tracking-[0.12em] ${textClass}`}
					style={{ top: headerTop }}
				>
					{renderLayoutTemplate(layout.headerText, values)}
				</div>
			) : null}
			{showFooter ? (
				<div
					className={`absolute right-0 left-0 px-6 text-right font-mono text-[10pt] uppercase tracking-[0.12em] ${textClass}`}
					style={{ bottom: footerBottom }}
				>
					{renderLayoutTemplate(layout.footerText, values)}
				</div>
			) : null}
		</div>
	);
}
