import { FileText } from 'lucide-react';
import type { ScreenplayDocumentRecord } from '../../types';
import { formatRelativeDate } from '../../utils/hub-utils';
import { countWordsFromContent } from '../../utils/screenplay-text';
import { getHubTheme } from '../../utils/hub-theme';

interface HubContinueWritingProps {
  documents: ScreenplayDocumentRecord[];
  isDark: boolean;
  onOpenDocument: (id: string) => void;
}

export function HubContinueWriting({ documents, isDark, onOpenDocument }: HubContinueWritingProps) {
  const hub = getHubTheme(isDark);
  const recent = documents.slice(0, 5);

  if (recent.length === 0) {
    return null;
  }

  return (
    <section className={`pb-6 ${hub.panel}`}>
      <h2 className={`mb-3 text-sm font-medium ${hub.panelTitle}`}>Continue writing</h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {recent.map((document) => (
          <button
            key={document.id}
            className={`w-52 shrink-0 rounded-xl border p-3 text-left transition ${hub.card}`}
            type="button"
            onClick={() => onOpenDocument(document.id)}
          >
            <span className="mb-2 inline-flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FileText size={16} strokeWidth={2} />
            </span>
            <p className={`truncate text-sm font-semibold ${hub.panelTitle}`}>{document.title || 'Untitled'}</p>
            <p className={`mt-1 text-xs ${hub.panelMuted}`}>
              {countWordsFromContent(document.content)} words · {formatRelativeDate(document.updatedAt)}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
