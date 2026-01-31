/**
 * Galaxy Page - D3 Visualization of Model DNA Space
 * Migrated from galaxy.js to React with D3 for visualization
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import {
    TextInput,
    Checkbox,
    Paper,
    Text,
    Stack,
    Group,
    Button,
    ScrollArea,
    Badge,
} from '@mantine/core';
import { useDebouncedValue, useResizeObserver, useMediaQuery } from '@mantine/hooks';
import { useData } from '@/contexts/DataContext';
import type { ModelData } from '@/utils/data';
import config from '@/config';

// Configuration
const MIN_COUNT = config.visualization?.minCount || 5;
const CROWD_RADIUS = config.visualization?.crowdRadius || 6.0;
const NORMALIZED_SIZE = 1000;

// Generate consistent color for organization
function generateOrgColor(org: string, count: number): string {
    if (count <= 3) return '#9ca3af';
    let hash = 0;
    for (let i = 0; i < org.length; i++) {
        hash = org.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${Math.abs(hash % 360)}, 60%, 45%)`;
}

// Sidebar Component
interface SidebarProps {
    search: string;
    onSearchChange: (value: string) => void;
    showBase: boolean;
    onShowBaseChange: (value: boolean) => void;
    showInstruct: boolean;
    onShowInstructChange: (value: boolean) => void;
    organizations: Array<{ name: string; count: number; color: string }>;
    activeOrgs: Set<string>;
    onToggleOrg: (org: string) => void;
    onSelectAllOrgs: (selected: boolean) => void;
    totalModels: number;
    visibleModels: number;
    collapsed: boolean;
    onToggleCollapse: () => void;
    /** On mobile: drawer is open (overlay visible) */
    mobileOpen?: boolean;
    /** On mobile: close drawer */
    onMobileClose?: () => void;
    isMobile?: boolean;
}

function Sidebar({
    search,
    onSearchChange,
    showBase,
    onShowBaseChange,
    showInstruct,
    onShowInstructChange,
    organizations,
    activeOrgs,
    onToggleOrg,
    onSelectAllOrgs,
    totalModels,
    visibleModels,
    collapsed,
    onToggleCollapse,
    mobileOpen = false,
    onMobileClose,
    isMobile = false,
}: SidebarProps) {
    const allSelected = organizations.every(o => activeOrgs.has(o.name));
    const contentVisible = isMobile ? mobileOpen : !collapsed;

    return (
        <aside
            className={`sidebar ${isMobile && mobileOpen ? 'open' : ''}`}
            style={{
                width: isMobile ? 280 : (collapsed ? 50 : 280),
                transition: 'width 0.3s ease, transform 0.3s ease',
                overflow: 'hidden',
            }}
        >
            <Button
                variant="subtle"
                size="xs"
                onClick={isMobile ? onMobileClose : onToggleCollapse}
                style={{ position: 'absolute', right: 8, top: 8, zIndex: 10 }}
            >
                {isMobile ? '✕' : (collapsed ? '▶' : '◀')}
            </Button>

            {contentVisible && (
                <Stack gap="lg" p="md" pt="xl">
                    {/* Search */}
                    <div>
                        <Text size="sm" fw={500} mb="xs">Search Models</Text>
                        <TextInput
                            placeholder="e.g., Llama-3..."
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            size="sm"
                        />
                    </div>

                    {/* Type Filter */}
                    <div>
                        <Text size="sm" fw={500} mb="xs">Model Type</Text>
                        <Stack gap="xs">
                            <Checkbox
                                label="Base Models"
                                checked={showBase}
                                onChange={(e) => onShowBaseChange(e.target.checked)}
                                size="sm"
                            />
                            <Checkbox
                                label="Instruct-Tuned"
                                checked={showInstruct}
                                onChange={(e) => onShowInstructChange(e.target.checked)}
                                size="sm"
                            />
                        </Stack>
                    </div>

                    {/* Organization Filter */}
                    <div>
                        <Text size="sm" fw={500} mb="xs">Organization</Text>
                        <Checkbox
                            label="Select All"
                            checked={allSelected}
                            onChange={(e) => onSelectAllOrgs(e.target.checked)}
                            size="sm"
                            mb="xs"
                        />
                        <ScrollArea h={200} type="auto">
                            <Stack gap={4}>
                                {organizations.map(({ name, count, color }) => (
                                    <Checkbox
                                        key={name}
                                        checked={activeOrgs.has(name)}
                                        onChange={() => onToggleOrg(name)}
                                        size="xs"
                                        label={
                                            <Group gap="xs" wrap="nowrap">
                                                <div style={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    background: color,
                                                }} />
                                                <Text size="xs" truncate style={{ flex: 1 }}>{name}</Text>
                                                <Text size="xs" c="dimmed">{count}</Text>
                                            </Group>
                                        }
                                    />
                                ))}
                            </Stack>
                        </ScrollArea>
                    </div>

                    {/* Stats */}
                    <Group grow>
                        <Paper p="sm" radius="md" withBorder ta="center">
                            <Text size="xl" fw={700}>{totalModels}</Text>
                            <Text size="xs" c="dimmed">Models</Text>
                        </Paper>
                        <Paper p="sm" radius="md" withBorder ta="center">
                            <Text size="xl" fw={700}>{visibleModels}</Text>
                            <Text size="xs" c="dimmed">Visible</Text>
                        </Paper>
                    </Group>
                </Stack>
            )}
        </aside>
    );
}

