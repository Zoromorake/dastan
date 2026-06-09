import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, FolderInput, Pencil, Search, Trash2, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ScreenplayDocumentRecord, ScreenplayProjectRecord } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { MoveToProjectDialog } from './MoveToProjectDialog';
import { ProjectInfoDialog } from './ProjectInfoDialog';
import { ProjectPosterCard } from './ProjectPosterCard';
import { PromptDialog } from './PromptDialog';
import { ShareDialog } from './ShareDialog';
import { UserSettingsPanel } from './UserSettingsPanel';
import type { UserThemeSetting } from './UserSettingsPanel';
import { getHubTheme } from '../utils/hub-theme';
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
import { countWordsFromContent, isSupportedScreenplayImport, parseImportedScreenplayFile, parseImportedScreenplayPdfFile, toFountainScreenplay } from '../utils/screenplay-text';

interface MainHubDashboardProps {
  onOpenDocument: (id: string) => void;
  theme: UserThemeSetting;
  resolvedTheme: 'light' | 'dark';
  onThemeChange: (theme: UserThemeSetting) => void;
  initialProjectId?: string | null;
}

type HubSection = 'vault' | 'shared' | 'trash' | 'account';
type FileViewMode = 'list' | 'grid';

const userSettingsStorageKey = 'dastan.user-settings.v1';

function loadRecentItemsLimit(): number {
  if (typeof window === 'undefined') {
    return 15;
  }

  const raw = window.localStorage.getItem(userSettingsStorageKey);

  if (!raw) {
    return 15;
  }

  try {
    const parsed = JSON.parse(raw) as { recentItems?: number };
    return parsed.recentItems ?? 15;
  } catch {
    return 15;
  }
}

