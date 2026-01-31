/**
 * LLM DNA Explorer - Data Loading and Processing Utilities
 */

export interface ModelData {
    id: string;
    name: string;
    organization: string;
    family: string;
    parameters: string | null;
    isInstruct: boolean;
    signature: number[] | null;
    x?: number;
    y?: number;
    [key: string]: any;
}

export interface RankedModel extends ModelData {
    distance: number;
}

interface Database {
    models: ModelData[];
    metadata: Record<string, any>;
}

export class DataLoader {
    database: Database | null = null;
    models: ModelData[] = [];
    metadata: Record<string, any> | null = null;
    isLoaded: boolean = false;

    constructor() {
        this.database = null;
        this.models = [];
        this.metadata = null;
        this.isLoaded = false;
    }

    async loadDatabase(): Promise<Database> {
        if (this.isLoaded && this.database) return this.database;

        try {
            const response = await fetch('/dna_database.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            this.database = await response.json();
            this.models = this.database?.models || [];
            this.metadata = this.database?.metadata || {};
            this.isLoaded = true;

            console.log(`Loaded ${this.models.length} models`);
            return this.database as Database;

        } catch (error) {
            console.warn('Could not load dna_database.json:', error);
            // Return empty database structure
            this.database = { models: [], metadata: {} };
            this.models = [];
            this.metadata = {};
            return this.database;
        }
    }

    getModels(): ModelData[] {
        return this.models;
    }

    getModelById(id: string): ModelData | undefined {
        return this.models.find(m => m.id === id);
    }

    getModelsByFamily(family: string): ModelData[] {
        return this.models.filter(m => m.family === family);
    }

    getModelsByOrganization(org: string): ModelData[] {
        return this.models.filter(m => m.organization === org);
    }

    getFamilies(): string[] {
        const families = new Set(this.models.map(m => m.family).filter(Boolean));
        return Array.from(families).sort();
    }

    getOrganizations(): string[] {
        const orgs = new Set(this.models.map(m => m.organization).filter(Boolean));
        return Array.from(orgs).sort();
    }

    searchModels(query: string): ModelData[] {
        if (!query) return this.models;

        const lowerQuery = query.toLowerCase();
        return this.models.filter(m =>
            m.name.toLowerCase().includes(lowerQuery) ||
            m.id.toLowerCase().includes(lowerQuery) ||
            (m.family && m.family.toLowerCase().includes(lowerQuery)) ||
            (m.organization && m.organization.toLowerCase().includes(lowerQuery))
        );
    }

    /**
     * Calculate Euclidean distance between two DNA signatures
     */
    calculateDistance(sig1: number[] | null, sig2: number[] | null): number {
        if (!sig1 || !sig2 || sig1.length !== sig2.length) {
            return Infinity;
        }

        let sum = 0;
        for (let i = 0; i < sig1.length; i++) {
            const diff = sig1[i] - sig2[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }

    /**
     * Find nearest neighbors for a model
     */
    findNearestNeighbors(modelId: string, count: number = 5): Array<{ model: ModelData; distance: number }> {
        const targetModel = this.getModelById(modelId);
        if (!targetModel || !targetModel.signature) {
            return [];
        }

        const distances = this.models
            .filter(m => m.id !== modelId && m.signature)
            .map(m => ({
                model: m,
                distance: this.calculateDistance(targetModel.signature!, m.signature)
            }))
            .sort((a, b) => a.distance - b.distance);

        return distances.slice(0, count);
    }

    /**
     * Rank models by similarity to a reference model
     */
    rankBySimilarity(referenceId: string, modelIds: string[] | null = null): RankedModel[] {
        const refModel = this.getModelById(referenceId);
        if (!refModel || !refModel.signature) {
            return [];
        }

        const candidates = modelIds
            ? this.models.filter(m => modelIds.includes(m.id))
            : this.models;

        return candidates
            .filter(m => m.id !== referenceId && m.signature)
            .map(m => ({
                ...m,
                distance: this.calculateDistance(refModel.signature!, m.signature)
            }))
            .sort((a, b) => a.distance - b.distance) as RankedModel[];
    }

    /**
     * Get color for model family
     */
    getFamilyColor(family: string | null): string {
        if (!family) return '#6b7280';

        const colors: Record<string, string> = {
            'Qwen': '#10b981',
            'Llama': '#3b82f6',
            'Meta-Llama': '#3b82f6',
            'Mistral': '#f59e0b',
            'Gemma': '#ef4444',
            'Phi': '#8b5cf6',
            'Falcon': '#06b6d4',
            'DeepSeek': '#ec4899',
            'Yi': '#14b8a6',
            'Pythia': '#f97316',
            'GPT': '#a855f7',
            'TinyLlama': '#84cc16',
            'Vicuna': '#0ea5e9'
        };

        return colors[family] || '#6b7280';
    }

    /**
     * Convert signature to heatmap color scale
     */
    signatureToColors(signature: number[] | null): string[] {
        if (!signature) return [];

        const min = Math.min(...signature);
        const max = Math.max(...signature);
        const range = max - min || 1;

        return signature.map(val => {
            const normalized = (val - min) / range;
            return this.valueToColor(normalized);
        });
    }

    valueToColor(value: number): string {
        // Blue -> White -> Red color scale
        if (value < 0.5) {
            const intensity = Math.round(255 * (value * 2));
            return `rgb(${intensity}, ${intensity}, 255)`;
        } else {
            const intensity = Math.round(255 * ((1 - value) * 2));
            return `rgb(255, ${intensity}, ${intensity})`;
        }
    }
}

/**
 * Parse model ID to extract metadata
 */
export function parseModelId(modelId: string): {
    organization: string;
    modelName: string;
    family: string;
    parameters: string | null;
    isInstruct: boolean;
    fullName: string;
} {
    // Format: "Organization_ModelName" or "organization/model-name"
    const parts = modelId.includes('/')
        ? modelId.split('/')
        : modelId.split('_');

    const organization = parts[0] || 'Unknown';
    const modelName = parts.slice(1).join('-') || modelId;

    // Extract family (first part of model name before version/size)
    const familyMatch = modelName.match(/^([A-Za-z]+)/);
    const family = familyMatch ? familyMatch[1] : organization;

    // Extract parameters (size like 7B, 13B, etc.)
    const paramMatch = modelName.match(/(\d+\.?\d*)[Bb]/);
    const parameters = paramMatch ? paramMatch[1] + 'B' : null;

    // Check if instruct-tuned
    const isInstruct = /instruct|chat|it$/i.test(modelName);

    return {
        organization,
        modelName,
        family,
        parameters,
        isInstruct,
        fullName: modelId.replace('_', '/')
    };
}

/**
 * Format large numbers (e.g., 7000000000 -> "7B")
 */
export function formatParameters(num: number | null): string | null {
    if (!num) return null;
    if (num >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    return num.toString();
}

/**
 * Debounce function for search input
 */
export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    } as T;
}
