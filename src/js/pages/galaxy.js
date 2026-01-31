import * as d3 from 'd3';
import { debounce } from '../data.js';
import config from '../../../config.js';

export default class GalaxyPage {
  constructor(container) {
    this.container = container;
    this.dataLoader = window.dataLoader;
    this.svg = null;
    this.zoom = null;
    this.filters = {
      search: '',
      showBase: true,
      showInstruct: true,
      activeOrgs: new Set()
    };

    // Use config settings
    this.minCount = config.visualization?.minCount || 5;
    this.crowdRadius = config.visualization?.crowdRadius || 6.0;

    // Cache for pre-calculated contours (computed once in normalized space)
    this.cachedContours = null;
    this.normalizedSize = 1000; // Fixed normalized space for contour calculation
  }

  async render() {
    this.container.innerHTML = this.getTemplate();
    await this.dataLoader.loadDatabase();
    this.initVisualization();
    this.setupEventListeners();
  }

  getTemplate() {
    return `
      <div class="galaxy-page">
        <!-- Sidebar -->
        <aside class="sidebar" id="galaxy-sidebar">
          <button class="sidebar-toggle" id="sidebar-toggle" aria-label="Toggle sidebar">
            ◀
          </button>
          
          <div class="sidebar-content">
            <!-- Search -->
            <div class="form-group">
              <label class="form-label">Search Models</label>
              <input 
                type="text" 
                class="form-input" 
                id="model-search"
                placeholder="e.g., Llama-3..."
              >
            </div>

            <!-- Filters -->
            <div class="form-group">
              <label class="form-label">Model Type</label>
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="filter-base" checked>
                  <span>Base Models</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" id="filter-instruct" checked>
                  <span>Instruct-Tuned</span>
                </label>
              </div>
            </div>

            <!-- Organization Filter -->
            <div class="sidebar-section">
              <label class="form-label">Organization</label>
              <div id="org-filter-list" class="org-filter-list">
                <!-- Populated dynamically -->
              </div>
            </div>

            <!-- Stats -->
            <div class="sidebar-section stats-section">
              <div class="stat-item">
                <span class="stat-value" id="model-count">0</span>
                <span class="stat-label">Models</span>
              </div>
              <div class="stat-item">
                <span class="stat-value" id="visible-count">0</span>
                <span class="stat-label">Visible</span>
              </div>
            </div>
          </div>
        </aside>

        <!-- Main Visualization -->
        <main class="main-with-sidebar full-width">
          <div class="galaxy-container full-size" id="galaxy-container">
            <svg class="galaxy-canvas" id="galaxy-canvas"></svg>
            <button class="reset-zoom-btn" id="reset-zoom" title="Reset Zoom (Ctrl+0)">
              ⟲ <span class="shortcut-hint">Ctrl+0</span>
            </button>
          </div>
          
          <div class="dna-card" id="dna-tooltip" style="display: none;">
            <div class="dna-card-title" id="tooltip-title"></div>
            <div class="dna-card-meta" id="tooltip-meta"></div>
            <div class="dna-card-details" id="tooltip-details"></div>
          </div>
        </main>
      </div>
    `;
  }

  initVisualization() {
    const container = document.getElementById('galaxy-container');
    const svg = d3.select('#galaxy-canvas');
    if (!container || !svg.node()) return;

    // Use full container size with padding for border
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Set SVG background (white)
    svg.attr('width', width)
      .attr('height', height)
      .style('background', '#ffffff');

    // Define chart area (border)
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Clear previous
    svg.selectAll('*').remove();

    // Border Rect
    svg.append('rect')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', chartWidth)
      .attr('height', chartHeight)
      .attr('fill', 'none')
      .attr('stroke', '#e5e7eb') // Light grey border
      .attr('stroke-width', 2);

    // Group translated by margin
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)
      .attr('class', 'galaxy-wrapper');

    // Clip Path to keep zoom inside border
    svg.append('defs').append('clipPath')
      .attr('id', 'chart-clip')
      .append('rect')
      .attr('width', chartWidth)
      .attr('height', chartHeight);

    const zoomGroup = g.append('g')
      .attr('clip-path', 'url(#chart-clip)')
      .append('g')
      .attr('class', 'galaxy-zoom-layer');

