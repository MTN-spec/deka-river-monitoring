/**
 * GEE API Service Layer
 * Handles communication between local dashboard and Google Earth Engine app
 * 
 * Communication Methods:
 * 1. Direct API endpoints (if available)
 * 2. postMessage API for iframe communication
 * 3. Data file polling (fallback)
 */

// GEE Configuration
const GEE_CONFIG = {
    // GEE App URL
    appUrl: 'https://ee-mhandutakunda.projects.earthengine.app/view/deka-indices-dashboard',
    
    // Local storage key for GEE data cache
    cacheKey: 'deka_gee_data',
    
    // Cache expiry time (5 minutes)
    cacheExpiry: 5 * 60 * 1000,
    
    // Polling interval for data sync
    pollInterval: 30000,
    
    // Mapping: GEE index names to local dashboard indices
    indexMapping: {
        'NDVI': 'ndvi',
        'NDWI': 'ndwi',
        'EVI': 'evi',
        'NDMI': 'ndmi',
        'AMDI': 'amdi',
        'NDSI': 'salinity',
        'Heavy Metals': 'heavy_metals',
        'Aluminium': 'aluminium',
        'LST': 'lst',           // Land Surface Temperature
        'Precipitation': 'precip',
        'Evapotranspiration': 'et'
    }
};

// GEE Data Store
class GEEDataStore {
    constructor() {
        this.data = {};
        this.lastUpdated = null;
        this.listeners = [];
        this.isConnected = false;
    }

    // Subscribe to data updates
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    // Notify all listeners of updates
    notify() {
        this.listeners.forEach(cb => cb(this.data));
    }

    // Update data and notify
    setData(newData) {
        this.data = { ...this.data, ...newData };
        this.lastUpdated = new Date();
        this.isConnected = true;
        this.notify();
    }

    // Get cached data
    getData() {
        return this.data;
    }

    // Check if data is stale
    isStale() {
        if (!this.lastUpdated) return true;
        return Date.now() - this.lastUpdated.getTime() > GEE_CONFIG.cacheExpiry;
    }
}

// Global GEE data store
const geeDataStore = new GEEDataStore();

/**
 * GEE API Service
 */
const GEEAPI = {
    /**
     * Initialize connection to GEE app
     */
    init() {
        console.log('[GEE] Initializing connection...');
        this.setupPostMessageListener();
        this.loadCachedData();
        this.startPolling();
    },

    /**
     * Setup postMessage listener for iframe communication
     */
    setupPostMessageListener() {
        window.addEventListener('message', (event) => {
            // Verify origin (in production, check against GEE_CONFIG.appUrl)
            if (!event.data) return;
            
            const message = event.data;
            if (message.type === 'GEE_DATA') {
                console.log('[GEE] Received data from GEE app:', message.payload);
                this.handleGEEResponse(message.payload);
            }
        });
    },

    /**
     * Handle data received from GEE app
     */
    handleGEEResponse(payload) {
        if (payload.indices) {
            // Map GEE indices to local format
            const mappedData = this.mapGEEData(payload.indices);
            geeDataStore.setData(mappedData);
            this.cacheData(mappedData);
        }
    },

    /**
     * Map GEE index names to local dashboard format
     */
    mapGEEData(geeIndices) {
        const mapped = {};
        
        Object.entries(geeIndices).forEach(([geeName, value]) => {
            const localId = GEE_CONFIG.indexMapping[geeName] || geeName.toLowerCase().replace(/\s+/g, '_');
            mapped[localId] = {
                source: 'GEE',
                value: value,
                rawName: geeName,
                timestamp: new Date().toISOString()
            };
        });
        
        return mapped;
    },

    /**
     * Request data from GEE iframe
     */
    requestData() {
        const iframe = document.getElementById('gee-iframe');
        if (iframe && iframe.contentWindow) {
            try {
                iframe.contentWindow.postMessage(
                    { type: 'REQUEST_DATA' },
                    '*'
                );
            } catch (e) {
                console.warn('[GEE] Cannot communicate with iframe:', e.message);
            }
        }
    },

    /**
     * Load data from local cache
     */
    loadCachedData() {
        try {
            const cached = localStorage.getItem(GEE_CONFIG.cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Date.now() - parsed.timestamp < GEE_CONFIG.cacheExpiry) {
                    geeDataStore.setData(parsed.data);
                    console.log('[GEE] Loaded cached data');
                }
            }
        } catch (e) {
            console.warn('[GEE] Cache load failed:', e.message);
        }
    },

    /**
     * Cache data locally
     */
    cacheData(data) {
        try {
            localStorage.setItem(GEE_CONFIG.cacheKey, JSON.stringify({
                data: data,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('[GEE] Cache save failed:', e.message);
        }
    },

    /**
     * Start polling for GEE data
     */
    startPolling() {
        // Initial request
        this.requestData();
        
        // Periodic sync
        setInterval(() => {
            if (geeDataStore.isStale()) {
                this.requestData();
            }
        }, GEE_CONFIG.pollInterval);
    },

    /**
     * Get current GEE data
     */
    getData() {
        return geeDataStore.getData();
    },

    /**
     * Subscribe to GEE data updates
     */
    onUpdate(callback) {
        return geeDataStore.subscribe(callback);
    },

    /**
     * Check connection status
     */
    isConnected() {
        return geeDataStore.isConnected;
    },

    /**
     * Get specific index value
     */
    getIndex(indexId) {
        const data = geeDataStore.getData();
        return data[indexId] || null;
    },

    /**
     * Export GEE data as JSON file
     */
    exportData() {
        const data = geeDataStore.getData();
        const exportObj = {
            exportedAt: new Date().toISOString(),
            source: 'Deka River Dashboard',
            indices: data
        };
        
        const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `deka-gee-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        console.log('[GEE] Data exported');
    },

    /**
     * Import GEE data from JSON file
     */
    importData(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            
            if (imported.indices) {
                this.handleGEEResponse({ indices: imported.indices });
                console.log('[GEE] Data imported successfully');
                return true;
            } else if (imported.data) {
                // Handle direct data format
                geeDataStore.setData(imported.data);
                this.cacheData(imported.data);
                console.log('[GEE] Data imported successfully');
                return true;
            }
            
            console.warn('[GEE] Invalid import format');
            return false;
        } catch (e) {
            console.error('[GEE] Import failed:', e.message);
            return false;
        }
    },

    /**
     * Show file import dialog
     */
    showImportDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                if (this.importData(event.target.result)) {
                    this.syncWithDashboard();
                    alert('Data imported successfully!');
                } else {
                    alert('Failed to import data. Please check the file format.');
                }
            };
            reader.readAsText(file);
        });
        
        input.click();
    },

    /**
     * Sync GEE data with local dashboard
     */
    syncWithDashboard() {
        const geeData = this.getData();
        const localIndices = mockData.indices;
        
        // Update local data with GEE values where available
        localIndices.forEach(localIndex => {
            const geeValue = geeData[localIndex.id];
            if (geeValue) {
                localIndex.currentValue = geeValue.value;
                localIndex.source = 'GEE';
                localIndex.lastUpdated = geeValue.timestamp;
            }
        });
        
        // Trigger UI update
        if (typeof updateUI === 'function') {
            updateUI(mockData.indices[0]?.id);
        }
        
        console.log('[GEE] Synced with dashboard');
    }
};

// Export for global use
window.GEEAPI = GEEAPI;