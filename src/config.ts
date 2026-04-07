import configData from '../config.json';

export interface AppConfig {
    dataset: string;
    paths: {
        dnaOut: string;
        output: string;
    };
    visualization: {
        minCount: number;
        crowdRadius: number;
        hullPadding?: number;
        hullTension?: number;
        hullFillOpacity?: number;
        hullStrokeOpacity?: number;
    };
    analytics?: {
        googleTagId?: string;
    };
}

const config: AppConfig = configData;

export default config;
