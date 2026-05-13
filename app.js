// Define Map Layers
const layers = {
    satellite: L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 22,
        maxNativeZoom: 20,
        attribution: '&copy; Google'
    }),
    topographic: L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
        maxZoom: 22,
        maxNativeZoom: 18,
        attribution: '&copy; Google'
    })
};

// Initialize Map
const map = L.map('map', {
    zoomControl: false,
    attributionControl: false,
    maxZoom: 22,
    layers: [layers.satellite] // Default layer
}).setView(mockData.roi.center, mockData.roi.zoom);

function switchLayer(layerId) {
    // Remove all layers
    Object.values(layers).forEach(layer => map.removeLayer(layer));
    // Add selected layer
    layers[layerId].addTo(map);

    // Update UI buttons
    document.querySelectorAll('.layer-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.layer === layerId);
    });
}

// Add Watershed GeoJSON
const watershedLayer = L.geoJSON(watershedGeoJSON, {
    style: {
        color: "#10b981",
        weight: 2,
        fillOpacity: 0.1,
        fillColor: "#10b981"
    }
}).addTo(map);

// Fit map to watershed bounds
map.fitBounds(watershedLayer.getBounds());

// --- River Data Integration ---
const riverLayer = L.geoJSON(riverGeoJSON, {
    style: {
        color: "#3b82f6",
        weight: 5,
        opacity: 0.9
    },
    onEachFeature: (feature, layer) => {
        layer.bindTooltip(feature.properties.name || "Deka River Path", { sticky: true });
    }
}).addTo(map);

// --- Mines Data Integration ---
const mineIcon = L.divIcon({
    className: 'mine-marker',
    html: '<div class="mine-dot"><i data-lucide="pickaxe"></i></div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

const minesLayer = L.geoJSON(minesGeoJSON, {
    pointToLayer: (feature, latlng) => {
        return L.marker(latlng, { icon: mineIcon });
    },
    onEachFeature: (feature, layer) => {
        const props = feature.properties;
        const popupContent = `
            <div class="mine-popup">
                <h3>${props.name}</h3>
                <div class="mine-attr">
                    <span>Type:</span> <span>${props.type}</span>
                </div>
                <div class="mine-attr">
                    <span>Status:</span> <span class="status-${props.status.toLowerCase()}">${props.status}</span>
                </div>
                <div class="mine-attr">
                    <span>Minerals:</span> <span>${props.minerals}</span>
                </div>
                <div class="mine-attr">
                    <span>Tonnage:</span> <span>${props.tonnage}</span>
                </div>
                <div class="mine-attr">
                    <span>Started:</span> <span>${props.start_year}</span>
                </div>
                <button class="btn-analyze" onclick="analyzeMine('${props.name}', ${feature.geometry.coordinates[1]}, ${feature.geometry.coordinates[0]})">
                    Analyze Impact
                </button>
            </div>
        `;
        layer.bindPopup(popupContent);
    }
}).addTo(map);

// Global function for mine analysis (can be called from popup)
window.analyzeMine = (name, lat, lng) => {
    updatePanelHeader(`Mine Analysis: ${name}`);
    map.setView([lat, lng], 15);
    // Trigger the same analysis as clicking on the map
    map.fire('click', { latlng: L.latLng(lat, lng) });
};

// Mines Toggle Listener
document.getElementById('toggle-mines').addEventListener('click', (e) => {
    if (map.hasLayer(minesLayer)) {
        map.removeLayer(minesLayer);
        e.currentTarget.classList.remove('active');
    } else {
        minesLayer.addTo(map);
        e.currentTarget.classList.add('active');
        lucide.createIcons(); // Ensure icon in markers is rendered
    }
});

// River Toggle Listener
document.getElementById('toggle-river').addEventListener('click', (e) => {
    if (map.hasLayer(riverLayer)) {
        map.removeLayer(riverLayer);
        e.currentTarget.classList.remove('active');
    } else {
        riverLayer.addTo(map);
        e.currentTarget.classList.add('active');
    }
});

// Layer Toggle Listeners
document.querySelectorAll('.layer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        switchLayer(btn.dataset.layer);
    });
});

