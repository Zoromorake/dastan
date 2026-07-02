import { FolderPlus } from 'lucide-react';
import { getHubTheme } from '../../utils/hub-theme';
import { NewScriptMenu } from './NewScriptMenu';
import type { ScriptTemplate } from '../../utils/user-settings';

interface HubWelcomeProps {
  isDark: boolean;
  onStartScratch: () => void;
  onCreateTemplate: (template: ScriptTemplate) => void;
  onImport: (file: File) => void;
  onNewProject: () => void;
}

export function HubWelcome({ isDark, onStartScratch, onCreateTemplate, onImport, onNewProject }: HubWelcomeProps) {
  const hub = getHubTheme(isDark);

  return (
    <section className={`rounded-2xl border border-dashed p-8 text-center ${hub.panel}`}>
      <h2 className={`text-xl font-semibold ${hub.panelTitle}`}>Welcome to your library</h2>
      <p className={`mx-auto mt-2 max-w-md text-sm ${hub.panelMuted}`}>
        Start a screenplay, organize projects, or import a Fountain / Final Draft file. Everything stays on this device.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <NewScriptMenu
          isDark={isDark}
          appearance="primary"
          onStartScratch={onStartScratch}
          onCreateTemplate={onCreateTemplate}
          onImport={onImport}
        />
        <button className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${hub.ghostButton}`} type="button" onClick={onNewProject}>
          <FolderPlus size={16} />
          New project
        </button>
      </div>
    </section>
  );
}
