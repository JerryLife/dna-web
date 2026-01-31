/**
 * LLM DNA Explorer - Main Application Entry Point
 */

import { Router } from './router.js';
import { DataLoader } from './data.js';

class App {
    constructor() {
        this.router = null;
        this.dataLoader = null;
        this.isInitialized = false;
    }

    async init() {
        try {
            // Initialize data loader
            this.dataLoader = new DataLoader();
            window.dataLoader = this.dataLoader;

            // Initialize router
            this.router = new Router();
            window.router = this.router;

            // Setup navigation
            this.setupNavigation();

            // Load initial data
            await this.loadData();

            // Mark as initialized
            this.isInitialized = true;

            // Navigate to current route
            await this.router.navigate(window.location.pathname);

            // Hide loading overlay
            this.hideLoading();

        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to load application. Please refresh the page.');
        }
    }

    setupNavigation() {
        // Mobile nav toggle
        const navToggle = document.querySelector('.nav-toggle');
        const navLinks = document.querySelector('.nav-links');

        if (navToggle && navLinks) {
            navToggle.addEventListener('click', () => {
                navLinks.classList.toggle('open');
                navToggle.classList.toggle('active');
            });
        }

        // Handle navigation clicks
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');

                // Close mobile menu
                if (navLinks) navLinks.classList.remove('open');
                if (navToggle) navToggle.classList.remove('active');

                // Navigate
                await this.router.navigate(href);
            });
        });

        // Handle browser back/forward
        window.addEventListener('popstate', async () => {
            await this.router.navigate(window.location.pathname, false);
        });
    }

    async loadData() {
        try {
            await this.dataLoader.loadDatabase();
        } catch (error) {
            console.warn('Could not load DNA database:', error);
            // Continue anyway - pages can handle missing data
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
        }
    }

    showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.classList.remove('hidden');
        }
    }

    showError(message) {
        this.hideLoading();
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = `
        <div class="page text-center">
          <h1 class="page-title">Oops!</h1>
          <p>${message}</p>
          <button class="btn btn-primary mt-6" onclick="location.reload()">
            Refresh Page
          </button>
        </div>
      `;
        }
    }
}

// Toast notification system
window.showToast = function (message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
    <span class="toast-icon">${getToastIcon(type)}</span>
    <span class="toast-message">${message}</span>
  `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
};

function getToastIcon(type) {
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    return icons[type] || icons.info;
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
});
