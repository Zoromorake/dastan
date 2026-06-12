import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ScreenplayDocumentRecord, ScreenplayProjectRecord } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { MoveToProjectDialog } from './MoveToProjectDialog';
import { ProjectInfoDialog } from './ProjectInfoDialog';
import { PromptDialog } from './PromptDialog';
import { ShareDialog } from './ShareDialog';
import { UserSettingsPanel } from './UserSettingsPanel';
import type { UserThemeSetting } from './UserSettingsPanel';
import { HubContinueWriting } from './hub/HubContinueWriting';
import { HubWelcome } from './hub/HubWelcome';
import { HubProjectsGrid } from './hub/HubProjectsGrid';
import { HubQuickActions } from './hub/HubQuickActions';
import { HubScriptsPanel } from './hub/HubScriptsPanel';
import { HubSharedPanel, HubLoadingSkeleton, HubTrashPanel } from './hub/HubSectionPanels';
import { HubShell } from './hub/HubShell';
import type { FileViewMode, HubSection, ScriptFilter } from './hub/types';
import { loadPenName, loadProfileImage } from '../utils/hub-utils';
import { getRecentDocuments } from '../utils/recent-documents';
import {
  createDocument,
  createProject,
  createTemplateScreenplayContent,
  deleteProject,
  getActiveDocuments,
  getAllProjects,
  getTrashedDocuments,
  moveDocumentToProject,
  permanentlyDeleteDocument,
  purgeExpiredTrash,
  renameDocument,
  restoreDocument,
  softDeleteDocument,
  updateProject,
} from '../utils/screenplay-storage';
import { getShareContacts, type ShareContact } from '../utils/share-contacts';
import { getSharedScripts, removeSharedScript, type SharedScriptEntry } from '../utils/shared-library';
import { isSupportedScreenplayImport, parseImportedScreenplayFile, parseImportedScreenplayPdfFile } from '../utils/screenplay-text';

interface MainHubDashboardProps {
  onOpenDocument: (id: string) => void;
  theme: UserThemeSetting;
  resolvedTheme: 'light' | 'dark';
  onThemeChange: (theme: UserThemeSetting) => void;
  initialProjectId?: string | null;
}

