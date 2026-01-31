/**
 * Workbench Page - Model DNA Comparison Tool
 * Migrated from workbench.js to React with Mantine Combobox
 */
import { useState, useMemo, useCallback } from 'react';
import {
    Combobox,
    InputBase,
    useCombobox,
    ScrollArea,
    Badge,
    Button,
    Group,
    Stack,
    Text,
    CloseButton,
    RingProgress,
    Paper,
    Title,
    Tooltip,
    Divider,
    Box,
} from '@mantine/core';
import { useData } from '@/contexts/DataContext';
import type { ModelData, RankedModel } from '@/utils/data';

// Model Combobox Component
interface ModelComboboxProps {
    placeholder?: string;
    value: string | null;
    onChange: (id: string | null) => void;
    excludeIds?: Set<string>;
    clearable?: boolean;
}

function ModelCombobox({
    placeholder = 'Search models...',
    value,
    onChange,
    excludeIds = new Set(),
    clearable = false,
}: ModelComboboxProps) {
    const dataLoader = useData();
    const [search, setSearch] = useState('');
    const combobox = useCombobox({
        onDropdownClose: () => {
            combobox.resetSelectedOption();
            setSearch('');
        },
    });

    const models = useMemo(() => dataLoader.getModels(), [dataLoader]);

    const filteredModels = useMemo(() => {
        const lowerSearch = search.toLowerCase();
        return models
            .filter(m => !excludeIds.has(m.id))
            .filter(m =>
                m.name.toLowerCase().includes(lowerSearch) ||
                (m.family && m.family.toLowerCase().includes(lowerSearch)) ||
                (m.organization && m.organization.toLowerCase().includes(lowerSearch))
            )
            .slice(0, 50);
    }, [models, search, excludeIds]);

    const selectedModel = useMemo(() =>
        value ? models.find(m => m.id === value) : null
        , [models, value]);

    const options = filteredModels.map((model) => (
        <Combobox.Option value={model.id} key={model.id}>
            <Group justify="space-between" wrap="nowrap">
                <Text size="sm" truncate style={{ maxWidth: 250 }}>{model.name}</Text>
                <Group gap="xs">
                    {model.parameters && (
                        <Badge size="xs" variant="light" color="gray">
                            {model.parameters}
                        </Badge>
                    )}
                </Group>
            </Group>
        </Combobox.Option>
    ));

    return (
        <Combobox
            store={combobox}
            onOptionSubmit={(val) => {
                onChange(val);
                combobox.closeDropdown();
            }}
        >
            <Combobox.Target>
                <InputBase
                    rightSection={
                        clearable && value ? (
                            <CloseButton
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange(null);
                                }}
                            />
                        ) : (
                            <Combobox.Chevron />
                        )
                    }
                    rightSectionPointerEvents={clearable && value ? 'all' : 'none'}
                    value={search || (selectedModel?.name ?? '')}
                    onChange={(event) => {
                        combobox.openDropdown();
                        combobox.updateSelectedOptionIndex();
                        setSearch(event.currentTarget.value);
                    }}
                    onClick={() => combobox.openDropdown()}
                    onFocus={() => combobox.openDropdown()}
                    onBlur={() => {
                        combobox.closeDropdown();
                        setSearch('');
                    }}
                    placeholder={placeholder}
                />
            </Combobox.Target>

            <Combobox.Dropdown>
                <Combobox.Options>
                    <ScrollArea.Autosize type="scroll" mah={300}>
                        {options.length > 0 ? options : (
                            <Combobox.Empty>No models found</Combobox.Empty>
                        )}
                        {filteredModels.length === 50 && (
                            <Text size="xs" c="dimmed" ta="center" py="xs">
                                Showing first 50 results. Keep typing to narrow down.
                            </Text>
                        )}
                    </ScrollArea.Autosize>
                </Combobox.Options>
            </Combobox.Dropdown>
        </Combobox>
    );
}

