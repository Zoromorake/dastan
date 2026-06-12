import { FileText, FolderPlus, Upload } from 'lucide-react';
import { getHubTheme } from '../../utils/hub-theme';

interface HubWelcomeProps {
  isDark: boolean;
  onNewScript: () => void;
  onNewProject: () => void;
  onImport: (file: File) => void;
}

export function HubWelcome({ isDark, onNewScript, onNewProject, onImport }: HubWelcomeProps) {
  const hub = getHubTheme(isDark);

  return (
    <section className={`rounded-2xl border border-dashed p-8 text-center ${hub.panel}`}>
      <h2 className={`text-xl font-semibold ${hub.panelTitle}`}>Welcome to your library</h2>
      <p className={`mx-auto mt-2 max-w-md text-sm ${hub.panelMuted}`}>
        Start a screenplay, organize projects, or import a Fountain / Final Draft file. Everything stays on this device.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${hub.accentButton}`} type="button" onClick={onNewScript}>
          <FileText size={16} />
          New script
        </button>
        <button className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${hub.ghostButton}`} type="button" onClick={onNewProject}>
          <FolderPlus size={16} />
          New project
        </button>
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${hub.ghostButton}`}>
          <Upload size={16} />
          Import file
          <input
            accept=".fountain,.fdx,.txt,.pdf"
            className="sr-only"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onImport(file);
              }
              event.currentTarget.value = '';
            }}
          />
        </label>
      </div>
    </section>
  );
}
