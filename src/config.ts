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
    };
    analytics?: {
        googleTagId?: string;
    };
}

const config: AppConfig = configData;

export default config;
