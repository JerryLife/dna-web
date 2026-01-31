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
    Progress,
    Paper,
    Title,
    Tooltip,
} from '@mantine/core';
import { useData } from '@/contexts/DataContext';
import type { ModelData, RankedModel } from '@/js/data.js';

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

    const getRankIcon = () => {
        if (rank === 0) return '🏆';
        if (rank === 1) return '🥈';
        if (rank === 2) return '🥉';
        return `#${rank + 1}`;
    };

    const familyColor = dataLoader.getFamilyColor(result.family);

    return (
        <Paper
            p="md"
            radius="md"
            withBorder
            style={{
                animation: `fadeInUp 0.3s ease-out ${rank * 0.05}s both`,
            }}
        >
            <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Group gap="md" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                    <Text size="xl" fw={700} style={{ minWidth: 40, textAlign: 'center' }}>
                        {getRankIcon()}
                    </Text>

                    <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={600} truncate>{result.name}</Text>
                        <Group gap="xs">
                            {result.family && (
                                <Badge
                                    size="sm"
                                    variant="light"
                                    style={{
                                        backgroundColor: `${familyColor}22`,
                                        color: familyColor,
                                    }}
                                >
                                    {result.family}
                                </Badge>
                            )}
                            {result.parameters && (
                                <Badge size="sm" variant="light" color="gray">
                                    {result.parameters}
                                </Badge>
                            )}
                        </Group>
                        <MiniBarcode signature={result.signature} dataLoader={dataLoader} />
                    </Stack>
                </Group>

                <Stack gap="xs" align="flex-end" style={{ minWidth: 100 }}>
                    <Text size="xl" fw={700} c="violet">{percent}%</Text>
                    <Text size="xs" c="dimmed">Match</Text>
                    <Progress
                        value={percent}
                        size="sm"
                        color="violet"
                        style={{ width: 80 }}
                    />
                    <Button
                        size="xs"
                        variant="filled"
                        color="violet"
                        fullWidth
                        mt="xs"
                        onClick={onCompare}
                    >
                        Compare
                    </Button>
                </Stack>
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
        <Paper p="lg" radius="md" withBorder mt="xl">
            <Group justify="space-between" mb="lg">
                <Title order={3}>🧬 DNA Comparison</Title>
                <CloseButton onClick={onClose} />
            </Group>

            <Stack gap="xl">
                {/* Row 1: Reference DNA */}
                <div>
                    <Group justify="space-between" mb={4}>
                        <Text fw={600}>{refModel.name}</Text>
                        <Badge variant="dot" size="sm" color="gray">Reference</Badge>
                    </Group>
                    <FullBarcode signature={refModel.signature} dataLoader={dataLoader} />
                </div>

                {/* Row 2: Comparison DNA with Score */}
                <div>
                    <Group justify="space-between" mb={4} align="center">
                        <Group gap="xs">
                            <Text fw={600}>{compModel.name}</Text>
                            <Badge variant="dot" size="sm" color="violet">Comparison</Badge>
                        </Group>
                        <Group gap={6}>
                            <Text size="sm">⚡</Text>
                            <Text fw={700} c="violet">{percent}% Match</Text>
                        </Group>
                    </Group>
                    <FullBarcode signature={compModel.signature} dataLoader={dataLoader} />
                </div>
            </Stack>

            <Stack gap="xs" mt="xl">
                <Group gap="xs">
                    <Title order={5}>Signature Difference</Title>
                    <Text size="xs" c="dimmed">(Darker red = larger difference)</Text>
                </Group>
                <DifferenceHeatmap sig1={refModel.signature} sig2={compModel.signature} />
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
        <div className="page">
            <header className="page-header">
                <h1 className="page-title">Workbench</h1>
                <p className="page-subtitle">
                    Compare model DNAs and discover genetic relationships
                </p>
            </header>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '350px 1fr',
                gap: '2rem',
                marginTop: '2rem',
            }}>
                {/* Selection Panel */}
                <Paper p="lg" radius="md" withBorder>
                    <Title order={4} mb="lg">🔬 Model Selection</Title>

                    <Stack gap="lg">
                        <div>
                            <Text size="sm" fw={500} mb="xs">Reference Model (Anchor)</Text>
                            <ModelCombobox
                                placeholder="Select a reference model..."
                                value={referenceModel}
                                onChange={setReferenceModel}
                                clearable
                            />
                        </div>

                        <div>
                            <Text size="sm" fw={500} mb="xs">Compare Against</Text>
                            <ModelCombobox
                                placeholder="Add models to compare..."
                                value={null}
                                onChange={addComparisonModel}
                                excludeIds={new Set([...comparisonModels, referenceModel ?? ''])}
                            />

                            <Group gap="xs" mt="sm" style={{ flexWrap: 'wrap' }}>
                                {comparisonModels.size === 0 ? (
                                    <Text size="xs" c="dimmed">
                                        No models selected (defaults to All)
                                    </Text>
                                ) : (
                                    Array.from(comparisonModels).map(id => {
                                        const model = dataLoader.getModelById(id);
                                        return (
                                            <Badge
                                                key={id}
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
                            size="lg"
                            leftSection="🧬"
                            disabled={!referenceModel}
                            onClick={runAnalysis}
                            fullWidth
                        >
                            Analyze DNA
                        </Button>
                    </Stack>
                </Paper>

                {/* Results Panel */}
                <Paper p="lg" radius="md" withBorder>
                    <Group justify="space-between" mb="lg">
                        <Title order={4}>📊 Similarity Ranking</Title>
                        {results.length > 0 && (
                            <Text c="dimmed" size="sm">
                                {results.length} matches found
                            </Text>
                        )}
                    </Group>

                    {results.length === 0 ? (
                        <Stack align="center" py="xl" gap="md">
                            <Text size="4rem">🔍</Text>
                            <Text c="dimmed">
                                Select a reference model and click "Analyze DNA" to see results
                            </Text>
                        </Stack>
                    ) : (
                        <ScrollArea h={600} type="auto">
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
                        </ScrollArea>
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
