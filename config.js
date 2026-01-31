export default {
    // Dataset to use for DNA visualization
    dataset: 'squad_cqa_hs_wg_arc_mmlu',

    // Paths
    paths: {
        dnaOut: './dna-out',
        output: './public/dna_database.json'
    },

    // Visualization settings
    visualization: {
        minCount: 5, // Minimum models to show organization separately
        crowdRadius: 6.0 // DBSCAN epsilon equivalent for web
    }
};