// Main Galaxy Page
export default function GalaxyPage() {
    const dataLoader = useData();
    const [containerRef, containerRect] = useResizeObserver();
    const svgRef = useRef<SVGSVGElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    // Dimensions from ResizeObserver (triggers re-render on resize)
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    // Filter state
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebouncedValue(search, 300);
    const [showBase, setShowBase] = useState(true);
    const [showInstruct, setShowInstruct] = useState(true);
    const [activeOrgs, setActiveOrgs] = useState<Set<string>>(new Set());
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
    const isMobile = useMediaQuery('(max-width: 1024px)', false);

    // Stats
    const [visibleCount, setVisibleCount] = useState(0);

    // Get models and organizations
    const models = useMemo(() => dataLoader.getModels(), [dataLoader]);

    const organizations = useMemo(() => {
        const counts = d3.rollup(models, v => v.length, d => d.organization || 'Others');
        return Array.from(counts)
            .filter(([org]) => org !== 'Others')
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({
                name,
                count,
                color: generateOrgColor(name, count),
            }));
    }, [models]);

    // Initialize activeOrgs only on first load (so "Unselect All" can stay empty)
    const hasInitializedOrgs = useRef(false);
    useEffect(() => {
        if (!hasInitializedOrgs.current && organizations.length > 0) {
            hasInitializedOrgs.current = true;
            setActiveOrgs(new Set(organizations.map(o => o.name)));
        }
    }, [organizations]);

    // Organization toggle handlers
    const toggleOrg = useCallback((org: string) => {
        setActiveOrgs(prev => {
            const next = new Set(prev);
            if (next.has(org)) {
                next.delete(org);
            } else {
                next.add(org);
            }
            return next;
        });
    }, []);

    const selectAllOrgs = useCallback((selected: boolean) => {
        if (selected) {
            setActiveOrgs(new Set(organizations.map(o => o.name)));
        } else {
            setActiveOrgs(new Set());
        }
    }, [organizations]);

    // Filter models
    const filterModel = useCallback((model: ModelData) => {
        // Search filter
        if (debouncedSearch) {
            const searchLower = debouncedSearch.toLowerCase();
            if (debouncedSearch.includes('*')) {
                try {
                    const parts = debouncedSearch.split('*');
                    const escapedParts = parts.map(p => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&'));
                    const pattern = escapedParts.join('.*');
                    const regex = new RegExp(`^${pattern}$`, 'i');
                    if (!regex.test(model.name)) return false;
                } catch {
                    if (!model.name.toLowerCase().includes(searchLower)) return false;
                }
            } else {
                if (!model.name.toLowerCase().includes(searchLower)) return false;
            }
        }

        // Type filter
        const matchType = (showBase && !model.isInstruct) || (showInstruct && model.isInstruct);
        if (!matchType) return false;

        // Organization filter
        if (!activeOrgs.has(model.organization)) return false;

        return true;
    }, [debouncedSearch, showBase, showInstruct, activeOrgs]);

    // D3 Visualization
    useEffect(() => {
        const container = containerRef.current;
        const svg = d3.select(svgRef.current);
        const tooltip = tooltipRef.current;

        if (!container || !svg.node() || !tooltip) return;

        // Use ResizeObserver dimensions for responsive sizing
        const width = containerWidth || container.clientWidth;
        const height = containerHeight || container.clientHeight;

        // When nothing to show (no models or no orgs selected), clear chart so areas/dots disappear
        if (models.length === 0 || activeOrgs.size === 0) {
            svg.selectAll('*').remove();
            if (width > 0 && height > 0) {
                svg.attr('width', width).attr('height', height).style('background', '#ffffff');
                const margin = { top: 20, right: 20, bottom: 20, left: 20 };
                const chartWidth = width - margin.left - margin.right;
                const chartHeight = height - margin.top - margin.bottom;
                svg.append('rect')
                    .attr('x', margin.left)
                    .attr('y', margin.top)
                    .attr('width', chartWidth)
                    .attr('height', chartHeight)
                    .attr('fill', 'none')
                    .attr('stroke', '#e5e7eb')
                    .attr('stroke-width', 2);
            }
            setVisibleCount(0);
            return;
        }

        // Skip if dimensions are 0 (not yet measured)
        if (width === 0 || height === 0) return;
        const margin = { top: 20, right: 20, bottom: 20, left: 20 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // Clear previous
        svg.selectAll('*').remove();

        // Setup SVG
        svg.attr('width', width).attr('height', height).style('background', '#ffffff');

        // Border
        svg.append('rect')
            .attr('x', margin.left)
            .attr('y', margin.top)
            .attr('width', chartWidth)
            .attr('height', chartHeight)
            .attr('fill', 'none')
            .attr('stroke', '#e5e7eb')
            .attr('stroke-width', 2);

        // Main group
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);

        // Clip path
        svg.append('defs').append('clipPath')
            .attr('id', 'chart-clip')
            .append('rect')
            .attr('width', chartWidth)
            .attr('height', chartHeight);

        const zoomGroup = g.append('g')
            .attr('clip-path', 'url(#chart-clip)')
            .append('g')
            .attr('class', 'galaxy-zoom-layer');

        const shadowGroup = zoomGroup.append('g').attr('class', 'shadow-layer');
        const dotGroup = zoomGroup.append('g').attr('class', 'dot-layer');

        // Setup zoom
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.5, 20])
            .extent([[0, 0], [chartWidth, chartHeight]])
            .on('zoom', (event) => zoomGroup.attr('transform', event.transform));

        svg.call(zoom);

        // Scales
        const xExtent = d3.extent(models, d => d.x) as [number, number];
        const yExtent = d3.extent(models, d => d.y) as [number, number];
        const innerPadding = 60;

        const xScale = d3.scaleLinear()
            .domain(xExtent)
            .range([innerPadding, chartWidth - innerPadding]);

        const yScale = d3.scaleLinear()
            .domain(yExtent)
            .range([chartHeight - innerPadding, innerPadding]);

        // Org counts for colors
        const orgCounts = d3.rollup(models, v => v.length, d => d.organization || 'Others');

        // Draw density contours for organizations
        const orgGroups = d3.group(models, d => d.organization || 'Others');

        // Normalized scales for contour calculation
        const normXScale = d3.scaleLinear()
            .domain(xExtent)
            .range([innerPadding, NORMALIZED_SIZE - innerPadding]);
        const normYScale = d3.scaleLinear()
            .domain(yExtent)
            .range([NORMALIZED_SIZE - innerPadding, innerPadding]);

        const scaleX = chartWidth / NORMALIZED_SIZE;
        const scaleY = chartHeight / NORMALIZED_SIZE;

        // Helper to find data-space distance between two points (same as galaxy.js)
        const dist = (p1: ModelData, p2: ModelData) => Math.sqrt(
            Math.pow(p1.x! - p2.x!, 2) + Math.pow(p1.y! - p2.y!, 2)
        );

        // Simple clustering in data-space (same as galaxy.js)
        const findDenseCluster = (points: ModelData[], radius: number, minPoints: number): ModelData[] => {
            if (points.length < minPoints) return [];
            const densePoints: ModelData[] = [];
            for (const p of points) {
                const neighbors = points.filter(other => dist(p, other) < radius);
                if (neighbors.length >= minPoints) {
                    densePoints.push(...neighbors);
                }
            }
            // Remove duplicates by id
            const seen = new Set<string>();
            return densePoints.filter(p => {
                if (seen.has(p.id)) return false;
                seen.add(p.id);
                return true;
            });
        };

        const dataRadius = CROWD_RADIUS / 6;
        const bandwidth = 35; // Fixed bandwidth in normalized space

        for (const [org, orgModels] of orgGroups) {
            if (orgModels.length < MIN_COUNT || org === 'Others') continue;
            if (!activeOrgs.has(org)) continue;

            // Filter to dense clusters only (consistent with galaxy.js)
            const clusteredPoints = findDenseCluster(orgModels, dataRadius, 2);
            if (clusteredPoints.length < 2) continue;

            const density = d3.contourDensity<ModelData>()
                .x(d => normXScale(d.x!))
                .y(d => normYScale(d.y!))
                .size([NORMALIZED_SIZE, NORMALIZED_SIZE])
                .bandwidth(bandwidth)
                .thresholds(2);

            const contours = density(clusteredPoints);
            if (!contours || !contours[0]) continue;

            const color = generateOrgColor(org, orgModels.length);

            shadowGroup.append('path')
                .datum(contours[0])
                .attr('fill', color)
                .attr('fill-opacity', 0.15)
                .attr('stroke', color)
                .attr('stroke-width', 1)
                .attr('stroke-opacity', 0.3)
                .attr('d', d3.geoPath())
                .attr('transform', `scale(${scaleX}, ${scaleY})`)
                .style('cursor', 'pointer')
                .on('mouseenter', function (event) {
                    tooltip.innerHTML = `
                        <div style="font-weight: 600">${org}</div>
                        <div style="color: #888">${orgModels.length} models</div>
                    `;
                    tooltip.style.display = 'block';
                    updateTooltipPosition(event);
                })
                .on('mousemove', updateTooltipPosition)
                .on('mouseleave', () => { tooltip.style.display = 'none'; });
        }

        // Draw dots
        let visible = 0;
        const dots = dotGroup.selectAll('.model-dot')
            .data(models)
            .enter().append('circle')
            .attr('class', 'model-dot')
            .attr('cx', d => xScale(d.x!))
            .attr('cy', d => yScale(d.y!))
            .attr('r', 4.5)
            .attr('fill', d => {
                const count = orgCounts.get(d.organization || 'Others') || 0;
                return generateOrgColor(d.organization || 'Others', count);
            })
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1)
            .attr('opacity', 0.9)
            .style('cursor', 'pointer')
            .style('display', d => {
                const isVisible = filterModel(d);
                if (isVisible) visible++;
                return isVisible ? 'block' : 'none';
            })
            .on('mouseenter', function (event, d) {
                const count = orgCounts.get(d.organization || 'Others') || 0;
                const color = generateOrgColor(d.organization || 'Others', count);
                tooltip.innerHTML = `
                    <div style="font-weight: 600">${d.name}</div>
                    <div style="display: flex; gap: 6px; margin-top: 4px;">
                        <span style="background: ${color}44; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${d.organization}</span>
                        ${d.parameters ? `<span style="background: #6b728044; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${d.parameters}</span>` : ''}
                    </div>
                `;
                tooltip.style.display = 'block';
                updateTooltipPosition(event);
            })
            .on('mousemove', updateTooltipPosition)
            .on('mouseleave', () => { tooltip.style.display = 'none'; });

        setVisibleCount(visible);

        function updateTooltipPosition(event: MouseEvent) {
            if (!tooltip) return;
            const rect = tooltip.getBoundingClientRect();
            let left = event.clientX + 15;
            let top = event.clientY + 15;
            if (left + rect.width > window.innerWidth) left = event.clientX - rect.width - 15;
            if (top + rect.height > window.innerHeight) top = window.innerHeight - rect.height - 10;
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
        }

        // Reset zoom function attached to window for button access
        (window as unknown as { resetGalaxyZoom: () => void }).resetGalaxyZoom = () => {
            svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
        };

        // Keyboard shortcut
        const handleKeydown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === '0') {
                e.preventDefault();
                svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
            }
        };
        document.addEventListener('keydown', handleKeydown);

        return () => {
            document.removeEventListener('keydown', handleKeydown);
        };
    }, [models, activeOrgs, filterModel, containerWidth, containerHeight]);

    // Update visibility when filters change
    useEffect(() => {
        const svg = d3.select(svgRef.current);
        let visible = 0;

        svg.selectAll('.model-dot')
            .style('display', function () {
                const d = d3.select(this).datum() as ModelData;
                const isVisible = filterModel(d);
                if (isVisible) visible++;
                return isVisible ? 'block' : 'none';
            });

        setVisibleCount(visible);
    }, [filterModel]);

    const handleResetZoom = () => {
        (window as unknown as { resetGalaxyZoom?: () => void }).resetGalaxyZoom?.();
    };

    return (
        <div className="galaxy-page" style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
            {isMobile && mobileFilterOpen && (
                <div
                    className="galaxy-filter-backdrop"
                    onClick={() => setMobileFilterOpen(false)}
                    onKeyDown={(e) => e.key === 'Escape' && setMobileFilterOpen(false)}
                    role="button"
                    tabIndex={0}
                    aria-label="Close filter"
                />
            )}
            <Sidebar
                search={search}
                onSearchChange={setSearch}
                showBase={showBase}
                onShowBaseChange={setShowBase}
                showInstruct={showInstruct}
                onShowInstructChange={setShowInstruct}
                organizations={organizations}
                activeOrgs={activeOrgs}
                onToggleOrg={toggleOrg}
                onSelectAllOrgs={selectAllOrgs}
                totalModels={models.length}
                visibleModels={visibleCount}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                isMobile={isMobile}
                mobileOpen={mobileFilterOpen}
                onMobileClose={() => setMobileFilterOpen(false)}
            />

            <main style={{ flex: 1, position: 'relative', background: '#f8fafc', overflow: 'hidden', transition: 'all 0.3s ease' }}>
                <div
                    ref={containerRef}
                    style={{
                        width: '100%',
                        height: '100%',
                        padding: 16,
                        position: 'relative',
                    }}
                >
                    <svg
                        ref={svgRef}
                        style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: 8,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        }}
                    />

                    {/* Empty state: prompt to select an organization */}
                    {activeOrgs.size === 0 && organizations.length > 0 && (
                        <Stack
                            align="center"
                            justify="center"
                            gap="xs"
                            style={{
                                position: 'absolute',
                                inset: 16,
                                borderRadius: 8,
                                background: 'rgba(248, 250, 252, 0.9)',
                                pointerEvents: 'none',
                            }}
                        >
                            <Text size="sm" c="dimmed" ta="center">
                                Select an organization on the left to view the galaxy
                            </Text>
                        </Stack>
                    )}

                    {/* Mobile: floating Filter button */}
                    {isMobile && (
                        <Button
                            variant="filled"
                            size="md"
                            onClick={() => setMobileFilterOpen(true)}
                            style={{
                                position: 'absolute',
                                top: 16,
                                left: 16,
                                boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                                zIndex: 10,
                            }}
                        >
                            Filter
                        </Button>
                    )}
                    {/* Reset button positioned inside the container */}
                    <Button
                        variant="white"
                        size="sm"
                        onClick={handleResetZoom}
                        style={{
                            position: 'absolute',
                            top: 32,
                            right: 32,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            zIndex: 10,
                        }}
                    >
                        ⟲ Reset <Badge size="xs" variant="light" ml="xs">Ctrl+0</Badge>
                    </Button>
                </div>

                <div
                    ref={tooltipRef}
                    style={{
                        position: 'fixed',
                        display: 'none',
                        background: 'rgba(30, 30, 40, 0.95)',
                        color: '#fff',
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: 14,
                        pointerEvents: 'none',
                        zIndex: 1000,
                        maxWidth: 300,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                />
            </main>
        </div>
    );
}