function formatRelativeDate(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  if (diffMs < dayMs) {
    const hours = Math.max(1, Math.floor(diffMs / hourMs));
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  if (diffMs < dayMs * 2) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
  const [searchValue, setSearchValue] = useState('');
  const [activeSection, setActiveSection] = useState<HubSection>('vault');
  const [fileViewMode, setFileViewMode] = useState<FileViewMode>('list');
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'profile' | 'preferences' | 'notifications' | 'addressBook' | undefined>(undefined);
  const [projectShareOpen, setProjectShareOpen] = useState(false);
  const [documentShareOpen, setDocumentShareOpen] = useState(false);
  const [shareDocumentId, setShareDocumentId] = useState<string | undefined>(undefined);
  const [shareDocumentTitle, setShareDocumentTitle] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId);
  const [projectInfoProject, setProjectInfoProject] = useState<ScreenplayProjectRecord | null>(null);
  const [recentItemsLimit, setRecentItemsLimit] = useState(() => loadRecentItemsLimit());
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveDocumentId, setMoveDocumentId] = useState<string | null>(null);
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

  const createMenuRef = useRef<HTMLDivElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const isDark = resolvedTheme === 'dark';
  const hub = useMemo(() => getHubTheme(isDark), [isDark]);

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

    setRecentItemsLimit(loadRecentItemsLimit());
    return { nextDocuments, nextTrashedDocuments, nextProjects };
  }, [refreshDocuments, refreshProjects, refreshTrash]);

  useEffect(() => {
    let active = true;

    void (async () => {
      await purgeExpiredTrash();

      if (!active) {
        return;
      }

      await refreshAll();
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [refreshAll]);

  useEffect(() => {
    if (initialProjectId) {
      setSelectedProjectId(initialProjectId);
    }
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

  const projectScopedDocuments = useMemo(() => {
    if (selectedProjectId === null) {
      return documents;
    }

    return documents.filter((document) => document.projectId === selectedProjectId);
  }, [documents, selectedProjectId]);

  const filteredDocuments = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (query.length === 0) {
      return projectScopedDocuments;
    }

    return projectScopedDocuments.filter((document) => document.title.toLowerCase().includes(query));
  }, [projectScopedDocuments, searchValue]);

  const recentDocuments = useMemo(
    () => getRecentDocuments(projectScopedDocuments, recentItemsLimit),
    [projectScopedDocuments, recentItemsLimit],
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

  useEffect(() => {
    if (selectedProjectId === null) {
      return;
    }

    if (!projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(null);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!createMenuOpen) {
      return;
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (!createMenuRef.current?.contains(event.target as Node)) {
        setCreateMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [createMenuOpen]);

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
    (projectId?: string) => projectId ?? selectedProjectId ?? undefined,
    [selectedProjectId],
  );

  const handleCreateBlankFile = useCallback(
    async (projectId?: string) => {
      const createdDocument = await createDocument('Untitled', undefined, resolveProjectId(projectId));
      await refreshAll();
      setCreateMenuOpen(false);
      onOpenDocument(createdDocument.id);
    },
    [onOpenDocument, refreshAll, resolveProjectId],
  );

  const handleCreateTemplate = useCallback(
    async (template: 'feature' | 'short' | 'tv', projectId?: string) => {
      const templateTitle = template === 'feature' ? 'Feature Draft' : template === 'short' ? 'Short Film Draft' : 'TV Episode Draft';
      const createdDocument = await createDocument(templateTitle, createTemplateScreenplayContent(template), resolveProjectId(projectId));
      await refreshAll();
      setCreateMenuOpen(false);
      onOpenDocument(createdDocument.id);
    },
    [onOpenDocument, refreshAll, resolveProjectId],
  );

  const openCreateProjectPrompt = useCallback(() => {
    setPromptDialog({
      open: true,
      title: 'Create Project',
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
          setCreateMenuOpen(false);
          setSelectedProjectId(createdProject.id);
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
      setCreateMenuOpen(false);
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
        title: 'Move to Trash',
        description: `Move script "${label}" to Trash? You can restore it within 30 days.`,
        confirmLabel: 'Move to Trash',
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
        title: 'Delete Project',
        description: `Delete project "${label}"? Scripts inside will remain in your vault without a project.`,
        confirmLabel: 'Delete Project',
        destructive: true,
        onConfirm: () => {
          void (async () => {
            await deleteProject(id);

            if (selectedProjectId === id) {
              setSelectedProjectId(null);
            }

            await refreshAll();
            setConfirmDialog(null);
          })();
        },
      });
    },
    [projects, refreshAll, selectedProjectId],
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
        title: 'Delete Forever',
        description: `Permanently delete "${label}"? This cannot be undone.`,
        confirmLabel: 'Delete Forever',
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

  const handleDownloadProject = useCallback(
    (project: ScreenplayProjectRecord) => {
      const projectDocuments = documents.filter((document) => document.projectId === project.id);
      const safeTitle = (project.title.trim() || 'Untitled Project').replace(/[\\/:*?"<>|]+/g, '_');

      const payload = projectDocuments
        .map((document) => {
          const content = toFountainScreenplay(document.content);
          return `=== ${document.title || 'Untitled'} ===\n${content}`;
        })
        .join('\n\n');

      const blob = new Blob([payload || 'No scripts in this project yet.'], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `${safeTitle}.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
    [documents],
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const renderDocumentActions = useCallback(
    (document: ScreenplayDocumentRecord) => (
      <div className="flex flex-wrap items-center gap-2">
        <button className={hub.fileAction} type="button" onClick={() => onOpenDocument(document.id)}>
          Open
        </button>
        <button
          className={hub.fileAction}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            startDocumentRename(document);
          }}
        >
          Rename
        </button>
        <button
          className={hub.fileAction}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openMoveDialog(document.id);
          }}
        >
          Move
        </button>
        <button
          className={hub.fileAction}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openDocumentShare(document);
          }}
        >
          Share
        </button>
        <button
          className={hub.fileActionDanger}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleSoftDelete(document.id);
          }}
        >
          Delete
        </button>
      </div>
    ),
    [handleSoftDelete, hub.fileAction, hub.fileActionDanger, onOpenDocument, openDocumentShare, openMoveDialog, startDocumentRename],
  );

  const renderDocumentTitle = useCallback(
    (document: ScreenplayDocumentRecord) => {
      if (editingDocumentId === document.id) {
        return (
          <Input
            autoFocus
            className={`h-8 text-base font-semibold ${isDark ? 'border-slate-500 bg-slate-700 text-slate-100' : 'border-amber-300 bg-white text-stone-900'}`}
            value={editingTitle}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => setEditingTitle(event.target.value)}
            onBlur={() => {
              void commitDocumentRename(document.id);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void commitDocumentRename(document.id);
              }

              if (event.key === 'Escape') {
                event.preventDefault();
                cancelDocumentRename();
              }
            }}
          />
        );
      }

      return (
        <h3
          className={`truncate text-base font-semibold ${hub.panelTitle}`}
          onDoubleClick={(event) => {
            event.stopPropagation();
            startDocumentRename(document);
          }}
        >
          {document.title || 'Untitled'}
        </h3>
      );
    },
    [cancelDocumentRename, commitDocumentRename, editingDocumentId, editingTitle, hub.panelTitle, isDark, startDocumentRename],
  );

  if (loading) {
    return <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-neutral-100'}`} />;
  }

  const sectionTitle = activeSection === 'vault' ? 'My Vault' : activeSection === 'shared' ? 'Shared' : activeSection === 'trash' ? 'Trash' : 'Account';
  const shellClass = isDark ? 'bg-slate-900 text-slate-100' : 'bg-neutral-100 text-neutral-900';
  const sidebarClass = isDark ? 'border-slate-700 bg-slate-800' : 'border-stone-300 bg-[#f5f1e8]';
  const contentClass = isDark ? 'bg-slate-900' : 'bg-neutral-100';
  const topInputClass = isDark
    ? 'flex h-11 flex-1 items-center rounded-lg border border-slate-600 bg-slate-800 px-4 text-sm text-slate-400'
    : 'flex h-11 flex-1 items-center rounded-lg border border-stone-300 bg-white px-4 text-sm text-stone-500';
  const iconButtonClass = isDark
    ? 'h-10 w-10 rounded-lg border border-slate-600 bg-slate-800 text-slate-300'
    : 'h-10 w-10 rounded-lg border border-stone-300 bg-white text-stone-600';
  const profileButtonClass = isDark
    ? 'h-10 w-10 rounded-full border border-slate-500 bg-slate-700 text-sm font-medium text-slate-100'
    : 'h-10 w-10 rounded-full border border-stone-300 bg-white text-sm font-medium text-stone-700';
  const logoBadgeClass = isDark
    ? 'inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-slate-100'
    : 'inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-neutral-950';

  return (
    <div className={`h-screen overflow-hidden ${shellClass}`}>
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1440px]">
        <aside className={`flex min-h-0 w-64 shrink-0 flex-col overflow-hidden border-r p-4 ${sidebarClass}`}>
          <div className="mb-6 flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <span className={logoBadgeClass}>D</span>
            <span>Dastan</span>
          </div>

          <div ref={createMenuRef} className="relative mb-6">
            <button
              className={`w-full rounded-lg px-4 py-3 text-base font-semibold transition-colors ${hub.accentButton}`}
              type="button"
              onClick={() => setCreateMenuOpen((currentValue) => !currentValue)}
            >
              Create
            </button>

            {createMenuOpen ? (
              <div className={`absolute left-0 top-[calc(100%+12px)] z-20 w-[25rem] rounded-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)] ${hub.createMenu}`}>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className={`text-lg font-semibold ${hub.panelTitle}`}>Create Something New</h2>
                    <p className={`mt-1 text-sm ${hub.panelMuted}`}>Use the same pattern common in Drive, Canva, and Final Draft Cloud: upload, start fresh, or begin from a template.</p>
                  </div>
                  <button className={`text-sm ${hub.panelMuted} hover:opacity-80`} type="button" onClick={() => setCreateMenuOpen(false)}>
                    Close
                  </button>
                </div>

                <div className="grid gap-3">
                  <button
                    className={`rounded-xl border px-4 py-3 text-left transition ${hub.card}`}
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                  >
                    <span className={`block text-sm font-semibold ${hub.panelTitle}`}>Upload Script</span>
                    <span className={`mt-1 block text-xs uppercase tracking-[0.18em] ${hub.panelMuted}`}>Import .fountain, .fdx, .txt, or .pdf</span>
                  </button>

                  <button
                    className={`rounded-xl border px-4 py-3 text-left transition ${hub.card}`}
                    type="button"
                    onClick={openCreateProjectPrompt}
                  >
                    <span className={`block text-sm font-semibold ${hub.panelTitle}`}>Create Project</span>
                    <span className={`mt-1 block text-xs uppercase tracking-[0.18em] ${hub.panelMuted}`}>Organize drafts, notes, and media</span>
                  </button>

                  <button
                    className={`rounded-xl border px-4 py-3 text-left transition ${hub.card}`}
                    type="button"
                    onClick={() => {
                      void handleCreateBlankFile();
                    }}
                  >
                    <span className={`block text-sm font-semibold ${hub.panelTitle}`}>Blank Script</span>
                    <span className={`mt-1 block text-xs uppercase tracking-[0.18em] ${hub.panelMuted}`}>Start from scratch</span>
                  </button>
                </div>

                <div className={`mt-4 rounded-xl border p-4 ${hub.card}`}>
                  <p className={`mb-3 text-xs uppercase tracking-[0.24em] ${hub.panelMuted}`}>Templates</p>
                  <div className="grid gap-2">
                    <button
                      className={`rounded-lg px-3 py-2 text-left text-sm transition ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'bg-white text-stone-700 hover:bg-amber-50 hover:text-stone-900'}`}
                      type="button"
                      onClick={() => {
                        void handleCreateTemplate('feature');
                      }}
                    >
                      Feature Film
                    </button>
                    <button
                      className={`rounded-lg px-3 py-2 text-left text-sm transition ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'bg-white text-stone-700 hover:bg-amber-50 hover:text-stone-900'}`}
                      type="button"
                      onClick={() => {
                        void handleCreateTemplate('short');
                      }}
                    >
                      Short Film
                    </button>
                    <button
                      className={`rounded-lg px-3 py-2 text-left text-sm transition ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'bg-white text-stone-700 hover:bg-amber-50 hover:text-stone-900'}`}
                      type="button"
                      onClick={() => {
                        void handleCreateTemplate('tv');
                      }}
                    >
                      TV Teaser
                    </button>
                  </div>
                </div>

                <input
                  ref={uploadInputRef}
                  className="hidden"
                  type="file"
                  accept=".fountain,.txt,.fdx,.pdf,text/plain,text/xml,application/xml,application/pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) {
                      void handleUploadFile(file);
                    }

                    event.target.value = '';
                  }}
                />
              </div>
            ) : null}
          </div>

          <nav className="space-y-1 text-[15px]">
            {[
              { key: 'vault', label: 'My Vault' },
              { key: 'shared', label: 'Shared' },
              { key: 'trash', label: 'Trash' },
              { key: 'account', label: 'Account' },
            ].map((item) => {
              const isActive = activeSection === item.key;

              return (
                <button
                  key={item.key}
                  className={`w-full rounded-md px-3 py-2 text-left ${isActive ? hub.navActive : hub.navItem}`}
                  type="button"
                  onClick={() => setActiveSection(item.key as HubSection)}
                >
                  {item.label}
                  {item.key === 'trash' && trashedDocuments.length > 0 ? (
                    <span className="ml-2 text-xs text-stone-400">({trashedDocuments.length})</span>
                  ) : null}
                </button>
              );
            })}
          </nav>

        </aside>

        <main className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4 ${contentClass}`}>
          <header className="mb-3 flex shrink-0 items-center gap-3">
            <label className={topInputClass}>
              <Search
                aria-hidden
                className={isDark ? 'mr-3 shrink-0 text-slate-400' : 'mr-3 shrink-0 text-stone-500'}
                size={20}
                strokeWidth={2.25}
              />
              <input
                className={isDark ? 'w-full border-0 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500' : 'w-full border-0 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400'}
                placeholder="Search..."
                spellCheck={false}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
            </label>
            <button className={`relative group ${iconButtonClass}`} type="button" aria-label="Help">
              ?
              <span className={`pointer-events-none absolute right-0 top-[calc(100%+6px)] z-20 w-56 rounded-xl border p-3 text-left text-xs leading-relaxed shadow-lg opacity-0 transition-opacity group-hover:opacity-100 ${hub.createMenu}`}>
                <strong className={`block mb-1 ${hub.panelTitle}`}>Keyboard shortcuts</strong>
                ⌘S — Save &nbsp;&nbsp; ⌘\ — Toggle sidebar<br />
                TAB — Cycle block type &nbsp;&nbsp; ENTER — Next block<br />
                ⌘1–6 — Set block type directly
              </span>
            </button>
            <button
              className={profileButtonClass}
              type="button"
              aria-label="Profile"
              onClick={() => setSettingsOpen(true)}
            >
              A
            </button>
          </header>

          <p className={`mb-3 shrink-0 text-sm font-medium ${hub.panelMuted}`}>{sectionTitle}</p>

          {activeSection === 'vault' ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {selectedProject ? (
                <div className={`mb-3 flex shrink-0 items-center justify-between rounded-lg px-4 py-2.5 ${hub.selectionBar}`}>
                  <div className="flex items-center gap-3">
                    <button
                      aria-label="Clear selection"
                      className={hub.iconButton}
                      type="button"
                      onClick={() => setSelectedProjectId(null)}
                    >
                      <X size={18} />
                    </button>
                    <span className={`text-sm font-medium ${hub.panelTitle}`}>1 Selected</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      aria-label="Edit project info"
                      className={`rounded-md p-2 ${hub.iconButton}`}
                      title="Edit"
                      type="button"
                      onClick={() => setProjectInfoProject(selectedProject)}
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      aria-label="Share project"
                      className={`rounded-md p-2 ${hub.iconButton}`}
                      title="Share"
                      type="button"
                      onClick={() => setProjectShareOpen(true)}
                    >
                      <UserPlus size={18} />
                    </button>
                    <button
                      aria-label="Download project"
                      className={`rounded-md p-2 ${hub.iconButton}`}
                      title="Download"
                      type="button"
                      onClick={() => handleDownloadProject(selectedProject)}
                    >
                      <Download size={18} />
                    </button>
                    <button
                      aria-label="Open project"
                      className={`rounded-md p-2 ${hub.iconButton}`}
                      title="Open"
                      type="button"
                      onClick={() => {
                        void handleOpenProject(selectedProject);
                      }}
                    >
                      <FolderInput size={18} />
                    </button>
                    <button
                      aria-label="Delete project"
                      className={`rounded-md p-2 ${isDark ? 'text-rose-400 hover:text-rose-300' : 'text-rose-600 hover:text-rose-700'}`}
                      title="Delete"
                      type="button"
                      onClick={() => handleDeleteProject(selectedProject.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {recentDocuments.length > 0 ? (
                <section className={`shrink-0 p-3 ${hub.panel}`}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h2 className={`text-sm font-semibold tracking-tight ${hub.panelTitle}`}>Recent</h2>
                    <span className={`text-[10px] uppercase tracking-[0.16em] ${hub.panelMuted}`}>Last {recentItemsLimit}</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-0.5">
                    {recentDocuments.map((document) => (
                      <button
                        key={document.id}
                        className={`w-40 shrink-0 rounded-lg border px-3 py-2 text-left transition ${hub.card}`}
                        type="button"
                        onClick={() => onOpenDocument(document.id)}
                      >
                        <p className={`truncate text-xs font-semibold ${hub.panelTitle}`}>{document.title || 'Untitled'}</p>
                        <p className={`mt-0.5 truncate text-[10px] uppercase tracking-[0.14em] ${hub.panelMuted}`}>{formatRelativeDate(document.updatedAt)}</p>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className={`flex min-h-[min(280px,38vh)] shrink-0 flex-col p-4 ${hub.panel}`}>
                <h2 className={`shrink-0 text-xl font-semibold tracking-tight ${hub.panelTitle}`}>Projects</h2>

                {filteredProjects.length === 0 ? (
                  <div className={`mt-3 rounded-xl border border-dashed p-8 text-center ${hub.dashed}`}>
                    <p className={`mb-1 text-lg font-semibold ${hub.panelTitle}`}>Start a Project</p>
                    <p className={`mb-4 text-sm ${hub.panelMuted}`}>Create a project to collect your drafts, research, and media in one place.</p>
                    <button
                      className={`rounded-lg px-4 py-2 text-sm font-semibold ${hub.accentButton}`}
                      type="button"
                      onClick={openCreateProjectPrompt}
                    >
                      Create Project
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 overflow-x-auto pb-1">
                    <div className="flex h-[200px] min-w-min gap-3 pr-1">
                      {filteredProjects.map((project) => {
                        const itemCount = documents.filter((document) => document.projectId === project.id).length;

                        return (
                          <ProjectPosterCard
                            key={project.id}
                            project={project}
                            itemCount={itemCount}
                            isSelected={selectedProjectId === project.id}
                            isDark={isDark}
                            onSelect={() => setSelectedProjectId(project.id)}
                            onOpen={() => {
                              void handleOpenProject(project);
                            }}
                          />
                        );
                      })}
                      <button
                        className={`flex h-[200px] w-36 shrink-0 flex-col items-center justify-center rounded-lg border border-dashed px-3 py-4 text-center transition ${hub.dashed} hover:opacity-90`}
                        type="button"
                        onClick={openCreateProjectPrompt}
                      >
                        <span className={`mb-2 text-2xl ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>+</span>
                        <span className={`text-xs font-semibold ${hub.panelTitle}`}>Start a Project</span>
                        <span className={`mt-1.5 text-[10px] leading-snug ${hub.panelMuted}`}>Collect drafts and media in one place.</span>
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <section className={`flex min-h-[min(320px,42vh)] shrink-0 flex-col p-4 ${hub.panel}`}>
                <div className="mb-3 flex shrink-0 items-center justify-between">
                  <div>
                    <h2 className={`text-xl font-semibold tracking-tight ${hub.panelTitle}`}>Files</h2>
                    {selectedProject ? (
                      <p className={`mt-1 text-xs uppercase tracking-[0.18em] ${hub.panelMuted}`}>Showing scripts in {selectedProject.title || 'Untitled Project'}</p>
                    ) : null}
                  </div>
                  <div className={`flex gap-2 text-sm ${hub.panelMuted}`}>
                    <button
                      className={`rounded-md border px-3 py-1 ${
                        fileViewMode === 'list'
                          ? isDark
                            ? 'border-amber-600 bg-amber-900/30 text-slate-200'
                            : 'border-amber-300 bg-amber-50 text-stone-700'
                          : isDark
                            ? 'border-slate-600 bg-slate-700'
                            : 'border-stone-300 bg-stone-100'
                      }`}
                      type="button"
                      onClick={() => setFileViewMode('list')}
                    >
                      ≡
                    </button>
                    <button
                      className={`rounded-md border px-3 py-1 ${
                        fileViewMode === 'grid'
                          ? isDark
                            ? 'border-amber-600 bg-amber-900/30 text-slate-200'
                            : 'border-amber-300 bg-amber-50 text-stone-700'
                          : isDark
                            ? 'border-slate-600 bg-slate-700'
                            : 'border-stone-300 bg-stone-100'
                      }`}
                      type="button"
                      onClick={() => setFileViewMode('grid')}
                    >
                      ▦
                    </button>
                  </div>
                </div>

                {filteredDocuments.length === 0 ? (
                  <div className={`mt-3 rounded-xl border border-dashed p-10 text-center ${hub.dashed}`}>
                    <p className={`mb-2 text-xl font-semibold ${hub.panelTitle}`}>Nothing Here ... yet</p>
                    <p className={`mb-5 text-sm ${hub.panelMuted}`}>
                      {selectedProject
                        ? 'Create a script inside this project or clear the project filter to see all vault files.'
                        : 'Select Create to add a script, project, or upload, then pick up writing anywhere, anytime.'}
                    </p>
                    <button
                      className={`rounded-lg px-4 py-2 text-sm font-semibold ${hub.accentButton}`}
                      type="button"
                      onClick={() => setCreateMenuOpen(true)}
                    >
                      Create Script
                    </button>
                  </div>
                ) : fileViewMode === 'list' ? (
                  <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                    {filteredDocuments.map((document) => (
                      <article key={document.id} className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 transition ${hub.card}`}>
                        <button className="min-w-0 flex-1 text-left" type="button" onClick={() => onOpenDocument(document.id)}>
                          {renderDocumentTitle(document)}
                          <p className={`mt-1 text-xs uppercase tracking-[0.18em] ${hub.panelMuted}`}>
                            {countWordsFromContent(document.content)} words &middot; Updated {formatRelativeDate(document.updatedAt)}
                          </p>
                        </button>
                        <div className="ml-4 shrink-0">{renderDocumentActions(document)}</div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {filteredDocuments.map((document) => (
                      <article key={document.id} className={`rounded-xl border p-4 transition ${hub.card}`}>
                        <button className="block w-full text-left" type="button" onClick={() => onOpenDocument(document.id)}>
                          {renderDocumentTitle(document)}
                          <p className={`mt-1 text-xs uppercase tracking-[0.18em] ${hub.panelMuted}`}>
                            {countWordsFromContent(document.content)} words &middot; Updated {formatRelativeDate(document.updatedAt)}
                          </p>
                        </button>
                        <div className="mt-4">{renderDocumentActions(document)}</div>
                      </article>
                    ))}
                    </div>
                  </div>
                )}
              </section>
              </div>
            </div>
          ) : activeSection === 'shared' ? (
            <section className={`min-h-0 flex-1 overflow-y-auto p-6 ${hub.panel}`}>
              <div className={`rounded-xl border border-dashed p-10 ${hub.dashed}`}>
                <p className={`mb-2 text-2xl font-semibold ${hub.panelTitle}`}>Local Sharing</p>
                <p className={`mx-auto mb-4 max-w-2xl text-sm leading-relaxed ${hub.panelMuted}`}>
                  Dastan keeps scripts on this device for now. You can still prepare invites from your address book and copy direct share links for collaborators on the same machine or network.
                </p>
                <p className={`mx-auto max-w-2xl text-sm leading-relaxed ${hub.panelMuted}`}>
                  Share links open scripts at <code className={`rounded px-1.5 py-0.5 ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-white text-stone-800'}`}>/script/:id</code>. Use the Share action on any file row to generate a link for that screenplay.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setSettingsInitialTab('addressBook');
                      setSettingsOpen(true);
                    }}
                  >
                    Open Address Book
                  </Button>
                </div>
              </div>
            </section>
          ) : activeSection === 'trash' ? (
            <section className={`flex min-h-0 flex-1 flex-col overflow-hidden p-4 ${hub.panel}`}>
              <div className="mb-3 shrink-0">
                <h2 className={`text-2xl font-semibold tracking-tight ${hub.panelTitle}`}>Trash</h2>
                <p className={`mt-1 text-sm ${hub.panelMuted}`}>Deleted scripts stay here for 30 days, then are removed automatically.</p>
              </div>

              {filteredTrashDocuments.length === 0 ? (
                <div className={`rounded-xl border border-dashed p-14 text-center ${hub.dashed}`}>
                  <p className={`mb-2 text-2xl font-semibold ${hub.panelTitle}`}>Trash is empty</p>
                  <p className={`text-sm ${hub.panelMuted}`}>Scripts you delete from the vault appear here until restored or permanently removed.</p>
                </div>
              ) : (
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                  {filteredTrashDocuments.map((document) => (
                    <article key={document.id} className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${hub.card}`}>
                      <div className="min-w-0">
                        <h3 className={`truncate text-base font-semibold ${hub.panelTitle}`}>{document.title || 'Untitled'}</h3>
                        <p className={`mt-1 text-xs uppercase tracking-[0.18em] ${hub.panelMuted}`}>
                          Deleted {document.deletedAt ? formatRelativeDate(document.deletedAt) : 'recently'}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          className={hub.fileAction}
                          type="button"
                          onClick={() => {
                            void handleRestoreDocument(document.id);
                          }}
                        >
                          Restore
                        </button>
                        <button
                          className={hub.fileActionDanger}
                          type="button"
                          onClick={() => {
                            handlePermanentDelete(document.id);
                          }}
                        >
                          Delete Forever
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className={`min-h-0 flex-1 overflow-y-auto p-6 ${hub.panel}`}>
              <div className="mb-6">
                <h2 className={`text-2xl font-semibold ${hub.panelTitle}`}>Account</h2>
                <p className={`mt-2 max-w-2xl text-sm leading-relaxed ${hub.panelMuted}`}>
                  Manage profile, preferences, notifications, and your address book. Scripts remain stored locally on this device until sync is enabled.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={() => setSettingsOpen(true)}>
                  Open Settings
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setSettingsInitialTab('preferences');
                    setSettingsOpen(true);
                  }}
                >
                  Preferences
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setSettingsInitialTab('addressBook');
                    setSettingsOpen(true);
                  }}
                >
                  Address Book
                </Button>
              </div>
            </section>
          )}
        </main>
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
              setRecentItemsLimit(loadRecentItemsLimit());
            }}
          />
        </div>
      ) : null}

      <ShareDialog
        open={projectShareOpen && selectedProject !== null}
        title={selectedProject?.title || 'Untitled Project'}
        onClose={() => setProjectShareOpen(false)}
        onOpenAddressBook={() => {
          setProjectShareOpen(false);
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
    </div>
  );
}
