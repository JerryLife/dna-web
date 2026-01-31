/**
 * LLM DNA Explorer - Client-Side Router
 */

export class Router {
    constructor() {
        this.routes = {
            '/': {
                name: 'galaxy',
                title: 'DNA Galaxy',
                load: () => import('./pages/galaxy.js')
            },
            '/lab': {
                name: 'lab',
                title: 'Community Lab',
                load: () => import('./pages/lab.js')
            },
            '/workbench': {
                name: 'workbench',
                title: 'Workbench',
                load: () => import('./pages/workbench.js')
            },
            '/about': {
                name: 'about',
                title: 'About',
                load: () => import('./pages/about.js')
            }
        };

        this.currentPage = null;
        this.app = document.getElementById('app');
    }

    async navigate(path, pushState = true) {
        // Normalize path
        path = path || '/';
        if (path !== '/' && path.endsWith('/')) {
            path = path.slice(0, -1);
        }

        // Find route
        const route = this.routes[path] || this.routes['/'];

        // Update URL if needed
        if (pushState && window.location.pathname !== path) {
            window.history.pushState({}, '', path);
        }

        // Update active nav link
        this.updateNavLinks(route.name);

        // Update page title
        document.title = `${route.title} | LLM DNA Explorer`;

        try {
            // Cleanup previous page
            if (this.currentPage && typeof this.currentPage.destroy === 'function') {
                this.currentPage.destroy();
            }

            // Load and render new page
            const module = await route.load();
            this.currentPage = new module.default(this.app);
            await this.currentPage.render();

        } catch (error) {
            console.error('Failed to load route:', error);
            this.renderError(path);
        }
    }

    updateNavLinks(activeName) {
        document.querySelectorAll('.nav-link').forEach(link => {
            const pageName = link.dataset.page;
            if (pageName === activeName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    renderError(path) {
        this.app.innerHTML = `
      <div class="page text-center">
        <h1 class="page-title">404</h1>
        <p class="page-subtitle">Page not found: ${path}</p>
        <a href="/" class="btn btn-primary mt-6">Return to Galaxy</a>
      </div>
    `;
    }
}
