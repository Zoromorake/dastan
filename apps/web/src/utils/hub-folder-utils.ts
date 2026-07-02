import type { ScreenplayDocumentRecord, ScreenplayProjectRecord } from '../types';

export function getChildProjects(
  projects: ScreenplayProjectRecord[],
  parentProjectId: string | null,
): ScreenplayProjectRecord[] {
  return projects.filter((project) => (project.parentProjectId ?? null) === parentProjectId);
}

export function getProjectBreadcrumbs(
  projects: ScreenplayProjectRecord[],
  projectId: string,
): ScreenplayProjectRecord[] {
  const byId = new Map(projects.map((project) => [project.id, project]));
  const chain: ScreenplayProjectRecord[] = [];
  let current = byId.get(projectId);

  while (current) {
    chain.unshift(current);
    current = current.parentProjectId ? byId.get(current.parentProjectId) : undefined;
  }

  return chain;
}

export function getDescendantProjectIds(
  projects: ScreenplayProjectRecord[],
  rootProjectId: string,
): Set<string> {
  const ids = new Set<string>([rootProjectId]);
  let changed = true;

  while (changed) {
    changed = false;

    for (const project of projects) {
      if (project.parentProjectId && ids.has(project.parentProjectId) && !ids.has(project.id)) {
        ids.add(project.id);
        changed = true;
      }
    }
  }

  return ids;
}

export function getProjectPathLabel(
  projects: ScreenplayProjectRecord[],
  projectId: string | null | undefined,
): string | null {
  if (!projectId) {
    return null;
  }

  return getProjectBreadcrumbs(projects, projectId)
    .map((project) => project.title || 'Untitled project')
    .join(' / ');
}

export function getRelativeFolderLabel(
  projects: ScreenplayProjectRecord[],
  currentFolderId: string,
  documentProjectId: string | null | undefined,
): string | null {
  if (!documentProjectId) {
    return 'Library';
  }

  if (documentProjectId === currentFolderId) {
    return null;
  }

  const breadcrumbs = getProjectBreadcrumbs(projects, documentProjectId);
  const currentIndex = breadcrumbs.findIndex((project) => project.id === currentFolderId);

  if (currentIndex === -1) {
    return getProjectPathLabel(projects, documentProjectId);
  }

  const relativePath = breadcrumbs
    .slice(currentIndex + 1)
    .map((project) => project.title || 'Untitled project')
    .join(' / ');

  return relativePath || null;
}

export function filterDocumentsForFolder(
  documents: ScreenplayDocumentRecord[],
  projects: ScreenplayProjectRecord[],
  folderProjectId: string | null,
): ScreenplayDocumentRecord[] {
  if (folderProjectId === null) {
    return documents;
  }

  const allowedProjectIds = getDescendantProjectIds(projects, folderProjectId);

  return documents.filter((document) => document.projectId && allowedProjectIds.has(document.projectId));
}

export function countDocumentsInProjectTree(
  documents: ScreenplayDocumentRecord[],
  projects: ScreenplayProjectRecord[],
  projectId: string,
): number {
  const allowedProjectIds = getDescendantProjectIds(projects, projectId);

  return documents.filter((document) => document.projectId && allowedProjectIds.has(document.projectId)).length;
}

export function flattenProjectsForMove(projects: ScreenplayProjectRecord[]): Array<{
  project: ScreenplayProjectRecord;
  depth: number;
  pathLabel: string;
}> {
  const byParent = new Map<string | null, ScreenplayProjectRecord[]>();

  for (const project of projects) {
    const parentId = project.parentProjectId ?? null;
    const siblings = byParent.get(parentId) ?? [];
    siblings.push(project);
    byParent.set(parentId, siblings);
  }

  for (const siblings of byParent.values()) {
    siblings.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  const flattened: Array<{ project: ScreenplayProjectRecord; depth: number; pathLabel: string }> = [];

  const visit = (parentId: string | null, depth: number, parentPath: string[]) => {
    const children = byParent.get(parentId) ?? [];

    for (const project of children) {
      const path = [...parentPath, project.title || 'Untitled project'];
      flattened.push({ project, depth, pathLabel: path.join(' / ') });
      visit(project.id, depth + 1, path);
    }
  };

  visit(null, 0, []);

  return flattened;
}
