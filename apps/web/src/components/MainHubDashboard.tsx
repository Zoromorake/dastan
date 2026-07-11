import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScreenplayDocumentRecord, ScreenplayProjectRecord } from '../types';
import { MoveToProjectDialog } from './MoveToProjectDialog';
import { ProjectInfoDialog } from './ProjectInfoDialog';
import { PromptDialog } from './PromptDialog';
import { ShareDialog } from './ShareDialog';
import { UserSettingsPanel } from './UserSettingsPanel';
import type { UserThemeSetting } from './UserSettingsPanel';
import { AiChatPanel } from './ai/AiChatPanel';
import { ErrorBoundary } from './ErrorBoundary';
import { HubWelcome } from './hub/HubWelcome';
import { NewScriptMenu } from './hub/NewScriptMenu';
import { HubFolderHeader } from './hub/HubFolderHeader';
import { HubSlateView } from './hub/HubSlateView';
import { HubFilePreviewDialog } from './hub/HubFilePreviewDialog';
import { downloadHubFile, canPreviewHubFile, isHubScript } from '../utils/hub-item-kind';
import { HubSharedPanel, HubTrashPanel } from './hub/HubSectionPanels';
import { HubCodexPanel } from './hub/HubCodexPanel';
import { HubShell } from './hub/HubShell';
import type { FileViewMode, HubSection } from './hub/types';
import { CodexCaptureModal, useCodexCaptureHotkey } from './codex/CodexCaptureModal';
import { loadPenName, loadProfileImage } from '../utils/hub-utils';
import { loadHubFileViewMode, setHubFileViewMode } from '../utils/user-settings';
import { getShareContacts, type ShareContact } from '../utils/share-contacts';
import { getSharedScripts, removeSharedScript, type SharedScriptEntry } from '../utils/shared-library';
import { useHubData } from '../hooks/useHubData';
import { useHubDialogs } from '../hooks/useHubDialogs';
import { ConfirmDialog } from './ConfirmDialog';
import { CommandPalette, useCommandPaletteHotkey, type CommandPaletteItem } from './CommandPalette';
import { HubSweepNotice } from './hub/HubSweepNotice';
import { HubBackupNudge } from './hub/HubBackupNudge';
import { restoreDocument } from '../utils/screenplay-storage';
import { ShortcutsModal, hubShortcutGroups } from './ShortcutsModal';
import { dismissBackupNudge, shouldShowBackupNudge } from '../utils/backup-nudge';

interface MainHubDashboardProps {
  onOpenDocument: (id: string) => void;
  onNavigateToProject?: (projectId: string | null) => void;
  theme: UserThemeSetting;
  resolvedTheme: 'light' | 'dark';
  onThemeChange: (theme: UserThemeSetting) => void;
  initialProjectId?: string | null;
}

