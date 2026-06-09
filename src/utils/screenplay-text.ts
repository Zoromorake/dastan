import type { JSONContent } from '@tiptap/core';
import type { ScreenplayBlockType } from '../types';

interface PdfTextItemLike {
  str?: string;
  transform?: number[];
}

function collectText(node: JSONContent | undefined, fragments: string[]): void {
  if (node === undefined) {
    return;
  }

  if (typeof node.text === 'string' && node.text.length > 0) {
    fragments.push(node.text);
  }

  if (Array.isArray(node.content)) {
    for (const childNode of node.content) {
      collectText(childNode, fragments);
    }
  }
}

export function getPlainTextFromContent(content: JSONContent | null): string {
  if (content === null) {
    return '';
  }

  const fragments: string[] = [];
  collectText(content, fragments);
  return fragments.join(' ');
}

export function countWordsFromContent(content: JSONContent | null): number {
  const plainText = getPlainTextFromContent(content).trim();

  if (plainText.length === 0) {
    return 0;
  }

  return plainText.split(/\s+/u).length;
}

export interface SceneHeadingSummary {
  index: number;
  text: string;
}

export function getSceneHeadingsFromContent(content: JSONContent | null): SceneHeadingSummary[] {
  if (content === null || !Array.isArray(content.content)) {
    return [];
  }

  const sceneHeadings: SceneHeadingSummary[] = [];

  for (const [index, node] of content.content.entries()) {
    if (node.type !== 'scene_heading') {
      continue;
    }

    sceneHeadings.push({
      index,
      text: getPlainTextFromContent(node).trim(),
    });
  }

  return sceneHeadings;
}

export interface ScreenplayBlockText {
  type: ScreenplayBlockType;
  text: string;
}

export function getScreenplayBlocksFromContent(content: JSONContent | null): ScreenplayBlockText[] {
  if (content === null || !Array.isArray(content.content)) {
    return [];
  }

  const blocks: ScreenplayBlockText[] = [];

  for (const node of content.content) {
    const type = node.type;

    if (
      type !== 'scene_heading' &&
      type !== 'action' &&
      type !== 'character' &&
      type !== 'dialogue' &&
      type !== 'parenthetical' &&
      type !== 'transition' &&
      type !== 'centered' &&
      type !== 'shot' &&
      type !== 'general' &&
      type !== 'lyrics'
    ) {
      continue;
    }

    blocks.push({
      type,
      text: getPlainTextFromContent(node).trim(),
    });
  }

  return blocks;
}

export function toPlainTextScreenplay(content: JSONContent | null): string {
  return getScreenplayBlocksFromContent(content)
    .map((block) => block.text)
    .join('\n');
}

