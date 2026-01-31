/**
 * React entry - mount app and hide loading when ready
 */
import '@mantine/core/styles.css';
import './styles/global.css';
import './styles/pages.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import App from './App';

const theme = createTheme({
    primaryColor: 'violet',
    fontFamily: 'Inter, system-ui, sans-serif',
    defaultRadius: 'md',
});

const appEl = document.getElementById('app');
const loadingEl = document.getElementById('loading-overlay');

if (!appEl) {
    throw new Error('Root element #app not found');
}

const root = createRoot(appEl);
root.render(
    <StrictMode>
        <MantineProvider theme={theme} defaultColorScheme="light">
            <App />
        </MantineProvider>
    </StrictMode>
);

// Hide loading overlay after first paint (React has rendered)
requestAnimationFrame(() => {
    requestAnimationFrame(() => {
        loadingEl?.classList.add('hidden');
        setTimeout(() => {
            if (loadingEl) (loadingEl as HTMLElement).style.display = 'none';
        }, 300);
    });
});
