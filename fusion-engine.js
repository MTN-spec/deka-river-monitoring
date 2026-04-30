/**
 * Data Fusion Engine
 * Combines GEE remote sensing data with in-situ measurements
 * to produce unified input for the hybrid model
 */

// Fusion Configuration
const FUSION_CONFIG = {
    // Weight distribution (must sum to 1)
    weights: {
        gee: 0.4,      // GEE indices
        insitu: 0.6    // In-situ measurements
    },
    
    // Index to parameter mapping
    indexMapping: {
        // GEE Index → Water Variable
        'NDVI': 'organicLoad',
        'NDWI': 'waterExtent',
        'NDMI': 'soilMoisture',
        'LST': 'waterTemp',
        'AMDI': 'acidMineDrainage',
        'NDSI': 'salinity',
        'precipitation': 'runoff'
    },
    
    // In-situ → Water Variable
    insituMapping: {
        'ph': 'ph',
        'do': 'dissolvedOxygen',
        'tss': 'totalSuspendedSolids',
        'conductivity': 'conductivity',
        'turbidity': 'turbidity',
        'temp': 'temperature'
    },
    
    // Quality thresholds
    thresholds: {
        ph: { min: 6.5, max: 8.5, optimal: 7.0 },
        do: { min: 5.0, max: 12.0, optimal: 8.0 },
        tss: { min: 0, max: 100, optimal: 25 },
        conductivity: { min: 0, max: 1000, optimal: 200 }
    }
};

// Fusion Engine
const FusionEngine = {
    // Combined data store
    data: {
        gee: {},
        insitu: {},
        fused: {},
        lastFusion: null
    },

    /**
     * Initialize fusion engine
     */
    init() {
        console.log('[Fusion] Initializing...');
        
        // Subscribe to GEE updates
        if (typeof GEEAPI !== 'undefined') {
            GEEAPI.onUpdate((geeData) => {
                this.data.gee = geeData;
                this.fuse();
            });
        }
        
        // Subscribe to In-situ updates
        if (typeof InsituAPI !== 'undefined') {
            InsituAPI.onUpdate((insituData) => {
                this.data.insitu = insituData;
                this.fuse();
            });
        }
    },

    /**
     * Fuse GEE and in-situ data
     */
    fuse() {
        console.log('[Fusion] Running fusion...');
        
        const fused = {};
        
        // Process GEE indices
        Object.entries(this.data.gee).forEach(([index, value]) => {
            const variable = FUSION_CONFIG.indexMapping[index] || index;
            fused[variable] = {
                value: value.value || value,
                source: 'GEE',
                weight: FUSION_CONFIG.weights.gee,
                confidence: this.calculateConfidence(value, 'gee')
            };
        });
        
        // Process in-situ measurements
        const latestInsitu = InsituAPI?.getData?.() || this.data.insitu;
        if (latestInsitu) {
            Object.entries(FUSION_CONFIG.insituMapping).forEach(([field, variable]) => {
                if (latestInsitu[field] !== undefined) {
                    fused[variable] = {
                        value: parseFloat(latestInsitu[field]),
                        source: 'In-situ',
                        weight: FUSION_CONFIG.weights.insitu,
                        confidence: this.calculateConfidence(latestInsitu[field], 'insitu')
                    };
                }
            });
        }
        
        // Calculate weighted averages for overlapping variables
        this.calculateWeightedAverages(fused);
        
        this.data.fused = fused;
        this.data.lastFusion = new Date();
        
        console.log('[Fusion] Fusion complete:', Object.keys(fused).length, 'variables');
        
        // Notify listeners
        this.notify();
        
        return fused;
    },

    /**
     * Calculate confidence score
     */
    calculateConfidence(value, source) {
        if (!value) return 0;
        
        let confidence = 0.8; // Base confidence
        
        if (source === 'insitu') {
            // Higher confidence for lab measurements
            confidence = 0.95;
        } else if (source === 'gee') {
            // Moderate confidence for remote sensing
            confidence = 0.75;
        }
        
        return confidence;
    },

    /**
     * Calculate weighted averages where both sources exist
     */
    calculateWeightedAverages(fused) {
        // If both pH sources exist, weight them
        if (fused.ph && fused.acidMineDrainage) {
            const geeWeight = FUSION_CONFIG.weights.gee;
            const insituWeight = FUSION_CONFIG.weights.insitu;
            
            fused.ph.combined = 
                (fused.ph.value * insituWeight) + 
                (fused.acidMineDrainage.value * geeWeight * 10); // Scale AMDI to pH range
            
            fused.ph.sources = ['GEE', 'In-situ'];
        }
    },

    /**
     * Get fused data
     */
    getFusedData() {
        return this.data.fused;
    },

    /**
     * Get specific variable
     */
    getVariable(name) {
        return this.data.fused[name] || null;
    },

    /**
     * Validate data quality
     */
    validate() {
        const issues = [];
        const fused = this.data.fused;
        
        // Check pH
        if (fused.ph) {
            const { min, max } = FUSION_CONFIG.thresholds.ph;
            if (fused.ph.value < min || fused.ph.value > max) {
                issues.push({ variable: 'pH', severity: 'warning', message: 'pH outside normal range' });
            }
        }
        
        // Check DO
        if (fused.dissolvedOxygen) {
            const { min, max } = FUSION_CONFIG.thresholds.do;
            if (fused.dissolvedOxygen.value < min) {
                issues.push({ variable: 'DO', severity: 'danger', message: 'Low dissolved oxygen' });
            }
        }
        
        return issues;
    },

    /**
     * Subscribe to fusion updates
     */
    listeners: [],
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    },

    notify() {
        this.listeners.forEach(cb => cb(this.data.fused));
    }
};

// Export
window.FusionEngine = FusionEngine;