// Map Control Listeners (Zoom)
document.getElementById('zoom-in').addEventListener('click', () => map.zoomIn());
document.getElementById('zoom-out').addEventListener('click', () => map.zoomOut());
document.getElementById('center-roi').addEventListener('click', () => {
    map.fitBounds(mockData.roi.bounds);
    updatePanelHeader('Deka River Reach - ROI 1');
});

// ─── POINT ANALYSIS (FULL-STACK INTEGRATION) ───
let currentMarker = null;

map.on('click', async function (e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    // Drop or move marker
    if (currentMarker) {
        currentMarker.setLatLng(e.latlng);
    } else {
        currentMarker = L.marker(e.latlng).addTo(map);
    }

    // Update UI Header
    updatePanelHeader(`Point Analysis: [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);

    // Show loading state on WQI Gauge
    const wqiValEl = document.getElementById('wqi-value');
    if (wqiValEl) wqiValEl.innerHTML = '<span style="font-size: 14px">Loading...</span>';

    try {
        // Fetch real or simulated GEE data from Python Backend
        console.log(`[App] Fetching GEE data for point ${lat}, ${lng}...`);
        const response = await fetch(`https://deka-river-monitoring.onrender.com/`);

        if (!response.ok) throw new Error('Backend server error');

        const result = await response.json();
        console.log('[App] Received Point Data:', result);

        if (result.success && result.indices) {
            // Re-run the Hybrid Model with this localized data
            const localizedData = { gee: result.indices };
            HybridModel.run(localizedData);
        } else {
            throw new Error(result.error || 'Failed to extract indices');
        }
    } catch (error) {
        console.error('[App] Point Analysis Failed:', error);

        // Fallback: If Python backend is not running, show alert but still try to run model
        // with default simulated data so the UI doesn't break
        alert('Backend server not reachable. Please start the Python backend (uvicorn main:app --reload) for point analysis. Falling back to default simulation.');
        HybridModel.run();
    }
});

function updatePanelHeader(text) {
    const headerP = document.querySelector('.analysis-panel .panel-header p');
    if (headerP) headerP.textContent = text;
}


// Chart Initialization
let trendChart;

function initChart(data) {
    const ctx = document.getElementById('trendChart').getContext('2d');

    if (trendChart) {
        trendChart.destroy();
    }

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.history.map(h => h.date),
            datasets: [{
                label: data.name,
                data: data.history.map(h => h.value),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#10b981'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

// Update UI with Index Data
function updateUI(indexId) {
    const data = mockData.indices.find(i => i.id === indexId);
    if (!data) return;

    // Update Text Elements
    document.querySelector('.panel-header h2').textContent = data.name;
    document.querySelector('.stat-value').textContent = data.currentValue;
    document.querySelector('.stat-trend').innerHTML = `<i data-lucide="${data.trend > 0 ? 'trending-up' : 'trending-down'}"></i> ${Math.abs(data.trend)}%`;
    document.querySelector('.stat-trend').className = `stat-trend ${data.trend > 0 ? 'positive' : 'negative'}`;

    // Update Legend
    document.querySelector('.legend-panel h3').textContent = `${data.id.toUpperCase()} Index`;
    document.querySelector('.legend-gradient').style.background = `linear-gradient(to right, ${data.palette.join(', ')})`;

    // Re-initialize Icons
    lucide.createIcons();

    // Update Chart
    initChart(data);
}

// Event Listeners for Index Chips
document.querySelectorAll('.index-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
        document.querySelectorAll('.index-chip').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');

        const indexMap = {
            'AMDI': 'amdi',
            'Salinity': 'salinity',
            'Heavy Metals': 'heavy_metals',
            'Aluminium': 'aluminium',
            'NDWI': 'ndwi',
            'Ferric Iron': 'ferric_iron',
            'Turbidity': 'turbidity',
            'Manganese': 'manganese',
            'AMWI': 'amwi',
            'Iron Sulfate': 'iron_sulfate',
            'Red Edge': 'red_edge_stress',
            'Saturation': 'saturation'
        };

        updateUI(indexMap[e.target.textContent]);
    });
});