export function MainHubDashboard({
  onOpenDocument,
  theme,
  resolvedTheme,
  onThemeChange,
  initialProjectId = null,
}: MainHubDashboardProps) {
  const [documents, setDocuments] = useState<ScreenplayDocumentRecord[]>([]);
  const [trashedDocuments, setTrashedDocuments] = useState<ScreenplayDocumentRecord[]>([]);
  const [projects, setProjects] = useState<ScreenplayProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [activeSection, setActiveSection] = useState<HubSection>('library');
  const [fileViewMode, setFileViewMode] = useState<FileViewMode>('list');
  const [scriptFilter, setScriptFilter] = useState<ScriptFilter>(initialProjectId ?? 'all');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'profile' | 'preferences' | 'notifications' | 'addressBook' | undefined>(undefined);
  const [projectShareOpen, setProjectShareOpen] = useState(false);
  const [shareProject, setShareProject] = useState<ScreenplayProjectRecord | null>(null);
  const [documentShareOpen, setDocumentShareOpen] = useState(false);
  const [shareDocumentId, setShareDocumentId] = useState<string | undefined>(undefined);
  const [shareDocumentTitle, setShareDocumentTitle] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId);
  const [projectInfoProject, setProjectInfoProject] = useState<ScreenplayProjectRecord | null>(null);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveDocumentId, setMoveDocumentId] = useState<string | null>(null);
  const [penName, setPenName] = useState(() => loadPenName());
  const [profileImageDataUrl, setProfileImageDataUrl] = useState<string | null>(() => loadProfileImage());
  const [sharedEntries, setSharedEntries] = useState<SharedScriptEntry[]>(() => getSharedScripts());
  const [shareContacts, setShareContacts] = useState<ShareContact[]>(() => getShareContacts());
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
  } | null>(null);
  const [promptDialog, setPromptDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    label?: string;
    defaultValue?: string;
    confirmLabel?: string;
    onConfirm: (value: string) => void;
  } | null>(null);

  const isDark = resolvedTheme === 'dark';

  const refreshDocuments = useCallback(async () => {
    const nextDocuments = await getActiveDocuments();
    setDocuments(nextDocuments);
    return nextDocuments;
  }, []);

  const refreshTrash = useCallback(async () => {
    const nextTrashedDocuments = await getTrashedDocuments();
    setTrashedDocuments(nextTrashedDocuments);
    return nextTrashedDocuments;
  }, []);

  const refreshProjects = useCallback(async () => {
    const nextProjects = await getAllProjects();
    setProjects(nextProjects);
    return nextProjects;
  }, []);

  const refreshAll = useCallback(async () => {
    const [nextDocuments, nextTrashedDocuments, nextProjects] = await Promise.all([
      refreshDocuments(),
      refreshTrash(),
      refreshProjects(),
    ]);

    setPenName(loadPenName());
    setProfileImageDataUrl(loadProfileImage());
    setSharedEntries(getSharedScripts());
    setShareContacts(getShareContacts());
    return { nextDocuments, nextTrashedDocuments, nextProjects };
  }, [refreshDocuments, refreshProjects, refreshTrash]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        await purgeExpiredTrash();

        if (!active) {
          return;
        }

        await refreshAll();
      } catch (error) {
        console.error('Failed to load library', error);

        if (active) {
          setLoadError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [refreshAll]);

  useEffect(() => {
    if (initialProjectId) {
      setSelectedProjectId(initialProjectId);
      setScriptFilter(initialProjectId);
      setActiveSection('library');
      return;
    }

    setSelectedProjectId(null);
    setScriptFilter('all');
  }, [initialProjectId]);

  const filteredProjects = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (query.length === 0) {
      return projects;
    }

    return projects.filter((project) => {
      const haystack = [project.title, project.genre, project.logline].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [projects, searchValue]);

  const filteredDocuments = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    let scoped = documents;

    if (scriptFilter === 'unfiled') {
      scoped = documents.filter((document) => !document.projectId);
    } else if (scriptFilter !== 'all') {
      scoped = documents.filter((document) => document.projectId === scriptFilter);
    }

    if (query.length === 0) {
      return scoped;
    }

    return scoped.filter((document) => document.title.toLowerCase().includes(query));
  }, [documents, scriptFilter, searchValue]);

  const continueWritingDocuments = useMemo(
    () => getRecentDocuments(documents, 5),
    [documents],
  );

  const filteredTrashDocuments = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (query.length === 0) {
      return trashedDocuments;
    }

    return trashedDocuments.filter((document) => document.title.toLowerCase().includes(query));
  }, [searchValue, trashedDocuments]);

  const moveDocument = useMemo(
    () => documents.find((document) => document.id === moveDocumentId) ?? null,
    [documents, moveDocumentId],
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  useEffect(() => {
    if (selectedProjectId === null) {
      return;
    }

    if (!projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(null);

      if (scriptFilter === selectedProjectId) {
        setScriptFilter('all');
      }
    }
  }, [projects, scriptFilter, selectedProjectId]);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSettingsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [settingsOpen]);

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  const closePromptDialog = useCallback(() => {
    setPromptDialog(null);
  }, []);

  const showAlert = useCallback((title: string, description: string) => {
    setConfirmDialog({
      open: true,
      title,
      description,
      confirmLabel: 'OK',
      onConfirm: () => {
        setConfirmDialog(null);
      },
    });
  }, []);

  const resolveProjectId = useCallback(
    (projectId?: string) => projectId ?? (scriptFilter !== 'all' && scriptFilter !== 'unfiled' ? scriptFilter : selectedProjectId ?? undefined),
    [scriptFilter, selectedProjectId],
  );

  const handleCreateBlankFile = useCallback(
    async (projectId?: string) => {
      const createdDocument = await createDocument('Untitled', undefined, resolveProjectId(projectId));
      await refreshAll();
      onOpenDocument(createdDocument.id);
    },
    [onOpenDocument, refreshAll, resolveProjectId],
  );

  const handleCreateTemplate = useCallback(
    async (template: 'feature' | 'short' | 'tv', projectId?: string) => {
      const templateTitle = template === 'feature' ? 'Feature Draft' : template === 'short' ? 'Short Film Draft' : 'TV Episode Draft';
      const createdDocument = await createDocument(templateTitle, createTemplateScreenplayContent(template), resolveProjectId(projectId));
      await refreshAll();
      onOpenDocument(createdDocument.id);
    },
    [onOpenDocument, refreshAll, resolveProjectId],
  );

  const openCreateProjectPrompt = useCallback(() => {
    setPromptDialog({
      open: true,
      title: 'Create project',
      description: 'Name your new project folder.',
      label: 'Project name',
      defaultValue: 'Untitled Project',
      confirmLabel: 'Create',
      onConfirm: (title) => {
        if (!title) {
          return;
        }

        void (async () => {
          const createdProject = await createProject(title);
          await refreshProjects();
          setSelectedProjectId(createdProject.id);
          setScriptFilter(createdProject.id);
          setProjectInfoProject(createdProject);
        })();

        setPromptDialog(null);
      },
    });
  }, [refreshProjects]);

  const handleSaveProjectInfo = useCallback(
    async (updates: Pick<ScreenplayProjectRecord, 'title' | 'genre' | 'logline' | 'synopsis' | 'coverImageDataUrl'>) => {
      if (!projectInfoProject) {
        return;
      }

      await updateProject(projectInfoProject.id, updates);
      await refreshProjects();
      setProjectInfoProject(null);
    },
    [projectInfoProject, refreshProjects],
  );

  const handleUploadFile = useCallback(
    async (file: File, projectId?: string) => {
      if (!isSupportedScreenplayImport(file.name)) {
        showAlert('Unsupported file type', 'Import supports .fountain, .fdx, .txt, and .pdf files.');
        return;
      }

      const title = file.name.replace(/\.[^.]+$/u, '').trim() || 'Imported Script';
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

      let content;

      try {
        if (extension === 'pdf') {
          const sourceBuffer = await file.arrayBuffer();
          content = await parseImportedScreenplayPdfFile(sourceBuffer);
        } else {
          const sourceText = await file.text();
          content = parseImportedScreenplayFile(file.name, sourceText);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not parse this file.';
        showAlert('Import failed', `${message} Try exporting it as .fdx or .fountain and importing again.`);
        return;
      }

      const createdDocument = await createDocument(title, content, resolveProjectId(projectId));

      await refreshAll();
      onOpenDocument(createdDocument.id);
    },
    [onOpenDocument, refreshAll, resolveProjectId, showAlert],
  );

  const handleOpenProject = useCallback(
    async (project: ScreenplayProjectRecord) => {
      const firstDocument = documents.find((document) => document.projectId === project.id);

      if (firstDocument) {
        onOpenDocument(firstDocument.id);
        return;
      }

      const createdDocument = await createDocument('Untitled', undefined, project.id);
      await refreshAll();
      onOpenDocument(createdDocument.id);
    },
    [documents, onOpenDocument, refreshAll],
  );

  const handleSoftDelete = useCallback(
    (id: string) => {
      const documentToDelete = documents.find((document) => document.id === id);
      const label = documentToDelete?.title || 'Untitled';

      setConfirmDialog({
        open: true,
        title: 'Move to trash',
        description: `Move "${label}" to trash? You can restore it within 30 days.`,
        confirmLabel: 'Move to trash',
        destructive: true,
        onConfirm: () => {
          void (async () => {
            await softDeleteDocument(id);
            await refreshAll();
            setConfirmDialog(null);
          })();
        },
      });
    },
    [documents, refreshAll],
  );

  const handleDeleteProject = useCallback(
    (id: string) => {
      const projectToDelete = projects.find((project) => project.id === id);
      const label = projectToDelete?.title || 'Untitled Project';

      setConfirmDialog({
        open: true,
        title: 'Delete project',
        description: `Delete "${label}"? Scripts inside will remain in your library without a project.`,
        confirmLabel: 'Delete project',
        destructive: true,
        onConfirm: () => {
          void (async () => {
            await deleteProject(id);

            if (selectedProjectId === id) {
              setSelectedProjectId(null);
            }

            if (scriptFilter === id) {
              setScriptFilter('all');
            }

            await refreshAll();
            setConfirmDialog(null);
          })();
        },
      });
    },
    [projects, refreshAll, scriptFilter, selectedProjectId],
  );

  const handleRestoreDocument = useCallback(
    async (id: string) => {
      await restoreDocument(id);
      await refreshAll();
    },
    [refreshAll],
  );

  const handlePermanentDelete = useCallback(
    (id: string) => {
      const documentToDelete = trashedDocuments.find((document) => document.id === id);
      const label = documentToDelete?.title || 'Untitled';

      setConfirmDialog({
        open: true,
        title: 'Delete forever',
        description: `Permanently delete "${label}"? This cannot be undone.`,
        confirmLabel: 'Delete forever',
        destructive: true,
        onConfirm: () => {
          void (async () => {
            await permanentlyDeleteDocument(id);
            await refreshAll();
            setConfirmDialog(null);
          })();
        },
      });
    },
    [refreshAll, trashedDocuments],
  );

  const startDocumentRename = useCallback((document: ScreenplayDocumentRecord) => {
    setEditingDocumentId(document.id);
    setEditingTitle(document.title || 'Untitled');
  }, []);

  const commitDocumentRename = useCallback(
    async (documentId: string) => {
      const nextTitle = editingTitle.trim();

      setEditingDocumentId(null);
      setEditingTitle('');

      if (!nextTitle) {
        return;
      }

      const currentDocument = documents.find((document) => document.id === documentId);

      if (!currentDocument || currentDocument.title === nextTitle) {
        return;
      }

      await renameDocument(documentId, nextTitle);
      await refreshDocuments();
    },
    [documents, editingTitle, refreshDocuments],
  );

  const cancelDocumentRename = useCallback(() => {
    setEditingDocumentId(null);
    setEditingTitle('');
  }, []);

  const openMoveDialog = useCallback((documentId: string) => {
    setMoveDocumentId(documentId);
    setMoveDialogOpen(true);
  }, []);

  const handleMoveDocument = useCallback(
    async (projectId: string | null) => {
      if (!moveDocumentId) {
        return;
      }

      await moveDocumentToProject(moveDocumentId, projectId);
      await refreshAll();
      setMoveDialogOpen(false);
      setMoveDocumentId(null);
    },
    [moveDocumentId, refreshAll],
  );

  const openDocumentShare = useCallback((document: ScreenplayDocumentRecord) => {
    setShareDocumentId(document.id);
    setShareDocumentTitle(document.title || 'Untitled');
    setDocumentShareOpen(true);
  }, []);

  const handleSelectProject = useCallback((projectId: string | null) => {
    setSelectedProjectId(projectId);
    setScriptFilter(projectId ?? 'all');
  }, []);

  const openSettings = useCallback(() => {
    setSettingsInitialTab(undefined);
    setSettingsOpen(true);
  }, []);

  if (loading) {
    return <HubLoadingSkeleton isDark={isDark} />;
  }

  if (loadError) {
    return (
      <div className={`flex h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground ${isDark ? 'dark' : ''}`}>
        <p className="text-base font-medium">Couldn't load your library</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your browser's local storage may be unavailable. Try reloading the page.
        </p>
        <button
          className="mt-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm transition hover:bg-accent"
          type="button"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    );
  }

  return (
    <>
      <HubShell
        isDark={isDark}
        activeSection={activeSection}
        trashedCount={trashedDocuments.length}
        penName={penName}
        profileImageDataUrl={profileImageDataUrl}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSectionChange={setActiveSection}
        onOpenSettings={openSettings}
      >
        {activeSection === 'library' ? (
          <div className="space-y-2">
            {documents.length === 0 && projects.length === 0 ? (
              <HubWelcome
                isDark={isDark}
                onNewScript={() => {
                  void handleCreateBlankFile();
                }}
                onNewProject={openCreateProjectPrompt}
                onImport={(file) => {
                  void handleUploadFile(file);
                }}
              />
            ) : null}

            <HubQuickActions
              isDark={isDark}
              onNewScript={() => {
                void handleCreateBlankFile();
              }}
              onNewProject={openCreateProjectPrompt}
              onImport={(file) => {
                void handleUploadFile(file);
              }}
              onCreateTemplate={(template) => {
                void handleCreateTemplate(template);
              }}
            />

            <HubContinueWriting documents={continueWritingDocuments} isDark={isDark} onOpenDocument={onOpenDocument} />

            <HubProjectsGrid
              projects={filteredProjects}
              documents={documents}
              selectedProjectId={selectedProjectId}
              isDark={isDark}
              onCreateProject={openCreateProjectPrompt}
              onSelectProject={handleSelectProject}
              onOpenProject={(project) => {
                void handleOpenProject(project);
              }}
              onEditProject={setProjectInfoProject}
              onShareProject={(project) => {
                setShareProject(project);
                setProjectShareOpen(true);
              }}
              onDeleteProject={handleDeleteProject}
            />

            <HubScriptsPanel
              documents={filteredDocuments}
              projects={projects}
              scriptFilter={scriptFilter}
              fileViewMode={fileViewMode}
              selectedProject={selectedProject}
              isDark={isDark}
              editingDocumentId={editingDocumentId}
              editingTitle={editingTitle}
              onScriptFilterChange={setScriptFilter}
              onFileViewModeChange={setFileViewMode}
              onOpenCreateMenu={openCreateProjectPrompt}
              onCreateScript={() => {
                void handleCreateBlankFile();
              }}
              onOpenDocument={onOpenDocument}
              onStartRename={startDocumentRename}
              onCommitRename={commitDocumentRename}
              onCancelRename={cancelDocumentRename}
              onEditingTitleChange={setEditingTitle}
              onMove={openMoveDialog}
              onShare={openDocumentShare}
              onDelete={handleSoftDelete}
            />
          </div>
        ) : activeSection === 'shared' ? (
          <HubSharedPanel
            sharedEntries={sharedEntries}
            documents={documents}
            contacts={shareContacts}
            isDark={isDark}
            onOpenDocument={onOpenDocument}
            onRemoveShared={(documentId) => {
              setSharedEntries(removeSharedScript(documentId));
            }}
            onOpenAddressBook={() => {
              setSettingsInitialTab('addressBook');
              setSettingsOpen(true);
            }}
          />
        ) : (
          <HubTrashPanel
            documents={filteredTrashDocuments}
            isDark={isDark}
            onRestore={handleRestoreDocument}
            onDeleteForever={handlePermanentDelete}
          />
        )}
      </HubShell>

      {settingsOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/30 px-4 py-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSettingsOpen(false);
            }
          }}
        >
          <UserSettingsPanel
            theme={theme}
            resolvedTheme={resolvedTheme}
            onThemeChange={onThemeChange}
            initialTab={settingsInitialTab}
            onClose={() => {
              setSettingsOpen(false);
              setSettingsInitialTab(undefined);
              setPenName(loadPenName());
              setProfileImageDataUrl(loadProfileImage());
            }}
          />
        </div>
      ) : null}

      <ShareDialog
        open={projectShareOpen && shareProject !== null}
        title={shareProject?.title || 'Untitled Project'}
        onClose={() => {
          setProjectShareOpen(false);
          setShareProject(null);
        }}
        onOpenAddressBook={() => {
          setProjectShareOpen(false);
          setShareProject(null);
          setSettingsInitialTab('addressBook');
          setSettingsOpen(true);
        }}
      />

      <ShareDialog
        open={documentShareOpen}
        title={shareDocumentTitle}
        documentId={shareDocumentId}
        onClose={() => {
          setDocumentShareOpen(false);
          setShareDocumentId(undefined);
          setShareDocumentTitle('');
        }}
        onShared={() => {
          setSharedEntries(getSharedScripts());
        }}
        onOpenAddressBook={() => {
          setDocumentShareOpen(false);
          setSettingsInitialTab('addressBook');
          setSettingsOpen(true);
        }}
      />

      <MoveToProjectDialog
        open={moveDialogOpen && moveDocument !== null}
        documentTitle={moveDocument?.title || 'Untitled'}
        projects={projects}
        currentProjectId={moveDocument?.projectId}
        onMove={(projectId) => {
          void handleMoveDocument(projectId);
        }}
        onClose={() => {
          setMoveDialogOpen(false);
          setMoveDocumentId(null);
        }}
      />

      {confirmDialog ? (
        <ConfirmDialog
          open={confirmDialog.open}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          destructive={confirmDialog.destructive}
          onConfirm={confirmDialog.onConfirm}
          onCancel={closeConfirmDialog}
        />
      ) : null}

      {promptDialog ? (
        <PromptDialog
          open={promptDialog.open}
          title={promptDialog.title}
          description={promptDialog.description}
          label={promptDialog.label}
          defaultValue={promptDialog.defaultValue}
          confirmLabel={promptDialog.confirmLabel}
          onConfirm={promptDialog.onConfirm}
          onCancel={closePromptDialog}
        />
      ) : null}

      <ProjectInfoDialog
        open={projectInfoProject !== null}
        project={projectInfoProject}
        onClose={() => setProjectInfoProject(null)}
        onSave={(updates) => {
          void handleSaveProjectInfo(updates);
        }}
      />
    </>
  );
}
