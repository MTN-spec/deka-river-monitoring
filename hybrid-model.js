/**
 * =============================================================================
 * HYBRID MODEL — MAIN ORCHESTRATOR (v2.0)
 * =============================================================================
 * Coordinates all 8 layers:
 *   1. Physics Engine (SCS, USLE, Streeter-Phelps)
 *   2. ML Classifiers (RF, GBT, KNN)
 *   3. Deep Learning (CNN + LSTM)
 *   4. Time-Series Forecasting (ARIMA, Holt-Winters)
 *   5. Anomaly Detection (Isolation Forest, Z-Score, CUSUM, EMA)
 *   6. Bayesian Fusion
 *   7. Ensemble Meta-Learner
 *   8. Dashboard Output
 *
 * @author  Tadiwanashe Blessings Mbavarira
 * @version 2.0
 */

const HybridModel = {
    state: {
        lastRun: null,
        results: {},
        history: [],
        layerStatus: {}
    },

    /** Initialize all sub-engines */
    init() {
        console.log('[HybridModel] Initializing 8-layer engine...');

        // Initialize deep learning weights
        if (typeof DeepLearningEngine !== 'undefined') {
            DeepLearningEngine.init();
            this.state.layerStatus.deepLearning = 'ready';
        }

        // Subscribe to fusion engine
        if (typeof FusionEngine !== 'undefined') {
            FusionEngine.subscribe((fusedData) => this.run(fusedData));
        }

        // Load historical data
        if (typeof HistoricalData !== 'undefined') {
            const stats = HistoricalData.getStatistics();
            console.log('[HybridModel] Historical data loaded:', stats.count, 'records, mean WQI:', stats.mean);
            this.state.layerStatus.historicalData = 'loaded';
        }

        this.state.layerStatus.initialized = true;
        console.log('[HybridModel] All layers initialized');
    },

    /**
     * Run the complete 8-layer hybrid model pipeline
     */
    run(fusedData) {
        console.log('[HybridModel] Running 8-layer pipeline...');
        const startTime = performance.now();

        const data = fusedData || this._getDefaultData();
        const historical = (typeof HistoricalData !== 'undefined') ? HistoricalData.getAll() : [];

        // Prepare inputs
        const geeVector = this._buildGEEVector(data);
        const lstmSequence = (typeof HistoricalData !== 'undefined') ?
            HistoricalData.getLSTMSequence() : this._defaultLSTMSequence();
        const wqiSeries = historical.length > 0 ?
            HistoricalData.getWQISeries() : this._defaultWQISeries();

        // ─── Layer 1: Physics Engine ───
        let physics = null;
        try {
            if (typeof PhysicsEngine !== 'undefined') {
                physics = PhysicsEngine.run(data);
                this.state.layerStatus.physics = 'complete';
            }
        } catch (e) {
            console.warn('[HybridModel] Physics layer error:', e.message);
            this.state.layerStatus.physics = 'error';
        }

        // ─── Layer 2: ML Classifiers ───
        let ml = null;
        try {
            if (typeof MLClassifiers !== 'undefined') {
                ml = MLClassifiers.run(geeVector, historical);
                this.state.layerStatus.ml = 'complete';
            }
        } catch (e) {
            console.warn('[HybridModel] ML layer error:', e.message);
            this.state.layerStatus.ml = 'error';
        }

        // ─── Layer 3: Deep Learning (CNN + LSTM) ───
        let deepLearning = null;
        try {
            if (typeof DeepLearningEngine !== 'undefined') {
                deepLearning = DeepLearningEngine.run(geeVector, lstmSequence);
                this.state.layerStatus.deepLearning = 'complete';
            }
        } catch (e) {
            console.warn('[HybridModel] Deep Learning layer error:', e.message);
            this.state.layerStatus.deepLearning = 'error';
        }

        // ─── Layer 4: Time-Series Forecasting ───
        let timeSeries = null;
        try {
            if (typeof TimeSeriesEngine !== 'undefined') {
                timeSeries = TimeSeriesEngine.run(wqiSeries);
                this.state.layerStatus.timeSeries = 'complete';
            }
        } catch (e) {
            console.warn('[HybridModel] Time-Series layer error:', e.message);
            this.state.layerStatus.timeSeries = 'error';
        }

        // ─── Layer 5: Anomaly Detection ───
        let anomaly = null;
        try {
            if (typeof AnomalyDetector !== 'undefined') {
                const latestRecord = historical.length > 0 ? historical[historical.length - 1] : data;
                anomaly = AnomalyDetector.run(latestRecord, wqiSeries);
                this.state.layerStatus.anomaly = 'complete';
            }
        } catch (e) {
            console.warn('[HybridModel] Anomaly layer error:', e.message);
            this.state.layerStatus.anomaly = 'error';
        }

        // ─── Layer 6: Bayesian Fusion ───
        let bayesian = null;
        try {
            if (typeof BayesianFusion !== 'undefined') {
                bayesian = BayesianFusion.run(
                    physics?.wqi, ml?.wqi, deepLearning?.wqi,
                    timeSeries?.wqi, wqiSeries
                );
                this.state.layerStatus.bayesian = 'complete';
            }
        } catch (e) {
            console.warn('[HybridModel] Bayesian layer error:', e.message);
            this.state.layerStatus.bayesian = 'error';
        }

        // ─── Layer 7: Meta-Learner Ensemble ───
        let finalResults;
        try {
            if (typeof MetaLearner !== 'undefined') {
                finalResults = MetaLearner.run({
                    physics, ml, deepLearning, timeSeries, bayesian, anomaly
                });
                this.state.layerStatus.metaLearner = 'complete';
            } else {
                // Fallback
                finalResults = {
                    wqi: bayesian?.wqi || physics?.wqi || 50,
                    riskLevel: 'Unknown',
                    riskColor: '#94a3b8',
                    confidence: 0.5,
                    method: 'Fallback'
                };
            }
        } catch (e) {
            console.warn('[HybridModel] Meta-Learner error:', e.message);
            finalResults = { wqi: 50, riskLevel: 'Error', riskColor: '#ef4444', confidence: 0 };
        }

        // ─── Layer 8: Package results for dashboard ───
        const executionTime = Math.round(performance.now() - startTime);

        finalResults.layers = {
            physics, ml, deepLearning, timeSeries, anomaly, bayesian
        };
        finalResults.meta = {
            executionTime_ms: executionTime,
            layerStatus: { ...this.state.layerStatus },
            activeLayers: Object.values(this.state.layerStatus).filter(s => s === 'complete').length,
            totalLayers: 8,
            timestamp: new Date().toISOString()
        };

        // Store results
        this.state.results = finalResults;
        this.state.lastRun = new Date();
        this.state.history.push({
            timestamp: this.state.lastRun,
            wqi: finalResults.wqi,
            riskLevel: finalResults.riskLevel
        });
        if (this.state.history.length > 200) {
            this.state.history = this.state.history.slice(-200);
        }

        console.log(`[HybridModel] Complete in ${executionTime}ms. WQI: ${finalResults.wqi} (${finalResults.riskLevel})`);

        // Notify dashboard
        this.notify(finalResults);
        return finalResults;
    },

    /** Build 18-dim GEE feature vector from fused data */
    _buildGEEVector(data) {
        const gee = data.gee || {};
        const get = (key, fallback) => {
            if (gee[key] !== undefined) return gee[key];
            if (data[key]?.value !== undefined) return data[key].value;
            return fallback;
        };
        return [
            get('ndvi', 0.5), get('ndwi', 0.4), get('amdi', 0.1),
            get('salinity', 2.5) / 10, get('heavyMetals', 0.25),
            get('aluminium', 0.06), get('ironOxide', 0.3),
            get('ferricRatio', 0.4), get('ironSulfate', 0.2),
            get('manganeseStress', 0.15), get('ndsi', 0.1),
            get('mndwi', 0.35), get('ndti', 0.2),
            get('saturationIndex', 0.5), get('redEdgeStress', 0.2),
            get('ndStressSensitivity', 0.3),
            (get('lst', 28) || 28) / 50,
            get('amdDetection', 0.1)
        ];
    },

    /** Default LSTM sequence if no historical data */
    _defaultLSTMSequence() {
        return Array.from({ length: 12 }, (_, i) => [
            0.6 + Math.sin(i * 0.5) * 0.1,
            0.1 + Math.sin(i * 0.3) * 0.03,
            0.4 + Math.cos(i * 0.5) * 0.08,
            0.25, 0.51, 0.57
        ]);
    },

    /** Default WQI series */
    _defaultWQISeries() {
        return Array.from({ length: 24 }, (_, i) => ({
            date: `2024-${String((i % 12) + 1).padStart(2, '0')}`,
            wqi: 55 + Math.sin(i * 0.5) * 15 + Math.random() * 5
        }));
    },

    /** Default input data */
    _getDefaultData() {
        const data = {};
        if (typeof FusionEngine !== 'undefined') {
            return FusionEngine.getFusedData() || data;
        }
        if (typeof sampleGEEData !== 'undefined') {
            return { gee: sampleGEEData.indices || {} };
        }
        return data;
    },

    // ─── Public API ─────────────────────────────────────────────────
    getResults() { return this.state.results; },
    getHistory(n) { return n ? this.state.history.slice(-n) : this.state.history; },
    getLayerStatus() { return this.state.layerStatus; },
    getLastRunTime() { return this.state.results?.meta?.executionTime_ms || 0; },

    /** Get forecast data for charting */
    getForecast() {
        return {
            daily30: this.state.results?.forecast?.daily30 || [],
            quarterly: this.state.results?.forecast?.quarterly || []
        };
    },

    /** Get active alerts */
    getAlerts() {
        return this.state.results?.alerts || [];
    },

    /** Get EMA compliance status */
    getEMACompliance() {
        return this.state.results?.emaCompliance || {};
    },

    // ─── Observer Pattern ───────────────────────────────────────────
    listeners: [],
    subscribe(callback) {
        this.listeners.push(callback);
        return () => { this.listeners = this.listeners.filter(l => l !== callback); };
    },
    notify(results) {
        this.listeners.forEach(cb => {
            try { cb(results); } catch (e) { console.error('[HybridModel] Listener error:', e); }
        });
    }
};

window.HybridModel = HybridModel;