export function toFountainScreenplay(content: JSONContent | null): string {
  const blocks = getScreenplayBlocksFromContent(content);
  const lines: string[] = [];

  for (const block of blocks) {
    const text = block.text;

    switch (block.type) {
      case 'scene_heading':
        if (lines.length > 0 && lines[lines.length - 1] !== '') {
          lines.push('');
        }
        lines.push(text.toUpperCase());
        break;
      case 'action':
        lines.push(text);
        lines.push('');
        break;
      case 'character':
        lines.push(`${' '.repeat(30)}${text.toUpperCase()}`);
        break;
      case 'dialogue':
        lines.push(`${' '.repeat(15)}${text}`);
        break;
      case 'parenthetical': {
        const normalized = text.replace(/^\((.*)\)$/u, '$1').trim();
        lines.push(`${' '.repeat(20)}(${normalized})`);
        break;
      }
      case 'transition':
        lines.push(`${' '.repeat(50)}${text.toUpperCase()}`);
        break;
      case 'centered':
        lines.push(`${' '.repeat(25)}${text}`);
        break;
      case 'shot':
        lines.push(text.toUpperCase());
        break;
      case 'general':
        lines.push(text);
        break;
      case 'lyrics':
        lines.push(`${' '.repeat(20)}~ ${text} ~`);
        break;
    }
  }

  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines.join('\n');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function screenplayBlockTypeToFdxParagraphType(type: ScreenplayBlockType): string {
  switch (type) {
    case 'scene_heading':
      return 'Scene Heading';
    case 'action':
      return 'Action';
    case 'character':
      return 'Character';
    case 'dialogue':
      return 'Dialogue';
    case 'parenthetical':
      return 'Parenthetical';
    case 'transition':
      return 'Transition';
    case 'centered':
      return 'Centered';
    case 'shot':
      return 'Shot';
    case 'general':
      return 'General';
    case 'lyrics':
      return 'Lyrics';
  }
}

function fdxParagraphTypeToScreenplayBlockType(type: string): ScreenplayBlockType | null {
  const normalized = type.trim().toLowerCase();

  if (normalized === 'scene heading') {
    return 'scene_heading';
  }

  if (normalized === 'action') {
    return 'action';
  }

  if (normalized === 'character') {
    return 'character';
  }

  if (normalized === 'dialogue') {
    return 'dialogue';
  }

  if (normalized === 'parenthetical') {
    return 'parenthetical';
  }

  if (normalized === 'transition') {
    return 'transition';
  }

  if (normalized === 'centered') {
    return 'centered';
  }

  if (normalized === 'shot') {
    return 'shot';
  }

  if (normalized === 'general') {
    return 'general';
  }

  if (normalized === 'lyrics') {
    return 'lyrics';
  }

  return null;
}

export function toFinalDraftScreenplay(content: JSONContent | null, title: string): string {
  const blocks = getScreenplayBlocksFromContent(content);
  const titleText = title.trim() || 'Untitled';
  const paragraphs = blocks
    .map((block) => {
      const paragraphType = screenplayBlockTypeToFdxParagraphType(block.type);
      const paragraphText = escapeXml(block.text);

      return `      <Paragraph Type="${paragraphType}"><Text>${paragraphText}</Text></Paragraph>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="1">
  <Content>
${paragraphs}
  </Content>
  <TitlePage>
    <Content>
      <Paragraph Type="Title"><Text>${escapeXml(titleText)}</Text></Paragraph>
    </Content>
  </TitlePage>
</FinalDraft>`;
}

function parseFdxToContent(source: string): JSONContent {
  if (typeof DOMParser === 'undefined') {
    return parseScreenplayTextToContent(source);
  }

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(source, 'application/xml');
    const parseError = xmlDoc.querySelector('parsererror');

    if (parseError) {
      return parseScreenplayTextToContent(source);
    }

    const paragraphNodes = Array.from(xmlDoc.querySelectorAll('FinalDraft > Content > Paragraph'));
    const blocks: JSONContent[] = [];

    for (const paragraphNode of paragraphNodes) {
      const paragraphType = paragraphNode.getAttribute('Type') ?? '';
      const blockType = fdxParagraphTypeToScreenplayBlockType(paragraphType);

      if (blockType === null) {
        continue;
      }

      const textNodes = Array.from(paragraphNode.querySelectorAll('Text'));
      const text = textNodes.map((node) => node.textContent ?? '').join('').trim();
      blocks.push(createBlockNode(blockType, text));
    }

    if (blocks.length === 0) {
      return parseScreenplayTextToContent(source);
    }

    return {
      type: 'doc',
      content: blocks,
    };
  } catch {
    return parseScreenplayTextToContent(source);
  }
}

export function parseImportedScreenplayFile(fileName: string, source: string): JSONContent {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';

  if (extension === 'fdx') {
    return parseFdxToContent(source);
  }

  return parseScreenplayTextToContent(source);
}

function composePdfLines(items: PdfTextItemLike[]): string[] {
  const positionedItems = items
    .filter((item) => typeof item.str === 'string' && item.str.trim().length > 0 && Array.isArray(item.transform))
    .map((item) => ({
      text: (item.str as string).replace(/\s+/gu, ' ').trim(),
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
    }))
    .sort((left, right) => {
      const yDelta = right.y - left.y;
      if (Math.abs(yDelta) > 0.1) {
        return yDelta;
      }

      return left.x - right.x;
    });

  const lines: string[] = [];
  let currentY: number | null = null;
  let currentLine: Array<{ text: string; x: number }> = [];

  const flushLine = () => {
    if (currentLine.length === 0) {
      return;
    }

    const sortedByX = currentLine.sort((left, right) => left.x - right.x);
    const renderedLine = sortedByX
      .map((segment) => segment.text)
      .join(' ')
      .replace(/\s+/gu, ' ')
      .trim();

    if (renderedLine.length > 0) {
      lines.push(renderedLine);
    }

    currentLine = [];
  };

  for (const item of positionedItems) {
    if (currentY === null || Math.abs(item.y - currentY) <= 2) {
      currentLine.push({ text: item.text, x: item.x });
      currentY = currentY ?? item.y;
      continue;
    }

    flushLine();
    currentLine.push({ text: item.text, x: item.x });
    currentY = item.y;
  }

  flushLine();
  return lines;
}

export async function parseImportedScreenplayPdfFile(source: ArrayBuffer): Promise<JSONContent> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerSource = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
  const bytes = new Uint8Array(source);

  const loadDocument = async (disableWorker: boolean) => {
    if (!disableWorker && pdfjs.GlobalWorkerOptions.workerSrc !== workerSource) {
      pdfjs.GlobalWorkerOptions.workerSrc = workerSource;
    }

    const init = disableWorker
      ? ({ data: bytes, disableWorker: true } as unknown as Record<string, unknown>)
      : ({ data: bytes, useWorkerFetch: false } as unknown as Record<string, unknown>);

    const task = pdfjs.getDocument(init);
    return task.promise;
  };

  let pdfDocument;

  try {
    pdfDocument = await loadDocument(false);
  } catch (workerError) {
    try {
      pdfDocument = await loadDocument(true);
    } catch (fallbackError) {
      const workerMessage = workerError instanceof Error ? workerError.message : String(workerError);
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      throw new Error(`PDF could not be parsed (${workerMessage}; fallback: ${fallbackMessage})`);
    }
  }

  const collectedLines: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageLines = composePdfLines(textContent.items as PdfTextItemLike[]);

    if (pageLines.length > 0) {
      collectedLines.push(...pageLines, '');
    }
  }

  const normalized = collectedLines.join('\n').replace(/\n{3,}/gu, '\n\n').trim();

  if (normalized.length === 0) {
    throw new Error('No extractable text found in this PDF. It may be image-only or encrypted.');
  }

  return parseScreenplayTextToContent(normalized);
}