// Sidebar Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        const view = item.dataset.view;
        if (!view) return; // Skip items without data-view (like logout)

        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // Handle GEE modal separately (doesn't switch main view)
        if (view === 'gee') {
            document.getElementById('gee-modal').style.display = 'flex';
            return;
        }

        // Hide all views
        document.getElementById('map-container').style.display = 'none';
        document.querySelector('.analysis-panel').style.display = 'none';
        document.querySelector('.timeline-footer').style.display = 'none';

        // Show selected view
        if (view === 'dashboard') {
            document.getElementById('map-container').style.display = 'flex';
            document.querySelector('.analysis-panel').style.display = 'flex';
            document.querySelector('.timeline-footer').style.display = 'flex';
        }
        // Add other views as needed
    });
});

// GEE Modal Controls
document.getElementById('gee-close')?.addEventListener('click', () => {
    document.getElementById('gee-modal').style.display = 'none';
});

document.getElementById('gee-external')?.addEventListener('click', () => {
    window.open('https://deka-amd.projects.earthengine.app/view/deka-river-amd-monitoring', '_blank');
});

document.getElementById('gee-refresh')?.addEventListener('click', () => {
    const iframe = document.getElementById('gee-iframe');
    if (iframe) iframe.src = iframe.src;
});

// GEE Sync/Import/Export Controls
document.getElementById('gee-sync')?.addEventListener('click', () => {
    if (typeof GEEAPI !== 'undefined') {
        GEEAPI.requestData();
        GEEAPI.syncWithDashboard();
        alert('Syncing with GEE data...');
    }
});

document.getElementById('gee-export')?.addEventListener('click', () => {
    if (typeof GEEAPI !== 'undefined') {
        GEEAPI.exportData();
    }
});

document.getElementById('gee-import')?.addEventListener('click', () => {
    if (typeof GEEAPI !== 'undefined') {
        GEEAPI.showImportDialog();
    }
});

// Close modal on overlay click
document.getElementById('gee-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'gee-modal') {
        document.getElementById('gee-modal').style.display = 'none';
    }
});

// Timeline Slider
const slider = document.querySelector('.timeline-slider');
const dateDisplay = document.querySelector('.current-date');
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

slider.addEventListener('input', (e) => {
    const val = e.target.value;
    const monthIndex = Math.floor((val / 100) * 11);
    dateDisplay.textContent = `24 ${months[monthIndex]} 2024`;
});

// Initial Load
window.addEventListener('load', () => {
    updateUI('amdi');

    // Initialize all services
    initServices();
});

// Initialize all services
function initServices() {
    console.log('[App] Initializing services...');

    // 1. Initialize GEE API
    if (typeof GEEAPI !== 'undefined') {
        GEEAPI.init();
        GEEAPI.onUpdate((data) => {
            console.log('[App] GEE data updated:', data);
            updateGEESyncStatus(Object.keys(data).length);
        });
    }

    // 2. Initialize In-Situ Service
    if (typeof InsituAPI !== 'undefined') {
        InsituAPI.init();
        InsituAPI.onUpdate((data) => {
            console.log('[App] In-situ data updated');
            updateInsituStatus(data.length);
        });
    }

    // 3. Initialize Fusion Engine
    if (typeof FusionEngine !== 'undefined') {
        FusionEngine.init();
        FusionEngine.subscribe((fusedData) => {
            console.log('[App] Data fused:', Object.keys(fusedData).length, 'variables');
            updateFusionStatus(true);
        });
    }

    // 4. Initialize Hybrid Model
    if (typeof HybridModel !== 'undefined') {
        HybridModel.init();
        HybridModel.subscribe((results) => {
            console.log('[App] Model ran. WQI:', results.wqi);
            updateDashboard(results);
        });

        // Run initial model with sample data
        setTimeout(() => {
            HybridModel.run();
        }, 1000);
    }
}

