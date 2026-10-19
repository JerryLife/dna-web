# Corrected cached-response DNA

The public legacy extractor standardized each model separately, projected responses individually, then truncated their concatenation. These batches instead use the official v1.0.1 TextDNAExtractor: Qwen3-Embedding-8B, the same ordered 100 historical random Chinese probes, 64 coordinates per response, concatenation, and a shared seed-42 6,400-to-128 projection. Extra row L2 normalization is disabled.

This replays saved responses; it does not regenerate answers or reproduce the new default 600-probe benchmark protocol. The encoder uses float32 and its default 40,960-token limit. Numerical equivalence of memory-efficient attention was checked on a short sentence; exact equality across GPU attention kernels is not claimed.

Original response caches and replay arrays remain archived locally. Published files carry source hashes, encoder/projection/probe provenance, and empty-answer slots. `dna_sha256` in a published summary hashes its published DNA file; `replay_dna_sha256` hashes the original replay artifact before portable metadata adaptation.

Unclassified empty responses are withheld from the active comparison database. Documented refusals retain zero slots. Each JSON batch manifest lists published and withheld models. Complete replay: 1,793 model/mode entries; published: 183 chat and 1,427 raw; withheld: 183. Separate incompatible historical caches are outside these counts.

The two website modes contain compatible signatures within each mode. Migration switches chat first and raw in its first batch. Historical datasets are retained. Build validation rejects mixed encoders, projections, probe orders and normalization. Merge the batch PRs in order; all target upstream main.

## Review fixes

Tests set `DNA_DATABASE_PATH` to a fresh temporary SQLite file before initializing the database or importing routes. The default application path remains `server/data/lab.db`. Tests never clear application tables. A child-process regression test seeds an existing database in a synthetic checkout, exercises cleanup against a different database, and checks that the application file and all sentinel records are unchanged.

Corrected datasets use `storageLayout: "sha256-v1"`: `dna-v101/<mode>/rand_chinese/m-<SHA256 of exact UTF-8 model ID>/dna.json` and `summary.json`. The original model ID remains in `metadata.model_name`; public IDs and signatures remain stable. Batch manifests include the storage ID and both relative paths. Hash IDs avoid Windows forbidden characters, device names, case-folding and escaping collisions; duplicate mappings are rejected. Published DNA bytes and their hashes are unchanged by this path migration.

The coordinate contract requires all normalization stages, encoder dtype and maximum length, embedding dimensions, prefix selection, aggregation and reduction methods, and projection dtype/shape/RNG/normalization, in addition to pinned encoder, probe and projection hashes. Missing values are rejected on either side. `node scripts/audit_published_dataset.js` checks this contract, portable storage, hashes, manifests and database membership. `node scripts/validate_windows_paths.js` checks tracked filenames, reserved names and case collisions. CI runs clean checkout, validation of the complete published dataset, tests (including a real two-model data build and a fail-closed rebuild), and production build on Linux and Windows.

Four pre-existing raw-cache directories also differed from other directories only by letter case. They are retained under unique `legacy-<hash>` directory names; `scripts/legacy_storage_aliases.json` preserves their original IDs for the legacy loader. Their file contents are unchanged. This allows a clean case-insensitive checkout without deleting either historical cache.
