/**
 * File-based routing: src/pages/*.tsx → URL
 * - pages/index.tsx → /
 * - pages/about.tsx → /about
 * - pages/lab.tsx → /lab
 * - pages/workbench.tsx → /workbench
 */
import type { RouteObject } from 'react-router-dom';
import type { ComponentType } from 'react';

const pageModules = import.meta.glob<{ default: ComponentType }>('./pages/*.tsx');

function pathFromFile(file: string): string {
    const name = file.replace(/^\.\/pages\//, '').replace(/\.tsx$/, '');
    return name === 'index' ? '/' : `/${name}`;
}

export const routes: RouteObject[] = Object.entries(pageModules).map(([file, loader]) => ({
    path: pathFromFile(file),
    lazy: () => loader().then((m) => ({ Component: m.default })),
}));
