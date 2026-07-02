import { getScreenplayBlocksFromContent, formatBlockTextForExport } from '@dastan/fountain-parser';
import type { ScreenplayBlockType, ScreenplayDocumentRecord } from '@dastan/screenplay-model';
import { normalizeDocumentLayout, renderLayoutTemplate } from '@dastan/screenplay-model/layout';
import { analyzeScreenplayPagination } from './screenplay-pagination';
import { computePaginationBreakAnnotations } from './pagination-break-annotations';

function escapeHtml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function blockClassName(type: ScreenplayBlockType): string {
	return `block block-${type.replace(/_/gu, '-')}`;
}

function buildScriptBody(document: ScreenplayDocumentRecord): string {
	const layout = normalizeDocumentLayout(document.layout);
	const blocks = getScreenplayBlocksFromContent(document.content);
	const annotations = computePaginationBreakAnnotations(
		document.content,
		layout.dialogueBreaks,
		layout.sceneBreaks,
	);
	const annotationsByIndex = new Map(annotations.map((entry) => [entry.blockIndex, entry]));

	return blocks
		.map((block, index) => {
			const parts: string[] = [];
			const annotation = annotationsByIndex.get(index);

			if (annotation?.kind === 'character_continued') {
				parts.push(
					`<p class="block block-character">${escapeHtml(annotation.text.toUpperCase())}</p>`,
				);
			}

			if (annotation?.kind === 'scene_continued_top') {
				parts.push(`<p class="block block-centered">${escapeHtml(annotation.text)}</p>`);
			}

			const text = escapeHtml(formatBlockTextForExport(block.type, block.text)) || '&nbsp;';
			parts.push(`<p class="${blockClassName(block.type)}">${text}</p>`);

			if (annotation?.kind === 'more') {
				parts.push(`<p class="block block-centered">${escapeHtml(annotation.text)}</p>`);
			}

			if (annotation?.kind === 'scene_continued_bottom') {
				parts.push(`<p class="block block-centered">${escapeHtml(annotation.text)}</p>`);
			}

			return parts.join('');
		})
		.join('');
}

function buildPrintableHtml(document: ScreenplayDocumentRecord): string {
	const layout = normalizeDocumentLayout(document.layout);
	const pagination = analyzeScreenplayPagination(document.content);
	const body = buildScriptBody(document);

	const title = document.title.trim() || 'Untitled';
	const header = renderLayoutTemplate(layout.headerText, {
		title,
		page: 1,
		author: layout.authorName,
		date: new Date().toLocaleDateString(),
	});
	const footer = renderLayoutTemplate(layout.footerText, {
		title,
		page: pagination.estimatedPages,
		author: layout.authorName,
		date: new Date().toLocaleDateString(),
	});

	const titlePageTitle = escapeHtml(layout.titlePage.title || title);
	const titlePageAuthor = escapeHtml(layout.titlePage.writtenBy || layout.authorName || 'Author');
	const titlePageEmail = escapeHtml(layout.titlePage.email);
	const titlePagePhone = escapeHtml(layout.titlePage.phone);
	const titlePageDraft = escapeHtml(layout.titlePage.draftDate);
	const contactLines = [titlePageEmail, titlePagePhone].filter((line) => line.length > 0);
	const titlePage = layout.showTitlePage
		? `<section class="title-page">
        <div class="title-page-main">
          <h1>${titlePageTitle}</h1>
          <p class="written-by">written by</p>
          <p class="author">${titlePageAuthor}</p>
        </div>
        ${contactLines.length > 0 ? `<div class="contact">${contactLines.map((line) => `<p>${line}</p>`).join('')}</div>` : ''}
        ${layout.titlePage.draftDate ? `<p class="draft-date">${titlePageDraft}</p>` : ''}
      </section>`
		: '';

	return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { size: letter; margin: 1in 1in 1in 1.5in; }
      body { font-family: "Courier Prime", "Courier New", Courier, monospace; font-size: 12pt; line-height: 1; color: #111; max-width: 6in; margin: 0 auto; }
      .title-page { position: relative; page-break-after: always; min-height: 9in; height: 9in; }
      .title-page-main { position: absolute; top: 3in; left: 0; right: 0; text-align: center; }
      .title-page h1 { font-size: 12pt; font-weight: 400; margin: 0; text-decoration: underline; text-transform: uppercase; }
      .title-page .written-by { margin: 1.5rem 0 0; text-transform: lowercase; }
      .title-page .author { margin: 1rem 0 0; }
      .title-page .contact { position: absolute; bottom: 0; left: 0; margin: 0; padding: 0; text-align: left; max-width: 14rem; }
      .title-page .contact p { margin: 0; line-height: 1.45; }
      .title-page .draft-date { position: absolute; bottom: 0; right: 0; margin: 0; text-align: right; }
      .script-header, .script-footer { font-size: 10pt; text-transform: uppercase; letter-spacing: 0.12em; color: #666; }
      .script-header { margin-bottom: 1rem; }
      .script-footer { margin-top: 1rem; text-align: right; }
      .block { margin: 0; white-space: pre-wrap; }
      .block-scene-heading { margin-top: 1.2rem; text-transform: uppercase; }
      .block-action { margin-top: 0.9rem; }
      .block-character { margin-top: 0.9rem; margin-left: 2.2in; text-transform: uppercase; }
      .block-parenthetical { margin-left: 1.6in; margin-right: 2in; }
      .block-dialogue { margin-left: 1in; margin-right: 1.5in; }
      .block-transition { margin-top: 0.9rem; text-align: right; text-transform: uppercase; }
      .block-centered { margin-top: 0.9rem; text-align: center; text-transform: uppercase; }
      .block-shot { margin-top: 0.9rem; text-transform: uppercase; }
      .block-general { margin-top: 0.9rem; }
      .block-lyrics { margin-left: 1in; margin-right: 1.5in; }
    </style>
  </head>
  <body>
    ${titlePage}
    <div class="script-header">${escapeHtml(header)}</div>
    ${body}
    <div class="script-footer">${escapeHtml(footer)}</div>
  </body>
</html>`;
}

export function exportDocumentToPdf(document: ScreenplayDocumentRecord): void {
	const printableHtml = buildPrintableHtml(document);
	const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200');

	if (!printWindow) {
		throw new Error('Pop-up blocked. Allow pop-ups to export PDF, then try again.');
	}

	printWindow.document.open();
	printWindow.document.write(printableHtml);
	printWindow.document.close();

	printWindow.addEventListener('load', () => {
		printWindow.focus();
		printWindow.print();
	});
}
