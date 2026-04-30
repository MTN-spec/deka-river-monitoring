/**
 * In-Situ Data Service
 * Automated ingestion of field measurements from multiple sources
 * 
 * Supported Sources:
 * - API polling (REST endpoints)
 * - File watcher (CSV/JSON files in folder)
 * - Google Sheets (via API)
 * - Manual entry (fallback)
 */

// Configuration
const INSITU_CONFIG = {
    // Data source type: 'api' | 'folder' | 'sheet' | 'manual'
    sourceType: 'folder',
    
    // For API source
    apiUrl: '',
    apiInterval: 15 * 60 * 1000, // 15 minutes
    
    // For folder source
    dataFolder: './insitu-data/',
    filePattern: '*.csv',
    
    // For Google Sheets
    sheetId: '',
    sheetRange: 'A1:Z1000',
    
    // Data validation
    requiredFields: ['timestamp', 'ph', 'do', 'tss', 'conductivity'],
    
    // Auto-process flag
    autoProcess: true
};

// In-Situ Data Store
class InsituDataStore {
    constructor() {
        this.measurements = [];
        this.lastUpdated = null;
        this.listeners = [];
    }

    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    notify() {
        this.listeners.forEach(cb => cb(this.measurements));
    }

    addMeasurement(data) {
        // Validate required fields
        const isValid = INSITU_CONFIG.requiredFields.every(field => 
            data[field] !== undefined && data[field] !== null
        );
        
        if (!isValid) {
            console.warn('[InSitu] Invalid measurement:', data);
            return false;
        }
        
        this.measurements.push({
            ...data,
            _id: Date.now(),
            _timestamp: new Date().toISOString()
        });
        
        this.lastUpdated = new Date();
        this.notify();
        return true;
    }

    getLatest() {
        return this.measurements[this.measurements.length - 1] || null;
    }

    getHistory(days = 30) {
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        return this.measurements.filter(m => new Date(m.timestamp).getTime() > cutoff);
    }
}

const insituStore = new InsituDataStore();

// In-Situ Data Service
const InsituAPI = {
    /**
     * Initialize the data service
     */
    init() {
        console.log('[InSitu] Initializing...');
        
        switch (INSITU_CONFIG.sourceType) {
            case 'api':
                this.startApiPolling();
                break;
            case 'folder':
                this.startFolderWatch();
                break;
            case 'sheet':
                this.startSheetSync();
                break;
            default:
                console.log('[InSitu] Manual mode - use addMeasurement()');
        }
    },

    /**
     * Start API polling
     */
    startApiPolling() {
        const poll = async () => {
            try {
                const response = await fetch(INSITU_CONFIG.apiUrl);
                const data = await response.json();
                
                if (Array.isArray(data)) {
                    data.forEach(d => insituStore.addMeasurement(d));
                } else {
                    insituStore.addMeasurement(data);
                }
                
                console.log('[InSitu] API data fetched');
            } catch (e) {
                console.warn('[InSitu] API error:', e.message);
            }
        };
        
        poll();
        setInterval(poll, INSITU_CONFIG.apiInterval);
    },

    /**
     * Start folder watching (simulated - would need Node.js fs.watch)
     */
    startFolderWatch() {
        console.log('[InSitu] Folder watching enabled');
        console.log('[InSitu] Place CSV files in:', INSITU_CONFIG.dataFolder);
        
        // For browser, we'll provide a file input for manual uploads
        this.createFileInput();
    },

    /**
     * Create file input for CSV uploads
     */
    createFileInput() {
        // This is handled by the UI
    },

    /**
     * Parse CSV data
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const measurements = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const obj = {};
            
            headers.forEach((header, index) => {
                let value = values[index];
                
                // Convert numeric fields
                if (['ph', 'do', 'tss', 'conductivity', 'turbidity', 'temp'].includes(header)) {
                    value = parseFloat(value);
                }
                
                obj[header] = value;
            });
            
            if (obj.timestamp || obj.date) {
                measurements.push(obj);
            }
        }
        
        return measurements;
    },

    /**
     * Import CSV file
     */
    importCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const measurements = this.parseCSV(e.target.result);
                    let added = 0;
                    
                    measurements.forEach(m => {
                        if (insituStore.addMeasurement(m)) {
                            added++;
                        }
                    });
                    
                    console.log(`[InSitu] Added ${added} measurements`);
                    resolve(added);
                } catch (err) {
                    reject(err);
                }
            };
            
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    /**
     * Show file import dialog
     */
    showImportDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const count = await this.importCSV(file);
                alert(`Imported ${count} measurements!`);
                
                // Trigger model update
                if (typeof HybridModel !== 'undefined') {
                    HybridModel.run();
                }
            } catch (err) {
                alert('Import failed: ' + err.message);
            }
        });
        
        input.click();
    },

    /**
     * Add manual measurement
     */
    addManual(data) {
        return insituStore.addMeasurement(data);
    },

    /**
     * Get measurements
     */
    getData() {
        return insituStore.getLatest();
    },

    /**
     * Subscribe to updates
     */
    onUpdate(callback) {
        return insituStore.subscribe(callback);
    },

    /**
     * Get historical data
     */
    getHistory(days) {
        return insituStore.getHistory(days);
    }
};

// Export
window.InsituAPI = InsituAPI;