export function MainHubDashboard({
  onOpenDocument,
  onNavigateToProject,
  theme,
  resolvedTheme,
  onThemeChange,
  initialProjectId = null,
}: MainHubDashboardProps) {
  const [searchValue, setSearchValue] = useState('');
  const [activeSection, setActiveSection] = useState<HubSection>('library');
  const [fileViewMode, setFileViewMode] = useState<FileViewMode>(() => loadHubFileViewMode());
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId);
  const [selectedLibraryProjectId, setSelectedLibraryProjectId] = useState<string | null>(null);
  const [selectedLibraryDocumentId, setSelectedLibraryDocumentId] = useState<string | null>(null);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [penName, setPenName] = useState(() => loadPenName());
  const [profileImageDataUrl, setProfileImageDataUrl] = useState<string | null>(() => loadProfileImage());
  const [sharedEntries, setSharedEntries] = useState<SharedScriptEntry[]>(() => getSharedScripts());
  const [shareContacts, setShareContacts] = useState<ShareContact[]>(() => getShareContacts());
  const [sweptDocuments, setSweptDocuments] = useState<ScreenplayDocumentRecord[]>([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [codexCaptureOpen, setCodexCaptureOpen] = useState(false);
  const [previewHubFile, setPreviewHubFile] = useState<ScreenplayDocumentRecord | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [backupNudgeVisible, setBackupNudgeVisible] = useState(false);

  const isDark = resolvedTheme === 'dark';
  const refreshProjectsRef = useRef<() => Promise<ScreenplayProjectRecord[]>>(async () => []);

  const openFolder = useCallback(
    (projectId: string | null) => {
      setSelectedProjectId(projectId);
      setSelectedLibraryProjectId(null);
      setSelectedLibraryDocumentId(null);
      onNavigateToProject?.(projectId);
    },
    [onNavigateToProject],
  );

  const hubDialogs = useHubDialogs({
    selectedProjectId,
    refreshProjects: () => refreshProjectsRef.current(),
    openFolder,
  });

  const cancelDocumentRename = useCallback(() => {
    setEditingDocumentId(null);
    setEditingTitle('');
  }, []);

  const handleOpenDocumentFromHub = useCallback(
    (documentId: string, options?: { blockIndex?: number }) => {
      setSelectedLibraryProjectId(null);
      setSelectedLibraryDocumentId(null);

      if (typeof options?.blockIndex === 'number') {
        sessionStorage.setItem(`dastan.resume.${documentId}`, String(options.blockIndex));
      }

      onOpenDocument(documentId);
    },
    [onOpenDocument],
  );

  const handleOpenHubFile = useCallback((document: ScreenplayDocumentRecord) => {
    if (canPreviewHubFile(document)) {
      setPreviewHubFile(document);
      return;
    }

    downloadHubFile(document);
  }, []);

  const handleAfterRefresh = useCallback(() => {
    setPenName(loadPenName());
    setProfileImageDataUrl(loadProfileImage());
    setSharedEntries(getSharedScripts());
    setShareContacts(getShareContacts());
  }, []);

  const handleSweep = useCallback((documents: ScreenplayDocumentRecord[]) => {
    setSweptDocuments(documents);
  }, []);

  const hubData = useHubData({
    selectedProjectId,
    searchValue,
    editingDocumentId,
    editingTitle,
    onOpenDocument: handleOpenDocumentFromHub,
    onNavigateToProject,
    openFolder,
    showAlert: hubDialogs.showAlert,
    openConfirmDialog: hubDialogs.openConfirmDialog,
    closeConfirmDialog: hubDialogs.closeConfirmDialog,
    moveDocumentId: hubDialogs.moveDocumentId,
    closeMoveDialog: hubDialogs.closeMoveDialog,
    projectInfoProject: hubDialogs.projectInfoProject,
    clearProjectInfo: hubDialogs.clearProjectInfo,
    clearEditing: cancelDocumentRename,
    onAfterRefresh: handleAfterRefresh,
    onSweep: handleSweep,
  });

  refreshProjectsRef.current = hubData.refreshProjects;

  const {
    documents,
    trashedDocuments,
    trashedProjects,
    projects,
    loading,
    loadError,
    handleCreateScratch,
    handleStartGuide,
    handleCreateTemplate,
    handleUploadFile,
    handleSoftDelete,
    handleDeleteProject,
    handleDuplicateDocument,
    handleDuplicateProject,
    handleRestoreDocument,
    handleRestoreProject,
    handlePermanentDelete,
    handlePermanentDeleteProject,
    commitDocumentRename,
    updateDocumentPoster,
    handleAddHubFile,
    handleMoveDocument,
    handleSaveProjectInfo,
    moveDocument,
    selectedProject,
    filteredDocuments,
    filteredTrashDocuments,
    filteredTrashProjects,
    visibleProjects,
    selectedFolderStats,
    libraryBreadcrumbs,
    getDocumentLocationLabel,
  } = hubData;

  const handleAddHubFiles = useCallback(
    (files: File[]) => {
      for (const file of files) {
        void handleAddHubFile(file);
      }
    },
    [handleAddHubFile],
  );

  const {
    confirmDialog,
    promptDialog,
    projectInfoProject,
    moveDialogOpen,
    settingsOpen,
    settingsInitialTab,
    chatOpen,
    projectShareOpen,
    shareProject,
    documentShareOpen,
    shareDocumentId,
    shareDocumentTitle,
    setProjectInfoProject,
    setShareProject,
    setProjectShareOpen,
    setDocumentShareOpen,
    setShareDocumentId,
    setShareDocumentTitle,
    setChatOpen,
    setSettingsOpen,
    setSettingsInitialTab,
    openCreateProjectPrompt,
    openMoveDialog,
    openDocumentShare,
    openSettings,
    closeConfirmDialog,
    closePromptDialog,
    closeMoveDialog,
  } = hubDialogs;

  useCommandPaletteHotkey(() => setCommandPaletteOpen(true));
  useCodexCaptureHotkey(() => setCodexCaptureOpen(true));

  const commandPaletteItems: CommandPaletteItem[] = [
    ...filteredDocuments.filter(isHubScript).map((document) => ({
      id: `open-${document.id}`,
      label: `Open ${document.title || 'Untitled'}`,
      keywords: document.title,
      group: 'Scripts',
      run: () => handleOpenDocumentFromHub(document.id),
    })),
    {
      id: 'new-script',
      label: 'New script',
      group: 'Commands',
      run: () => {
        void handleCreateScratch();
      },
    },
    {
      id: 'start-guide',
      label: 'Start with a guide',
      group: 'Commands',
      run: () => {
        void handleStartGuide();
      },
    },
    {
      id: 'open-codex',
      label: 'Open Codex',
      keywords: 'notes style reference',
      group: 'Commands',
      run: () => setActiveSection('codex'),
    },
    {
      id: 'codex-capture',
      label: 'Capture to Codex',
      keywords: 'note style cmd+shift+n',
      group: 'Commands',
      run: () => setCodexCaptureOpen(true),
    },
    {
      id: 'open-settings',
      label: 'Open settings',
      group: 'Commands',
      run: () => {
        setSettingsInitialTab('preferences');
        openSettings();
      },
    },
    {
      id: 'open-trash',
      label: 'Open trash',
      group: 'Commands',
      run: () => setActiveSection('trash'),
    },
  ];

  useEffect(() => {
    setSelectedProjectId(initialProjectId ?? null);

    if (initialProjectId) {
      setActiveSection('library');
    }
  }, [initialProjectId]);

  useEffect(() => {
    if (selectedProjectId === null) {
      return;
    }

    if (!projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(null);
      onNavigateToProject?.(null);
    }
  }, [onNavigateToProject, projects, selectedProjectId]);

  const selectLibraryProject = useCallback((projectId: string) => {
    setSelectedLibraryProjectId(projectId);
    setSelectedLibraryDocumentId(null);
  }, []);

  const selectLibraryDocument = useCallback((documentId: string) => {
    setSelectedLibraryDocumentId(documentId);
    setSelectedLibraryProjectId(null);
  }, []);

  const handleFileViewModeChange = useCallback((mode: FileViewMode) => {
    setFileViewMode(mode);
    setHubFileViewMode(mode);
  }, []);

  const startDocumentRename = useCallback((document: ScreenplayDocumentRecord) => {
    setEditingDocumentId(document.id);
    setEditingTitle(document.title || 'Untitled');
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;

      if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === ',') {
        event.preventDefault();
        openSettings();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        setChatOpen((current) => !current);
        return;
      }

      if (event.key === '?' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openSettings, setChatOpen]);

  useEffect(() => {
    setBackupNudgeVisible(shouldShowBackupNudge(documents.length > 0));
  }, [documents.length]);

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
      <div className={`flex h-screen overflow-hidden bg-background text-foreground ${isDark ? 'dark' : ''}`}>
        <HubShell
          isDark={isDark}
          activeSection={activeSection}
          trashedCount={trashedDocuments.length + trashedProjects.length}
          penName={penName}
          profileImageDataUrl={profileImageDataUrl}
          searchValue={searchValue}
          breadcrumbs={activeSection === 'library' ? libraryBreadcrumbs : []}
          chatOpen={chatOpen}
          onSearchChange={setSearchValue}
          onSectionChange={setActiveSection}
          onOpenSettings={openSettings}
          onToggleChat={() => setChatOpen((current) => !current)}
          headerActions={
            activeSection === 'library' ? (
              <NewScriptMenu
                isDark={isDark}
                size="sm"
                appearance="outline"
                onStartScratch={() => {
                  void handleCreateScratch();
                }}
                onStartGuide={() => {
                  void handleStartGuide();
                }}
                onCreateTemplate={(template) => {
                  void handleCreateTemplate(template);
                }}
                onImport={(file) => {
                  void handleUploadFile(file);
                }}
              />
            ) : null
          }
        >
        {loading ? (
          <div className="space-y-4 py-2">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="h-24 animate-pulse rounded-xl bg-muted" />
              <div className="h-24 animate-pulse rounded-xl bg-muted" />
              <div className="h-24 animate-pulse rounded-xl bg-muted" />
            </div>
          </div>
        ) : activeSection === 'library' ? (
          <div className="space-y-6">
            <HubSweepNotice
              count={sweptDocuments.length}
              isDark={isDark}
              onDismiss={() => setSweptDocuments([])}
              onUndo={() => {
                void (async () => {
                  for (const document of sweptDocuments) {
                    await restoreDocument(document.id);
                  }
                  setSweptDocuments([]);
                  await hubData.refreshAll();
                })();
              }}
            />
            {backupNudgeVisible ? (
              <HubBackupNudge
                isDark={isDark}
                onDismiss={() => {
                  dismissBackupNudge();
                  setBackupNudgeVisible(false);
                }}
              />
            ) : null}
            {documents.length === 0 && projects.length === 0 ? (
              <HubWelcome
                isDark={isDark}
                onStartScratch={() => {
                  void handleCreateScratch();
                }}
                onStartGuide={() => {
                  void handleStartGuide();
                }}
                onCreateTemplate={(template) => {
                  void handleCreateTemplate(template);
                }}
                onImport={(file) => {
                  void handleUploadFile(file);
                }}
                onNewProject={() => openCreateProjectPrompt(null)}
              />
            ) : (
              <>
                {selectedProject && selectedFolderStats ? (
                  <HubFolderHeader
                    project={selectedProject}
                    fileCount={selectedFolderStats.fileCount}
                    subfolderCount={selectedFolderStats.subfolderCount}
                    lastActivity={selectedFolderStats.lastActivity}
                    onEditDetails={() => setProjectInfoProject(selectedProject)}
                    onShare={() => {
                      setShareProject(selectedProject);
                      setProjectShareOpen(true);
                    }}
                  />
                ) : null}

                <HubSlateView
                  allProjects={projects}
                  authorName={penName}
                  documents={filteredDocuments}
                  editingDocumentId={editingDocumentId}
                  editingTitle={editingTitle}
                  fileViewMode={fileViewMode}
                  getLocationLabel={getDocumentLocationLabel}
                  isDark={isDark}
                  selectedLibraryDocumentId={selectedLibraryDocumentId}
                  selectedLibraryProjectId={selectedLibraryProjectId}
                  selectedProject={selectedProject}
                  selectedProjectId={selectedProjectId}
                  visibleProjects={visibleProjects}
                  onAddHubFile={(file) => {
                    void handleAddHubFile(file);
                  }}
                  onAddHubFiles={handleAddHubFiles}
                  onCancelRename={cancelDocumentRename}
                  onCommitRename={commitDocumentRename}
                  onCreateProject={() => openCreateProjectPrompt(selectedProject?.id ?? null)}
                  onCreateTemplate={(template) => {
                    void handleCreateTemplate(template);
                  }}
                  onDelete={handleSoftDelete}
                  onDeleteProject={handleDeleteProject}
                  onDuplicate={(documentId) => {
                    void handleDuplicateDocument(documentId);
                  }}
                  onDuplicateProject={(projectId) => {
                    void handleDuplicateProject(projectId);
                  }}
                  onEditProject={setProjectInfoProject}
                  onEditingTitleChange={setEditingTitle}
                  onFileViewModeChange={handleFileViewModeChange}
                  onImport={(file) => {
                    void handleUploadFile(file);
                  }}
                  onMove={openMoveDialog}
                  onOpenDocument={handleOpenDocumentFromHub}
                  onOpenHubFile={handleOpenHubFile}
                  onOpenProjectFolder={(projectId) => openFolder(projectId)}
                  onPosterChange={(documentId, posterImageDataUrl) => {
                    void updateDocumentPoster(documentId, posterImageDataUrl);
                  }}
                  onSelectLibraryDocument={selectLibraryDocument}
                  onSelectLibraryProject={selectLibraryProject}
                  onShare={(document) => {
                    openDocumentShare(document);
                  }}
                  onShareProject={(project) => {
                    setShareProject(project);
                    setProjectShareOpen(true);
                  }}
                  onStartRename={startDocumentRename}
                  onStartScratch={() => {
                    void handleCreateScratch();
                  }}
                  onStartGuide={() => {
                    void handleStartGuide();
                  }}
                />
              </>
            )}
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
        ) : activeSection === 'codex' ? (
          <HubCodexPanel
            isDark={isDark}
            projects={projects}
            onOpenCapture={() => setCodexCaptureOpen(true)}
          />
        ) : (
          <HubTrashPanel
            documents={filteredTrashDocuments}
            projects={filteredTrashProjects}
            isDark={isDark}
            onRestoreDocument={handleRestoreDocument}
            onDeleteDocumentForever={handlePermanentDelete}
            onRestoreProject={handleRestoreProject}
            onDeleteProjectForever={handlePermanentDeleteProject}
          />
        )}
        </HubShell>

        <ErrorBoundary label="ai-chat" fallback={null}>
          <AiChatPanel
            open={chatOpen}
            variant="hub"
            resolvedTheme={resolvedTheme}
            libraryDocuments={documents}
            libraryProjects={projects}
            selectedScriptId={selectedLibraryDocumentId}
            onClose={() => setChatOpen(false)}
            onOpenSettings={() => {
              setChatOpen(false);
              setSettingsInitialTab('ai');
              setSettingsOpen(true);
            }}
          />
        </ErrorBoundary>
      </div>

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

      <HubFilePreviewDialog
        document={previewHubFile}
        isDark={isDark}
        onClose={() => setPreviewHubFile(null)}
      />

      <ShareDialog
        open={projectShareOpen && shareProject !== null}
        title={shareProject?.title || 'Untitled Project'}
        projectId={shareProject?.id}
        isDark={isDark}
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
        isDark={isDark}
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
        onClose={closeMoveDialog}
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

      <CommandPalette
        items={commandPaletteItems}
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />

      <ShortcutsModal
        open={shortcutsOpen}
        groups={hubShortcutGroups}
        onClose={() => setShortcutsOpen(false)}
      />

      <CodexCaptureModal
        open={codexCaptureOpen}
        onOpenChange={setCodexCaptureOpen}
        defaultScope="global"
        defaultType="style"
        projectOptions={projects
          .filter((project) => !project.parentProjectId)
          .map((project) => ({ id: project.id, title: project.title }))}
      />
    </>
  );
}
