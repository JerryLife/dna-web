// Type declaration for the vanilla JS DataLoader class
declare module '@/js/data.js' {
    export interface ModelData {
        id: string;
        name: string;
        organization: string;
        family: string;
        parameters: string | null;
        isInstruct: boolean;
        signature: number[] | null;
        x: number;
        y: number;
        [key: string]: unknown;
    }

    export interface RankedModel extends ModelData {
        distance: number;
    }

    export class DataLoader {
        models: ModelData[];
        isLoaded: boolean;

        loadDatabase(): Promise<unknown>;
        getModels(): ModelData[];
        getModelById(id: string): ModelData | undefined;
        getModelsByFamily(family: string): ModelData[];
        getModelsByOrganization(org: string): ModelData[];
        getFamilies(): string[];
        getOrganizations(): string[];
        searchModels(query: string): ModelData[];
        calculateDistance(sig1: number[] | null, sig2: number[] | null): number;
        findNearestNeighbors(modelId: string, count?: number): Array<{ model: ModelData; distance: number }>;
        rankBySimilarity(referenceId: string, modelIds?: string[] | null): RankedModel[];
        getFamilyColor(family: string): string;
        signatureToColors(signature: number[] | null): string[];
        valueToColor(value: number): string;
    }

    export function parseModelId(modelId: string): {
        organization: string;
        modelName: string;
        family: string;
        parameters: string | null;
        isInstruct: boolean;
        fullName: string;
    };

    export function formatParameters(num: number | null): string | null;
    export function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number): T;
}
