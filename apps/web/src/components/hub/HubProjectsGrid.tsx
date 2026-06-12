import type { ScreenplayDocumentRecord, ScreenplayProjectRecord } from '../../types';
import { getHubTheme } from '../../utils/hub-theme';
import { Button } from '@/components/ui/button';
import { ProjectCard } from './ProjectCard';

interface HubProjectsGridProps {
  projects: ScreenplayProjectRecord[];
  documents: ScreenplayDocumentRecord[];
  selectedProjectId: string | null;
  isDark: boolean;
  onCreateProject: () => void;
  onSelectProject: (projectId: string | null) => void;
  onOpenProject: (project: ScreenplayProjectRecord) => void;
  onEditProject: (project: ScreenplayProjectRecord) => void;
  onShareProject: (project: ScreenplayProjectRecord) => void;
  onDeleteProject: (projectId: string) => void;
}

export function HubProjectsGrid({
  projects,
  documents,
  selectedProjectId,
  isDark,
  onCreateProject,
  onSelectProject,
  onOpenProject,
  onEditProject,
  onShareProject,
  onDeleteProject,
}: HubProjectsGridProps) {
  const hub = getHubTheme(isDark);

  return (
    <section className={`pb-6 ${hub.panel}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className={`text-sm font-medium ${hub.panelTitle}`}>Projects</h2>
        <Button size="sm" type="button" variant="outline" onClick={onCreateProject}>
          New project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className={`rounded-xl border border-dashed p-8 text-center ${hub.dashed}`}>
          <p className={`mb-1 text-base font-semibold ${hub.panelTitle}`}>No projects yet</p>
          <p className={`mb-4 text-sm ${hub.panelMuted}`}>Group scripts, notes, and research into a project folder.</p>
          <Button type="button" onClick={onCreateProject}>
            Create project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const projectDocuments = documents.filter((document) => document.projectId === project.id);
            const lastActivity =
              projectDocuments.length > 0
                ? projectDocuments.reduce((latest, document) =>
                    document.updatedAt > latest ? document.updatedAt : latest,
                  projectDocuments[0].updatedAt)
                : project.updatedAt;

            return (
              <ProjectCard
                key={project.id}
                project={project}
                itemCount={projectDocuments.length}
                lastActivity={lastActivity}
                isActive={selectedProjectId === project.id}
                isDark={isDark}
                onSelect={() => onSelectProject(selectedProjectId === project.id ? null : project.id)}
                onOpen={() => onOpenProject(project)}
                onEdit={() => onEditProject(project)}
                onShare={() => onShareProject(project)}
                onDelete={() => onDeleteProject(project.id)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