// Update GEE sync status indicator
function updateGEESyncStatus(connectedIndices) {
    const statusEl = document.getElementById('gee-status');
    if (statusEl) {
        if (connectedIndices > 0) {
            statusEl.classList.add('connected');
            statusEl.title = `${connectedIndices} indices synced from GEE`;
        } else {
            statusEl.classList.remove('connected');
            statusEl.title = 'Connecting to GEE...';
        }
    }
}

// Update In-situ status
function updateInsituStatus(count) {
    console.log('[App] In-situ measurements:', count);
}

// Update Fusion status
function updateFusionStatus(connected) {
    const statusEl = document.getElementById('fusion-status');
    if (statusEl) {
        if (connected) {
            statusEl.classList.add('connected');
        }
    }
}

// Update dashboard with model results
function updateDashboard(results) {
    if (!results) return;

    // ─── WQI Gauge ───
    const gaugeEl = document.getElementById('gauge-fill');
    const wqiValEl = document.getElementById('wqi-value');
    const wqiRiskEl = document.getElementById('wqi-risk');
    const wqiCiEl = document.getElementById('wqi-ci');
    const wqiTimeEl = document.getElementById('wqi-time');

    if (gaugeEl && wqiValEl) {
        const wqi = results.wqi || 0;
        const circumference = 326.7;
        const offset = circumference - (wqi / 100) * circumference;
        gaugeEl.style.strokeDashoffset = offset;

        // Color based on risk
        const colors = { Excellent: '#10b981', Good: '#3b82f6', Fair: '#fbbf24', Poor: '#f97316', Critical: '#ef4444' };
        const color = colors[results.riskLevel] || results.riskColor || '#94a3b8';
        gaugeEl.style.stroke = color;

        wqiValEl.textContent = wqi;
        if (wqiRiskEl) {
            wqiRiskEl.textContent = results.riskLevel || 'Unknown';
            wqiRiskEl.style.background = color + '22';
            wqiRiskEl.style.color = color;
        }
        if (wqiCiEl && results.ci95) {
            wqiCiEl.textContent = `CI: ${results.ci95[0]}–${results.ci95[1]}`;
        }
        if (wqiTimeEl) {
            wqiTimeEl.textContent = `${results.meta?.executionTime_ms || 0}ms • ${results.meta?.activeLayers || 0}/8 layers`;
        }
    }

    // ─── Model Intelligence Layers ───
    const layerMap = {
        physics: results.layers?.physics,
        ml: results.layers?.ml,
        dl: results.layers?.deepLearning,
        ts: results.layers?.timeSeries,
        anomaly: results.layers?.anomaly,
        bayes: results.layers?.bayesian,
        meta: results
    };
    let activeLayers = 0;
    Object.entries(layerMap).forEach(([key, layer]) => {
        const row = document.querySelector(`.layer-row[data-layer="${key}"]`);
        const wqiSpan = document.getElementById(`l-${key}`);
        if (row && layer) {
            row.classList.add('active');
            activeLayers++;
            if (wqiSpan) {
                if (key === 'anomaly') wqiSpan.textContent = layer.riskLevel || '--';
                else wqiSpan.textContent = layer.wqi != null ? layer.wqi : '--';
            }
        } else if (row) {
            row.classList.remove('active');
        }
    });
    const layerCountEl = document.getElementById('layer-count');
    if (layerCountEl) layerCountEl.textContent = `${activeLayers}/8 layers`;

    // Agreement bar
    const agFill = document.getElementById('agreement-fill');
    const agPct = document.getElementById('agreement-pct');
    if (agFill && results.agreement != null) {
        agFill.style.width = `${results.agreement * 100}%`;
        if (agPct) agPct.textContent = `${Math.round(results.agreement * 100)}%`;
    }

    // ─── EMA Compliance ───
    const emaGrid = document.getElementById('ema-grid');
    const emaScoreEl = document.getElementById('ema-score');
    const emaData = results.emaCompliance || results.layers?.anomaly?.ema;
    if (emaGrid && emaData?.compliance) {
        emaGrid.innerHTML = '';
        Object.entries(emaData.compliance).forEach(([key, item]) => {
            const div = document.createElement('div');
            div.className = 'ema-item';
            div.innerHTML = `<span class="ema-dot ${item.status}"></span><span class="ema-value">${item.value != null ? item.value : '--'}</span><span class="ema-label">${item.standard?.label || key}</span>`;
            emaGrid.appendChild(div);
        });
        if (emaScoreEl) emaScoreEl.textContent = `${emaData.complianceScore || 0}%`;
    }

    // ─── Alert Banner ───
    const alertBanner = document.getElementById('alert-banner');
    const alertText = document.getElementById('alert-text');
    const alerts = results.alerts || [];
    if (alertBanner && alerts.length > 0) {
        const critical = alerts.find(a => a.severity === 'critical');
        const msg = critical || alerts[0];
        alertText.textContent = `⚠ ${msg.message}`;
        alertBanner.style.display = 'flex';
        if (critical) alertBanner.style.background = 'linear-gradient(90deg, #ef4444dd, #f97316dd)';
        else alertBanner.style.background = 'linear-gradient(90deg, #fbbf24dd, #f97316dd)';
    } else if (alertBanner) {
        alertBanner.style.display = 'none';
    }

    // ─── Forecast Chart ───
    const forecastData = results.forecast?.daily30 || [];
    if (forecastData.length > 0) {
        renderForecastChart(forecastData);
    }

    // Re-initialize icons
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─── Forecast Chart Rendering ───
let forecastChart;
function renderForecastChart(data) {
    const ctx = document.getElementById('forecastChart');
    if (!ctx) return;
    if (forecastChart) forecastChart.destroy();

    forecastChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: data.map(d => `Day ${d.day || d.step}`),
            datasets: [
                {
                    label: 'Forecast WQI',
                    data: data.map(d => d.wqi),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59,130,246,0.1)',
                    fill: false, borderWidth: 2, tension: 0.4, pointRadius: 0
                },
                {
                    label: 'Upper CI',
                    data: data.map(d => d.upper),
                    borderColor: 'transparent',
                    backgroundColor: 'rgba(59,130,246,0.08)',
                    fill: '+1', pointRadius: 0
                },
                {
                    label: 'Lower CI',
                    data: data.map(d => d.lower),
                    borderColor: 'transparent',
                    backgroundColor: 'rgba(59,130,246,0.08)',
                    fill: '-1', pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: true, ticks: { color: '#94a3b8', font: { size: 9 }, maxTicksLimit: 6 }, grid: { color: '#334155' } },
                y: { min: 0, max: 100, ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: '#334155' } }
            }
        }
    });
}

// ─── Alert dismiss ───
document.addEventListener('DOMContentLoaded', () => {
    const dismissBtn = document.getElementById('alert-dismiss');
    if (dismissBtn) dismissBtn.addEventListener('click', () => {
        document.getElementById('alert-banner').style.display = 'none';
    });

    // Forecast range toggle
    const forecastRange = document.getElementById('forecast-range');
    if (forecastRange) forecastRange.addEventListener('change', (e) => {
        const results = HybridModel?.getResults();
        if (!results) return;
        const data = e.target.value === '90' ?
            (results.forecast?.quarterly || []) :
            (results.forecast?.daily30 || []);
        if (data.length > 0) renderForecastChart(data);
    });
});
