/**
 * React App: Layout + Router
 */
import { createBrowserRouter, RouterProvider, Link, useLocation, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { DataProvider } from '@/contexts/DataContext';
import { routes } from '@/routes';

const PAGE_TITLES: Record<string, string> = {
    '/': 'DNA Galaxy',
    '/about': 'About',
    '/lab': 'Community Lab',
    '/workbench': 'Workbench',
};

function Layout() {
    const location = useLocation();
    const pathname = location.pathname;

    useEffect(() => {
        const title = PAGE_TITLES[pathname] ?? 'LLM DNA Explorer';
        document.title = `${title} | LLM DNA Explorer`;
    }, [pathname]);

    const navItems = [
        { path: '/', label: 'Galaxy' },
        { path: '/lab', label: 'Community Lab' },
        { path: '/workbench', label: 'Workbench' },
        { path: '/about', label: 'About' },
    ];

    return (
        <>
            <nav className="nav">
                <div className="nav-container">
                    <Link to="/" className="nav-logo">
                        <span className="logo-icon">🧬</span>
                        <span className="logo-text">LLM DNA</span>
                    </Link>
                    <button className="nav-toggle" aria-label="Toggle navigation" type="button">
                        <span />
                        <span />
                        <span />
                    </button>
                    <ul className="nav-links">
                        {navItems.map(({ path, label }) => (
                            <li key={path}>
                                <Link
                                    to={path}
                                    className={`nav-link ${pathname === path ? 'active' : ''}`}
                                    data-page={path === '/' ? 'galaxy' : path.slice(1)}
                                >
                                    {label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </nav>
            <main id="app-content">
                <Outlet />
            </main>
        </>
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