const supportedImportExtensions = ['fountain', 'txt', 'fdx', 'pdf'];

export function isSupportedScreenplayImport(fileName: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return supportedImportExtensions.includes(extension);
}

function createBlockNode(type: ScreenplayBlockType, text: string): JSONContent {
  if (text.length === 0) {
    return { type };
  }

  return {
    type,
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

function isSceneHeadingLine(line: string): boolean {
  return /^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.)/iu.test(line);
}

function isCharacterLine(line: string, followsBlankLine: boolean): boolean {
  return followsBlankLine && line === line.toUpperCase() && /[A-Z]/u.test(line) && !/[.,!?;:'"()]/u.test(line);
}

function isTransitionLine(line: string): boolean {
  return /TO:$/iu.test(line) || /CUT TO|FADE/iu.test(line);
}

export function parseScreenplayTextToContent(source: string): JSONContent {
  const lines = source.replace(/\r\n?/gu, '\n').split('\n');
  const blocks: JSONContent[] = [];
  let previousWasBlankLine = true;
  let previousBlockType: ScreenplayBlockType | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.length === 0) {
      previousWasBlankLine = true;
      continue;
    }

    let blockType: ScreenplayBlockType;
    let blockText = line;

    if (isSceneHeadingLine(line)) {
      blockType = 'scene_heading';
    } else if (isCharacterLine(line, previousWasBlankLine)) {
      blockType = 'character';
    } else if (
      (previousBlockType === 'character' || previousBlockType === 'parenthetical' || previousBlockType === 'dialogue') &&
      /^\(.*\)$/u.test(line)
    ) {
      blockType = 'parenthetical';
      blockText = line.replace(/^\((.*)\)$/u, '$1').trim();
    } else if (previousBlockType === 'character' || previousBlockType === 'parenthetical' || previousBlockType === 'dialogue') {
      blockType = 'dialogue';
    } else if (isTransitionLine(line)) {
      blockType = 'transition';
    } else {
      blockType = 'action';
    }

    blocks.push(createBlockNode(blockType, blockText));
    previousBlockType = blockType;
    previousWasBlankLine = false;
  }

  return {
    type: 'doc',
    content: blocks.length > 0 ? blocks : [{ type: 'scene_heading' }],
  };
}