    this.shadowGroup = zoomGroup.append('g').attr('class', 'shadow-layer');
    this.dotGroup = zoomGroup.append('g').attr('class', 'dot-layer');
    this.labelGroup = zoomGroup.append('g').attr('class', 'label-layer');

    this.zoom = d3.zoom()
      .scaleExtent([0.5, 20])
      .extent([[0, 0], [chartWidth, chartHeight]])
      .on('zoom', (event) => zoomGroup.attr('transform', event.transform));

    svg.call(this.zoom);

    const models = this.dataLoader.getModels();
    if (!models.length) return;

    this.updateStats(models.length, models.length);

    // Dynamic scale based on data extent
    const xExtent = d3.extent(models, d => d.x);
    const yExtent = d3.extent(models, d => d.y);
    const innerPadding = 60; // Padding inside the border

    this.xScale = d3.scaleLinear()
      .domain(xExtent)
      .range([innerPadding, chartWidth - innerPadding]);

    this.yScale = d3.scaleLinear()
      .domain(yExtent)
      .range([chartHeight - innerPadding, innerPadding]);

    // Pre-calculate per-org model counts for color logic
    this.orgCounts = d3.rollup(models, v => v.length, d => d.organization || 'Others');

    // Render layers
    this.drawShadows(models, chartWidth, chartHeight);
    this.drawDots(models);
    this.drawLabels(models);
    this.populateOrgFilters();
  }

  drawShadows(models, width, height) {
    this.shadowGroup.selectAll('*').remove();

    // Calculate scale factors from normalized space to current viewport
    const scaleX = width / this.normalizedSize;
    const scaleY = height / this.normalizedSize;

    // If contours are not cached, compute them once in normalized space
    if (!this.cachedContours) {
      this.cachedContours = this.computeNormalizedContours(models);
    }

    // Render cached contours with transform
    for (const { org, contour, color, count } of this.cachedContours) {
      this.shadowGroup.append('path')
        .datum(contour)
        .attr('class', 'org-area')
        .attr('data-org', org)
        .attr('fill', color)
        .attr('fill-opacity', 0.15)
        .attr('stroke', color)
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.3)
        .attr('d', d3.geoPath())
        .attr('transform', `scale(${scaleX}, ${scaleY})`)
        .style('cursor', 'pointer')
        .on('mouseenter', (event) => this.showAreaTooltip(event, org, count, color))
        .on('mouseleave', () => this.hideTooltip())
        .on('mousemove', (event) => this.updateAreaTooltipPosition(event));
    }
  }

  // Compute contours once in normalized 1000x1000 space
  computeNormalizedContours(models) {
    const orgGroups = d3.group(models, d => d.organization || 'Others');
    const cachedContours = [];

    // Get data extent for normalized scales
    const xExtent = d3.extent(models, d => d.x);
    const yExtent = d3.extent(models, d => d.y);
    const padding = 60;

    // Create normalized scales (0-1000)
    const normXScale = d3.scaleLinear()
      .domain(xExtent)
      .range([padding, this.normalizedSize - padding]);
    const normYScale = d3.scaleLinear()
      .domain(yExtent)
      .range([this.normalizedSize - padding, padding]);

    // Helper to find data-space distance between two points
    const dist = (p1, p2) => Math.sqrt(
      Math.pow(p1.x - p2.x, 2) +
      Math.pow(p1.y - p2.y, 2)
    );

    // Simple clustering in data-space
    const findDenseCluster = (points, radius = 2, minPoints = 2) => {
      if (points.length < minPoints) return [];
      const densePoints = [];
      for (const p of points) {
        const neighbors = points.filter(other => dist(p, other) < radius);
        if (neighbors.length >= minPoints) {
          densePoints.push(...neighbors);
        }
      }
      return [...new Set(densePoints)];
    };

    const dataRadius = this.crowdRadius / 6;
    const bandwidth = 35; // Fixed bandwidth in normalized space

    for (const [org, orgModels] of orgGroups) {
      if (orgModels.length < this.minCount || org === 'Others') continue;

      const clusteredPoints = findDenseCluster(orgModels, dataRadius, 2);
      if (clusteredPoints.length < 2) continue;

      const density = d3.contourDensity()
        .x(d => normXScale(d.x))
        .y(d => normYScale(d.y))
        .size([this.normalizedSize, this.normalizedSize])
        .bandwidth(bandwidth)
        .thresholds(2);

      const contours = density(clusteredPoints);
      if (!contours || !contours[0]) continue;

      const color = this.generateOrgColor(org, orgModels.length);
      cachedContours.push({ org, contour: contours[0], color, count: orgModels.length });
    }

    return cachedContours;
  }

  drawDots(models) {
    this.dotGroup.selectAll('*').remove();
    this.dots = this.dotGroup.selectAll('.model-dot')
      .data(models)
      .enter().append('circle')
      .attr('class', 'model-dot')
      .attr('cx', d => this.xScale(d.x))
      .attr('cy', d => this.yScale(d.y))
      .attr('r', 4.5)
      .attr('fill', d => {
        const count = this.orgCounts.get(d.organization || 'Others') || 0;
        return this.generateOrgColor(d.organization || 'Others', count);
      })
      .attr('stroke', '#ffffff') // White stroke for separation on white bg
      .attr('stroke-width', 1)
      .attr('opacity', 0.9)
      .style('cursor', 'pointer')
      .on('mouseenter', (e, d) => this.showTooltip(e, d))
      .on('mouseleave', () => this.hideTooltip())
      .on('click', (e, d) => this.onDotClick(d));
  }

  drawLabels(models) {
    this.labelGroup.selectAll('*').remove();
    // Removed per user request to prevent confusion (text for area).
    // Labels are now only shown on hover via tooltips.
  }

  generateOrgColor(org, count = 10) {
    // "Models less or eq 3 as grey color"
    if (count <= 3) return '#9ca3af'; // Gray

    let hash = 0;
    for (let i = 0; i < org.length; i++) hash = org.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash % 360)}, 60%, 45%)`; // Darker for visibility on white
  }

  populateOrgFilters() {
    const list = document.getElementById('org-filter-list');
    if (!list) return;

    // Sort by count
    const models = this.dataLoader.getModels();
    const orgCounts = d3.rollup(models, v => v.length, d => d.organization || 'Others');
    const sortedOrgs = Array.from(orgCounts)
      .filter(([org]) => org !== 'Others')
      .sort((a, b) => b[1] - a[1]);

    // Select All Header
    let html = `
      <div class="checkbox-group header-actions" style="margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1);">
        <label class="checkbox-label highlight">
            <input type="checkbox" id="select-all-orgs" checked>
            <span>Select All</span>
        </label>
      </div>
    `;

    html += sortedOrgs.map(([org, count]) => `
      <label class="checkbox-label" style="display:flex; align-items:center; gap:8px;">
        <input type="checkbox" value="${org}" class="org-filter" checked>
        <span style="width:8px; height:8px; border-radius:50%; background:${this.generateOrgColor(org, count)}"></span>
        <span style="font-size:0.85em; flex:1;">${org}</span>
        <span style="font-size:0.75em; opacity:0.6;">${count}</span>
      </label>
    `).join('');

    list.innerHTML = html;

    // Listeners
    const allCheckbox = document.getElementById('select-all-orgs');
    const orgCheckboxes = list.querySelectorAll('.org-filter');

    // Populate initial active set
    sortedOrgs.forEach(([o]) => this.filters.activeOrgs.add(o));

    allCheckbox.addEventListener('change', (e) => {
      const checked = e.target.checked;
      orgCheckboxes.forEach(cb => cb.checked = checked);

      this.filters.activeOrgs.clear();
      if (checked) {
        sortedOrgs.forEach(([o]) => this.filters.activeOrgs.add(o));
      }
      this.applyFilters();
    });

    orgCheckboxes.forEach(cb => {
      cb.addEventListener('change', (e) => {
        if (e.target.checked) this.filters.activeOrgs.add(e.target.value);
        else this.filters.activeOrgs.delete(e.target.value);

        allCheckbox.checked = Array.from(orgCheckboxes).every(c => c.checked);
        this.applyFilters();
      });
    });
  }

  applyFilters() {
    if (!this.dots) return;
    let visible = 0;

    this.dots.style('display', d => {
      const matchSearch = !this.filters.search || d.name.toLowerCase().includes(this.filters.search.toLowerCase());
      const matchType = (this.filters.showBase && !d.isInstruct) || (this.filters.showInstruct && d.isInstruct);
      const matchOrg = this.filters.activeOrgs.has(d.organization);

      const isVisible = matchSearch && matchType && matchOrg;
      if (isVisible) visible++;
      return isVisible ? 'block' : 'none';
    });
    this.updateStats(this.dataLoader.getModels().length, visible);
  }

  updateStats(total, visible) {
    document.getElementById('model-count').textContent = total;
    document.getElementById('visible-count').textContent = visible;
  }

  showTooltip(event, model) {
    const tooltip = document.getElementById('dna-tooltip');
    if (!tooltip) return;

    const count = this.orgCounts.get(model.organization) || 0;
    const color = this.generateOrgColor(model.organization, count);

    document.getElementById('tooltip-title').textContent = model.name;
    document.getElementById('tooltip-meta').innerHTML = `
        <span class="badge" style="background:${color}44; color:#fff;">${model.organization}</span>
        ${model.parameters ? `<span class="badge">${model.parameters}</span>` : ''}
      `;

    const rect = event.target.getBoundingClientRect();
    const tRect = tooltip.getBoundingClientRect();

    // Better positioning
    let left = rect.left + 20;
    let top = rect.top - 10;

    // Check boundaries
    if (left + tRect.width > window.innerWidth) left = rect.left - tRect.width - 20;
    if (top + tRect.height > window.innerHeight) top = window.innerHeight - tRect.height - 10;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.display = 'block';
  }

  hideTooltip() {
    const t = document.getElementById('dna-tooltip');
    if (t) t.style.display = 'none';
  }

  showAreaTooltip(event, org, modelCount, color) {
    const tooltip = document.getElementById('dna-tooltip');
    if (!tooltip) return;

    document.getElementById('tooltip-title').textContent = org;
    document.getElementById('tooltip-meta').innerHTML = `
      <span class="badge" style="background:${color}44; color:#333;">${modelCount} models</span>
    `;
    document.getElementById('tooltip-details').textContent = 'Organization Territory';

    this.updateAreaTooltipPosition(event);
    tooltip.style.display = 'block';
  }

  updateAreaTooltipPosition(event) {
    const tooltip = document.getElementById('dna-tooltip');
    if (!tooltip) return;

    const tRect = tooltip.getBoundingClientRect();
    let left = event.clientX + 15;
    let top = event.clientY + 15;

    // Check boundaries
    if (left + tRect.width > window.innerWidth) left = event.clientX - tRect.width - 15;
    if (top + tRect.height > window.innerHeight) top = window.innerHeight - tRect.height - 10;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  onDotClick(model) {
    // Stub
  }

  handleResize() {
    const container = document.getElementById('galaxy-container');
    if (!container || !this.svg) return;
    this.svg.selectAll('*').remove();
    this.initVisualization();
  }

  setupEventListeners() {
    // Store svg reference for resize
    this.svg = d3.select('#galaxy-canvas');

    // Reset zoom button
    document.getElementById('reset-zoom')?.addEventListener('click', () => this.resetZoom());

    // Keyboard shortcut: Ctrl+0
    this.keyHandler = (e) => {
      if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        this.resetZoom();
      }
    };
    document.addEventListener('keydown', this.keyHandler);

    // Resize Observer
    this.resizeObserver = new ResizeObserver(() => {
      debounce(() => this.handleResize(), 200)();
    });
    const container = document.getElementById('galaxy-container');
    if (container) this.resizeObserver.observe(container);

    // Sidebar Toggle
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
      document.getElementById('galaxy-sidebar').classList.toggle('collapsed');
      setTimeout(() => this.handleResize(), 350);
    });

    // Inputs
    document.getElementById('filter-base')?.addEventListener('change', e => {
      this.filters.showBase = e.target.checked;
      this.applyFilters();
    });
    document.getElementById('filter-instruct')?.addEventListener('change', e => {
      this.filters.showInstruct = e.target.checked;
      this.applyFilters();
    });
    document.getElementById('model-search')?.addEventListener('input', debounce(e => {
      this.filters.search = e.target.value;
      this.applyFilters();
    }, 300));
  }

  resetZoom() {
    if (this.zoom && this.svg) {
      this.svg.transition().duration(500).call(this.zoom.transform, d3.zoomIdentity);
    }
  }

  destroy() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.keyHandler) document.removeEventListener('keydown', this.keyHandler);
    this.hideTooltip();
  }
}
