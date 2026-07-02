import type { ScreenplayDocumentRecord, ScreenplayProjectRecord } from '../../types';
import { countDocumentsInProjectTree, getChildProjects } from '../../utils/hub-folder-utils';
import { getHubTheme } from '../../utils/hub-theme';
import { Button } from '@/components/ui/button';
import { ProjectCard } from './ProjectCard';

interface HubProjectsGridProps {
  title: string;
  projects: ScreenplayProjectRecord[];
  documents: ScreenplayDocumentRecord[];
  allProjects: ScreenplayProjectRecord[];
  isDark: boolean;
  isSubfolderView?: boolean;
  createLabel: string;
  selectedLibraryProjectId: string | null;
  onSelectLibraryProject: (projectId: string) => void;
  onCreateProject: () => void;
  onOpenProjectFolder: (projectId: string) => void;
  onEditProject: (project: ScreenplayProjectRecord) => void;
  onShareProject: (project: ScreenplayProjectRecord) => void;
  onDuplicateProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
}

export function HubProjectsGrid({
  title,
  projects,
  documents,
  allProjects,
  isDark,
  isSubfolderView = false,
  createLabel,
  selectedLibraryProjectId,
  onSelectLibraryProject,
  onCreateProject,
  onOpenProjectFolder,
  onEditProject,
  onShareProject,
  onDuplicateProject,
  onDeleteProject,
}: HubProjectsGridProps) {
  const hub = getHubTheme(isDark);

  return (
    <section className={`pb-6 ${hub.panel}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className={`text-sm font-medium ${hub.panelTitle}`}>{title}</h2>
        <Button size="sm" type="button" variant="outline" onClick={onCreateProject}>
          {createLabel}
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className={`rounded-xl border border-dashed px-6 py-8 text-center ${hub.dashed}`}>
          <p className={`text-sm ${hub.panelMuted}`}>
            {isSubfolderView ? 'No subfolders yet.' : 'No projects yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const itemCount = countDocumentsInProjectTree(documents, allProjects, project.id);
            const subfolderCount = getChildProjects(allProjects, project.id).length;
            const projectDocuments = documents.filter((document) => document.projectId === project.id);
            const lastActivity =
              projectDocuments.length > 0
                ? projectDocuments.reduce(
                    (latest, document) => (document.updatedAt > latest ? document.updatedAt : latest),
                    projectDocuments[0].updatedAt,
                  )
                : project.updatedAt;

            return (
              <ProjectCard
                key={project.id}
                project={project}
                itemCount={itemCount}
                subfolderCount={subfolderCount}
                lastActivity={lastActivity}
                isDark={isDark}
                isSelected={selectedLibraryProjectId === project.id}
                onSelect={() => onSelectLibraryProject(project.id)}
                onOpenFolder={() => onOpenProjectFolder(project.id)}
                onEdit={() => onEditProject(project)}
                onShare={() => onShareProject(project)}
                onDuplicate={() => onDuplicateProject(project.id)}
                onDelete={() => onDeleteProject(project.id)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
