import configData from '../config.json';

export interface VisualizationConfig {
    minCount: number;
    crowdRadius: number;
    hullPadding?: number;
    hullTension?: number;
    hullFillOpacity?: number;
    hullStrokeOpacity?: number;
}

export interface DatasetConfig {
    dnaOut: string;
    dataset: string;
    output: string;
    visualization?: VisualizationConfig;
}

export interface AppConfig {
    dataset: string;
    paths: {
        dnaOut: string;
        output: string;
    };
    datasets?: {
        raw?: DatasetConfig;
        chat?: DatasetConfig;
    };
    visualization: VisualizationConfig;
    analytics?: {
        googleTagId?: string;
    };
}

const config: AppConfig = configData;

export default config;