// Mini Barcode Component
function MiniBarcode({ signature, dataLoader }: { signature: number[] | null; dataLoader: ReturnType<typeof useData> }) {
    if (!signature) return null;

    const colors = dataLoader.signatureToColors(signature);
    const step = Math.ceil(colors.length / 32);

    return (
        <div style={{ display: 'flex', height: 12, gap: 1, borderRadius: 4, overflow: 'hidden' }}>
            {colors.filter((_, i) => i % step === 0).map((color, i) => (
                <div key={i} style={{ background: color, flex: 1 }} />
            ))}
        </div>
    );
}

// Result Card Component
interface ResultCardProps {
    result: RankedModel;
    rank: number;
    dataLoader: ReturnType<typeof useData>;
    onCompare: () => void;
}

function ResultCard({ result, rank, dataLoader, onCompare }: ResultCardProps) {
    const getSimilarityPercent = (distance: number) => {
        const maxDist = 2;
        return Math.max(0, Math.min(100, (1 - distance / maxDist) * 100));
    };

    const percent = Math.round(getSimilarityPercent(result.distance));
    const isTopThree = rank < 3;
    const familyColor = dataLoader.getFamilyColor(result.family);

    return (
        <Paper
            p="md"
            radius="md"
            withBorder
            className="workbench-result-card"
            style={{
                animation: `fadeInUp 0.3s ease-out ${rank * 0.05}s both`,
            }}
        >
            <Group gap="md" wrap="nowrap" className="workbench-result-main" style={{ flex: 1, minWidth: 0 }}>
                <Box
                    className={`workbench-rank-badge ${isTopThree ? `workbench-rank-${rank + 1}` : ''}`}
                    style={{ minWidth: 36, flexShrink: 0 }}
                >
                    <Text size="sm" fw={700} ta="center" c={isTopThree ? undefined : 'dimmed'}>
                        {rank + 1}
                    </Text>
                </Box>
                <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={600} size="sm" truncate>{result.name}</Text>
                    <Group gap="xs">
                        {result.family && (
                            <Badge
                                size="xs"
                                variant="light"
                                style={{
                                    backgroundColor: `${familyColor}18`,
                                    color: familyColor,
                                    fontWeight: 500,
                                }}
                            >
                                {result.family}
                            </Badge>
                        )}
                        {result.parameters && (
                            <Badge size="xs" variant="light" color="gray">
                                {result.parameters}
                            </Badge>
                        )}
                    </Group>
                    <MiniBarcode signature={result.signature} dataLoader={dataLoader} />
                </Stack>
            </Group>
            <Group gap="sm" align="center" className="workbench-result-meta" style={{ flexShrink: 0 }}>
                <Box className="workbench-result-ring-wrap">
                    <RingProgress
                        size={48}
                        thickness={4}
                        roundCaps
                        sections={[{ value: percent, color: 'violet' }]}
                        rootColor="var(--color-bg-tertiary)"
                        label={
                            <Text size="xs" fw={700} ta="center" c="violet" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                {percent}%
                            </Text>
                        }
                        className="workbench-result-progress"
                    />
                </Box>
                <Stack gap={2} align="flex-end" className="workbench-result-percent">
                    <Text size="xs" c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
                        Similarity
                    </Text>
                </Stack>
                <Button
                    size="xs"
                    variant="light"
                    color="violet"
                    className="workbench-result-btn"
                    onClick={onCompare}
                >
                    Compare
                </Button>
            </Group>
        </Paper>
    );
}

