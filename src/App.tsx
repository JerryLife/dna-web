/**
 * React App: Layout + Router
 */
import { createBrowserRouter, RouterProvider, Link, useLocation, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import {
    AppShell,
    Group,
    Burger,
    Drawer,
    Stack,
    NavLink,
    Anchor,
    Box,
    rem,
    UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DataProvider } from '@/contexts/DataContext';
import { routes } from '@/routes';

const PAGE_TITLES: Record<string, string> = {
    '/': 'DNA Galaxy',
    '/about': 'About',
    '/lab': 'Community Lab',
    '/workbench': 'Workbench',
};

const NAV_ITEMS = [
    { path: '/', label: 'Galaxy' },
    { path: '/lab', label: 'Community Lab' },
    { path: '/workbench', label: 'Workbench' },
    { path: '/about', label: 'About' },
];

function Layout() {
    const location = useLocation();
    const pathname = location.pathname;
    const [opened, { toggle, close }] = useDisclosure(false);

    useEffect(() => {
        const title = PAGE_TITLES[pathname] ?? 'LLM DNA Explorer';
        document.title = `${title} | LLM DNA Explorer`;
    }, [pathname]);

    const navLinks = (
        <>
            {NAV_ITEMS.map(({ path, label }) => (
                <NavLink
                    key={path}
                    component={Link}
                    to={path}
                    label={label}
                    active={pathname === path}
                    onClick={close}
                />
            ))}
        </>
    );

    return (
        <AppShell
            header={{ height: 64 }}
            padding={0}
            withBorder
            styles={{
                header: {
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(20px)',
                },
            }}
        >
            <AppShell.Header>
                <Group justify="space-between" h="100%" px="md" wrap="nowrap">
                    <Anchor
                        component={Link}
                        to="/"
                        size="lg"
                        fw={700}
                        style={{ textDecoration: 'none' }}
                        className="nav-logo"
                    >
                        <Group gap="xs" wrap="nowrap">
                            <span className="logo-icon" style={{ fontSize: rem(24) }}>
                                🧬
                            </span>
                            <span className="logo-text">LLM DNA</span>
                        </Group>
                    </Anchor>

                    <Group gap={0} visibleFrom="sm" style={{ flexShrink: 0 }}>
                        {NAV_ITEMS.map(({ path, label }) => {
                            const active = pathname === path;
                            return (
                                <UnstyledButton
                                    key={path}
                                    component={Link}
                                    to={path}
                                    className="header-nav-link"
                                    data-active={active || undefined}
                                    style={{
                                        padding: `${rem(8)} ${rem(12)}`,
                                        borderRadius: 'var(--mantine-radius-md)',
                                        fontWeight: 500,
                                        color: active ? 'var(--mantine-color-violet-6)' : 'var(--mantine-color-dimmed)',
                                        backgroundColor: active ? 'var(--mantine-color-violet-0)' : 'transparent',
                                    }}
                                >
                                    {label}
                                </UnstyledButton>
                            );
                        })}
                    </Group>

                    <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Toggle navigation" />
                </Group>
            </AppShell.Header>

            <Drawer
                opened={opened}
                onClose={close}
                title="Menu"
                hiddenFrom="sm"
                position="right"
                styles={{
                    content: { background: 'var(--mantine-color-body)' },
                }}
            >
                <Stack gap={0}>{navLinks}</Stack>
            </Drawer>

            <AppShell.Main>
                <Box id="app-content">
                    <Outlet />
                </Box>
            </AppShell.Main>
        </AppShell>
    );
}

const router = createBrowserRouter([
    {
        element: <Layout />,
        children: routes,
    },
]);

export default function App() {
    return (
        <DataProvider>
            <RouterProvider router={router} />
        </DataProvider>
    );
}