// Full Barcode Component
function FullBarcode({ signature, dataLoader }: { signature: number[] | null; dataLoader: ReturnType<typeof useData> }) {
    if (!signature) return <Text c="dimmed">No signature available</Text>;

    const colors = dataLoader.signatureToColors(signature);

    return (
        <div style={{
            display: 'flex',
            height: 40,
            gap: 1,
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
            {colors.map((color, i) => (
                <Tooltip key={i} label={`Dim ${i}: ${signature[i].toFixed(4)}`} withArrow>
                    <div style={{ background: color, flex: 1 }} />
                </Tooltip>
            ))}
        </div>
    );
}

// Difference Heatmap Component
function DifferenceHeatmap({ sig1, sig2 }: { sig1: number[] | null; sig2: number[] | null }) {
    if (!sig1 || !sig2) return null;

    const diffs = sig1.map((v, i) => Math.abs(v - sig2[i]));
    const maxDiff = Math.max(...diffs);

    return (
        <div style={{
            display: 'flex',
            height: 30,
            gap: 1,
            borderRadius: 6,
            overflow: 'hidden',
        }}>
            {diffs.map((diff, i) => {
                const intensity = maxDiff > 0 ? diff / maxDiff : 0;
                return (
                    <Tooltip key={i} label={`Dim ${i}: diff=${diff.toFixed(4)}`} withArrow>
                        <div style={{
                            background: `rgba(239, 68, 68, ${intensity})`,
                            flex: 1,
                        }} />
                    </Tooltip>
                );
            })}
        </div>
    );
}

// Comparison Detail Component
interface ComparisonDetailProps {
    refModel: ModelData;
    compModel: ModelData;
    dataLoader: ReturnType<typeof useData>;
    onClose: () => void;
}

function ComparisonDetail({ refModel, compModel, dataLoader, onClose }: ComparisonDetailProps) {
    const distance = dataLoader.calculateDistance(refModel.signature, compModel.signature);
    const getSimilarityPercent = (d: number) => Math.max(0, Math.min(100, (1 - d / 2) * 100));
    const percent = Math.round(getSimilarityPercent(distance));

    return (
        <Paper p="lg" radius="md" withBorder mt="xl" className="workbench-comparison-detail">
            <Group justify="space-between" mb="md" className="workbench-comparison-header">
                <Group gap="xs">
                    <Title order={4} fw={600}>Pairwise Comparison</Title>
                    <Badge size="sm" variant="light" color="violet">DNA</Badge>
                </Group>
                <CloseButton size="md" onClick={onClose} aria-label="Close comparison" />
            </Group>
            <Divider mb="lg" />

            <Stack gap="xl">
                <div>
                    <Group justify="space-between" mb="xs" className="workbench-comparison-row-header">
                        <Text size="xs" fw={500} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Reference
                        </Text>
                    </Group>
                    <Text fw={600} size="sm" mb="xs" style={{ wordBreak: 'break-word' }}>{refModel.name}</Text>
                    <div className="workbench-barcode-wrap">
                        <FullBarcode signature={refModel.signature} dataLoader={dataLoader} />
                    </div>
                </div>

                <div>
                    <Group justify="space-between" mb="xs" align="center" className="workbench-comparison-row-header">
                        <Text size="xs" fw={500} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Comparison
                        </Text>
                        <Text size="sm" fw={700} c="violet" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {percent}% similarity
                        </Text>
                    </Group>
                    <Text fw={600} size="sm" mb="xs" style={{ wordBreak: 'break-word' }}>{compModel.name}</Text>
                    <div className="workbench-barcode-wrap">
                        <FullBarcode signature={compModel.signature} dataLoader={dataLoader} />
                    </div>
                </div>
            </Stack>

            <Divider my="xl" />
            <Stack gap="xs">
                <Text size="xs" fw={500} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Dimension-wise difference
                </Text>
                <Text size="xs" c="dimmed">Darker intensity indicates larger difference per dimension.</Text>
                <div className="workbench-heatmap-wrap">
                    <DifferenceHeatmap sig1={refModel.signature} sig2={compModel.signature} />
                </div>
            </Stack>
        </Paper>
    );
}

// Main Workbench Page
export default function WorkbenchPage() {
    const dataLoader = useData();

    const [referenceModel, setReferenceModel] = useState<string | null>(null);
    const [comparisonModels, setComparisonModels] = useState<Set<string>>(new Set());
    const [results, setResults] = useState<RankedModel[]>([]);
    const [compareDetailId, setCompareDetailId] = useState<string | null>(null);

    const addComparisonModel = useCallback((id: string | null) => {
        if (id && !comparisonModels.has(id)) {
            setComparisonModels(prev => new Set([...prev, id]));
        }
    }, [comparisonModels]);

    const removeComparisonModel = useCallback((id: string) => {
        setComparisonModels(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    }, []);

    const runAnalysis = useCallback(() => {
        if (!referenceModel) return;

        const modelIds = comparisonModels.size > 0
            ? Array.from(comparisonModels)
            : null;

        const ranked = dataLoader.rankBySimilarity(referenceModel, modelIds);
        setResults(ranked);
    }, [dataLoader, referenceModel, comparisonModels]);

    const refModelData = referenceModel ? dataLoader.getModelById(referenceModel) : null;
    const compModelData = compareDetailId ? dataLoader.getModelById(compareDetailId) : null;

    return (
        <div className="page workbench-page">
            <header className="page-header workbench-header">
                <div className="workbench-header-inner">
                    <h1 className="page-title">Workbench</h1>
                    <Badge size="sm" variant="light" color="violet" className="workbench-badge">
                        DNA Comparison
                    </Badge>
                </div>
                <p className="page-subtitle">
                    Select a reference model and run similarity analysis against the catalog. Optionally narrow by comparison set.
                </p>
            </header>

            <div className="workbench-layout">
                {/* Selection Panel */}
                <Paper p="lg" radius="md" withBorder className="workbench-panel workbench-panel-config">
                    <Text size="xs" fw={600} c="dimmed" mb="md" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Configuration
                    </Text>
                    <Divider mb="lg" />
                    <Stack gap="lg">
                        <div>
                            <Text size="sm" fw={500} mb="xs" className="workbench-label">Reference model</Text>
                            <ModelCombobox
                                placeholder="Choose anchor model..."
                                value={referenceModel}
                                onChange={setReferenceModel}
                                clearable
                            />
                        </div>

                        <div>
                            <Text size="sm" fw={500} mb="xs" className="workbench-label">Compare against (optional)</Text>
                            <ModelCombobox
                                placeholder="Add models to scope..."
                                value={null}
                                onChange={addComparisonModel}
                                excludeIds={new Set([...comparisonModels, referenceModel ?? ''])}
                            />
                            <Group gap="xs" mt="sm" style={{ flexWrap: 'wrap' }}>
                                {comparisonModels.size === 0 ? (
                                    <Text size="xs" c="dimmed">
                                        Leave empty to compare against all models
                                    </Text>
                                ) : (
                                    Array.from(comparisonModels).map(id => {
                                        const model = dataLoader.getModelById(id);
                                        return (
                                            <Badge
                                                key={id}
                                                size="sm"
                                                variant="light"
                                                rightSection={
                                                    <CloseButton
                                                        size="xs"
                                                        onClick={() => removeComparisonModel(id)}
                                                    />
                                                }
                                            >
                                                {model?.name ?? id}
                                            </Badge>
                                        );
                                    })
                                )}
                            </Group>
                        </div>

                        <Button
                            size="md"
                            disabled={!referenceModel}
                            onClick={runAnalysis}
                            fullWidth
                            className="workbench-run-btn"
                        >
                            Run similarity analysis
                        </Button>
                    </Stack>
                </Paper>

                {/* Results Panel */}
                <Paper p="lg" radius="md" withBorder className="workbench-panel workbench-panel-results">
                    <Group justify="space-between" mb="md">
                        <Text size="xs" fw={600} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Results
                        </Text>
                        {results.length > 0 && (
                            <Text size="xs" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                {results.length} model{results.length !== 1 ? 's' : ''}
                            </Text>
                        )}
                    </Group>
                    <Divider mb="lg" />

                    {results.length === 0 ? (
                        <div className="workbench-empty">
                            <div className="workbench-empty-icon" aria-hidden />
                            <Text size="sm" c="dimmed" ta="center" maw={280}>
                                Choose a reference model and run analysis to see ranked similarity results.
                            </Text>
                        </div>
                    ) : (
                        <div className="workbench-results-scroll">
                            <Stack gap="md">
                                {results.slice(0, 50).map((result, index) => (
                                    <ResultCard
                                        key={result.id}
                                        result={result}
                                        rank={index}
                                        dataLoader={dataLoader}
                                        onCompare={() => setCompareDetailId(result.id)}
                                    />
                                ))}
                            </Stack>
                        </div>
                    )}
                </Paper>
            </div>

            {/* Comparison Detail */}
            {refModelData && compModelData && (
                <ComparisonDetail
                    refModel={refModelData}
                    compModel={compModelData}
                    dataLoader={dataLoader}
                    onClose={() => setCompareDetailId(null)}
                />
            )}

            <style>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
