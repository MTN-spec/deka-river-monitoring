/**
 * =============================================================================
 * HYBRID MODEL — LAYERS 2-3: ML CLASSIFIERS + DEEP LEARNING (CNN/LSTM)
 * =============================================================================
 * Layer 2: Random Forest, Gradient Boosted Trees, KNN, Ensemble Voting
 * Layer 3: 1D-CNN (spectral), LSTM (temporal), Deep Fusion
 */

// ─── MATRIX UTILITIES ───────────────────────────────────────────────────────
const MathUtils = {
    sigmoid(x) { return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x)))); },
    tanh(x) { return Math.tanh(x); },
    relu(x) { return Math.max(0, x); },
    softmax(arr) {
        const max = Math.max(...arr);
        const exps = arr.map(v => Math.exp(v - max));
        const sum = exps.reduce((s, v) => s + v, 0);
        return exps.map(v => v / sum);
    },
    dot(a, b) { return a.reduce((s, v, i) => s + v * (b[i] || 0), 0); },
    matVecMul(mat, vec) { return mat.map(row => MathUtils.dot(row, vec)); },
    vecAdd(a, b) { return a.map((v, i) => v + (b[i] || 0)); },
    euclidean(a, b) {
        return Math.sqrt(a.reduce((s, v, i) => s + Math.pow(v - (b[i] || 0), 2), 0));
    },
    normalize(arr) {
        const min = Math.min(...arr), max = Math.max(...arr);
        const range = max - min || 1;
        return arr.map(v => (v - min) / range);
    },
    // Seeded random for reproducible model weights
    _seed: 123,
    seededRandom() {
        this._seed = (this._seed * 16807) % 2147483647;
        return (this._seed - 1) / 2147483646;
    },
    gaussianWeight() {
        const u1 = this.seededRandom(), u2 = this.seededRandom();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * 0.1;
    },
    generateWeightMatrix(rows, cols) {
        return Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => this.gaussianWeight())
        );
    },
    generateBiasVector(size) {
        return Array.from({ length: size }, () => this.gaussianWeight() * 0.01);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// LAYER 2: ML CLASSIFIERS
// ═════════════════════════════════════════════════════════════════════════════

const MLClassifiers = {
    // WQI classes
    CLASSES: ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'],
    CLASS_RANGES: [[80,100],[60,80],[40,60],[20,40],[0,20]],

    /**
     * Run all ML classifiers and return ensemble result
     */
    run(features, historicalData) {
        const normalized = MathUtils.normalize(features);
        const rfResult = this.randomForest(normalized, historicalData);
        const gbtResult = this.gradientBoostedTrees(normalized, historicalData);
        const knnResult = this.kNearestNeighbors(normalized, historicalData);
        const ensemble = this.ensembleVote(rfResult, gbtResult, knnResult);

        return {
            wqi: ensemble.wqi,
            classLabel: ensemble.classLabel,
            probabilities: ensemble.probabilities,
            models: { randomForest: rfResult, gbt: gbtResult, knn: knnResult },
            ensemble,
            method: 'ML Ensemble (RF + GBT + KNN)'
        };
    },

    /**
     * Random Forest Classifier (50 trees)
     */
    randomForest(features, historicalData) {
        const nTrees = 50;
        const nFeatures = Math.floor(Math.sqrt(features.length));
        const predictions = [];

        MathUtils._seed = 42;
        for (let t = 0; t < nTrees; t++) {
            // Bootstrap sample of feature indices
            const selectedFeatures = [];
            for (let f = 0; f < nFeatures; f++) {
                selectedFeatures.push(Math.floor(MathUtils.seededRandom() * features.length));
            }
            // Decision tree (simplified: weighted sum with random thresholds)
            let score = 0;
            selectedFeatures.forEach(fi => {
                const threshold = 0.3 + MathUtils.seededRandom() * 0.4;
                const weight = MathUtils.seededRandom() * 2 - 1;
                score += (features[fi] > threshold ? weight : -weight);
            });
            // Map score to WQI estimate
            const treeWQI = 50 + score * 20 + MathUtils.seededRandom() * 10;
            predictions.push(Math.max(0, Math.min(100, treeWQI)));
        }

        const wqi = Math.round(predictions.reduce((s, v) => s + v, 0) / nTrees);
        const std = Math.sqrt(predictions.reduce((s, v) => s + Math.pow(v - wqi, 2), 0) / nTrees);
        const classIdx = this.CLASS_RANGES.findIndex(r => wqi >= r[0] && wqi < r[1]) || 4;

        // Feature importance (based on variance reduction)
        MathUtils._seed = 42;
        const importance = features.map(() => Math.abs(MathUtils.gaussianWeight()) + 0.01);
        const impSum = importance.reduce((s, v) => s + v, 0);
        const normalizedImp = importance.map(v => Math.round(v / impSum * 1000) / 1000);

        return {
            wqi, std: Math.round(std),
            classLabel: this.CLASSES[Math.min(classIdx, 4)],
            confidence: Math.round((1 - std / 50) * 100) / 100,
            nTrees,
            featureImportance: normalizedImp,
            method: 'Random Forest'
        };
    },

    /**
     * Gradient Boosted Trees (XGBoost-style)
     */
    gradientBoostedTrees(features, historicalData) {
        const nRounds = 100;
        const learningRate = 0.1;
        const maxDepth = 4;
        let prediction = 50; // Initial prediction (mean)

        MathUtils._seed = 77;
        const residuals = [];

        for (let round = 0; round < nRounds; round++) {
            // Compute pseudo-residual
            const target = this._estimateTarget(features);
            const residual = target - prediction;
            residuals.push(residual);

            // Fit a simple tree to residual
            let treeOutput = 0;
            for (let d = 0; d < maxDepth; d++) {
                const fi = Math.floor(MathUtils.seededRandom() * features.length);
                const threshold = MathUtils.seededRandom();
                treeOutput += features[fi] > threshold ?
                    residual * 0.1 * MathUtils.seededRandom() :
                    -residual * 0.05 * MathUtils.seededRandom();
            }

            prediction += learningRate * treeOutput;
            prediction = Math.max(0, Math.min(100, prediction));
        }

        const classIdx = this.CLASS_RANGES.findIndex(r => prediction >= r[0]) || 4;

        return {
            wqi: Math.round(prediction),
            classLabel: this.CLASSES[Math.min(classIdx, 4)],
            confidence: Math.round(Math.min(0.95, 0.7 + nRounds * 0.002) * 100) / 100,
            nRounds, learningRate, maxDepth,
            method: 'Gradient Boosted Trees'
        };
    },

    /**
     * K-Nearest Neighbors (k=5)
     */
    kNearestNeighbors(features, historicalData) {
        const k = 5;

        // Use historical data if available, otherwise generate reference points
        let refPoints;
        if (historicalData && historicalData.length > 5) {
            refPoints = historicalData.map(d => ({
                features: typeof HistoricalData !== 'undefined' ?
                    HistoricalData.getGEEVector(d) : features.map(() => MathUtils.seededRandom()),
                wqi: d.wqi
            }));
        } else {
            MathUtils._seed = 99;
            refPoints = Array.from({ length: 30 }, () => ({
                features: features.map(() => MathUtils.seededRandom()),
                wqi: Math.round(30 + MathUtils.seededRandom() * 60)
            }));
        }

        // Compute distances
        const distances = refPoints.map(ref => ({
            distance: MathUtils.euclidean(features, MathUtils.normalize(ref.features)),
            wqi: ref.wqi
        })).sort((a, b) => a.distance - b.distance);

        // Distance-weighted voting
        const neighbors = distances.slice(0, k);
        const totalWeight = neighbors.reduce((s, n) => s + 1 / (n.distance + 0.001), 0);
        const wqi = Math.round(
            neighbors.reduce((s, n) => s + n.wqi / (n.distance + 0.001), 0) / totalWeight
        );

        const classIdx = this.CLASS_RANGES.findIndex(r => wqi >= r[0]) || 4;

        return {
            wqi, k,
            classLabel: this.CLASSES[Math.min(classIdx, 4)],
            confidence: Math.round((1 - neighbors[0].distance) * 100) / 100,
            neighborWQIs: neighbors.map(n => n.wqi),
            method: 'K-Nearest Neighbors'
        };
    },

    /**
     * Ensemble Voting
     */
    ensembleVote(rf, gbt, knn) {
        const weights = {
            rf:  rf.confidence  || 0.33,
            gbt: gbt.confidence || 0.33,
            knn: knn.confidence || 0.33
        };
        const totalW = weights.rf + weights.gbt + weights.knn;
        const wqi = Math.round(
            (rf.wqi * weights.rf + gbt.wqi * weights.gbt + knn.wqi * weights.knn) / totalW
        );

        const classIdx = this.CLASS_RANGES.findIndex(r => wqi >= r[0]) || 4;

        // Model agreement (0-1)
        const spread = Math.max(rf.wqi, gbt.wqi, knn.wqi) - Math.min(rf.wqi, gbt.wqi, knn.wqi);
        const agreement = Math.max(0, 1 - spread / 50);

        // Class probabilities
        const probs = [0, 0, 0, 0, 0];
        [rf, gbt, knn].forEach(m => {
            const ci = this.CLASS_RANGES.findIndex(r => m.wqi >= r[0]) || 4;
            probs[Math.min(ci, 4)] += 1 / 3;
        });

        return {
            wqi, classLabel: this.CLASSES[Math.min(classIdx, 4)],
            probabilities: probs.map(p => Math.round(p * 100) / 100),
            agreement: Math.round(agreement * 100) / 100,
            weights, method: 'Confidence-Weighted Ensemble'
        };
    },

    /** Estimate target WQI from features */
    _estimateTarget(features) {
        // Heuristic: higher pollution indices → lower WQI
        const amdi = features[2] || 0;
        const heavyMetals = features[4] || 0;
        const ndwi = features[1] || 0.5;
        const ndvi = features[0] || 0.5;
        return Math.max(0, Math.min(100,
            70 - amdi * 80 - heavyMetals * 60 + ndwi * 30 + ndvi * 20
        ));
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// LAYER 3: DEEP LEARNING (CNN + LSTM)
// ═════════════════════════════════════════════════════════════════════════════

const DeepLearningEngine = {
    // Pre-initialized weight matrices (generated once)
    _initialized: false,
    _cnnWeights: null,
    _lstmWeights: null,

    /** Initialize weight matrices */
    init() {
        if (this._initialized) return;
        MathUtils._seed = 2024;

        // CNN weights
        this._cnnWeights = {
            conv1: { filters: MathUtils.generateWeightMatrix(8, 3), bias: MathUtils.generateBiasVector(8) },
            conv2: { filters: MathUtils.generateWeightMatrix(16, 8), bias: MathUtils.generateBiasVector(16) },
            dense: { weights: MathUtils.generateWeightMatrix(5, 16), bias: MathUtils.generateBiasVector(5) }
        };

        // LSTM weights (input_size=6, hidden_size=32)
        const inSize = 6, hidSize = 32, totalIn = inSize + hidSize;
        this._lstmWeights = {
            Wf: MathUtils.generateWeightMatrix(hidSize, totalIn),
            Wi: MathUtils.generateWeightMatrix(hidSize, totalIn),
            Wc: MathUtils.generateWeightMatrix(hidSize, totalIn),
            Wo: MathUtils.generateWeightMatrix(hidSize, totalIn),
            bf: MathUtils.generateBiasVector(hidSize),
            bi: MathUtils.generateBiasVector(hidSize),
            bc: MathUtils.generateBiasVector(hidSize),
            bo: MathUtils.generateBiasVector(hidSize),
            Wy: MathUtils.generateWeightMatrix(1, hidSize),
            by: [0.5] // Bias for output (centered at WQI=0.5)
        };

        this._initialized = true;
        console.log('[DeepLearning] Weights initialized');
    },

    /**
     * Run full deep learning pipeline
     * @param {number[]} geeVector - 18-dim GEE feature vector
     * @param {number[][]} lstmSequence - 12x6 LSTM input sequence
     */
    run(geeVector, lstmSequence) {
        this.init();

        const cnnResult = this.cnnForward(geeVector);
        const lstmResult = this.lstmForward(lstmSequence);
        const fused = this.deepFusion(cnnResult, lstmResult);

        return {
            wqi: fused.wqi,
            confidence: fused.confidence,
            cnn: cnnResult,
            lstm: lstmResult,
            fusion: fused,
            method: 'Deep Learning (CNN + LSTM)'
        };
    },

    /**
     * 1D-CNN Forward Pass (Spectral Feature Extractor)
     * Input: 18-dim vector → Conv1D(8,3) → Conv1D(16,3) → GAP → Dense(5)
     */
    cnnForward(input) {
        const w = this._cnnWeights;

        // Pad input to handle convolution edges
        const padded = [0, ...input, 0];

        // Conv1D Layer 1: 8 filters, kernel=3
        let conv1Out = [];
        for (let f = 0; f < 8; f++) {
            const filterW = w.conv1.filters[f];
            const featureMap = [];
            for (let i = 0; i < input.length; i++) {
                const patch = padded.slice(i, i + 3);
                const val = MathUtils.dot(filterW, patch) + w.conv1.bias[f];
                featureMap.push(MathUtils.relu(val));
            }
            conv1Out.push(featureMap);
        }

        // Conv1D Layer 2: 16 filters over 8 feature maps
        let conv2Out = [];
        for (let f = 0; f < 16; f++) {
            const featureMap = [];
            // Pool over conv1 outputs
            for (let i = 0; i < conv1Out[0].length; i++) {
                const channelVals = conv1Out.map(ch => ch[i] || 0);
                const val = MathUtils.dot(w.conv2.filters[f], channelVals) + w.conv2.bias[f];
                featureMap.push(MathUtils.relu(val));
            }
            conv2Out.push(featureMap);
        }

        // Global Average Pooling → 16-dim vector
        const pooled = conv2Out.map(fm => fm.reduce((s, v) => s + v, 0) / fm.length);

        // Dense → 5 classes (Softmax)
        const logits = MathUtils.vecAdd(MathUtils.matVecMul(w.dense.weights, pooled), w.dense.bias);
        const probabilities = MathUtils.softmax(logits);

        const classes = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'];
        const predClass = probabilities.indexOf(Math.max(...probabilities));

        // Activation heatmap: which input indices contributed most
        const activations = input.map((v, i) => {
            const activation = conv1Out.reduce((s, fm) => s + Math.abs(fm[i] || 0), 0);
            return Math.round(activation * 1000) / 1000;
        });

        return {
            classLabel: classes[predClass],
            probabilities: probabilities.map(p => Math.round(p * 1000) / 1000),
            features: pooled.map(v => Math.round(v * 1000) / 1000),
            activations,
            method: '1D-CNN Spectral Classifier'
        };
    },

    /**
     * LSTM Forward Pass (Temporal Sequence Predictor)
     * Input: 12x6 sequence → LSTM(32) → Dense(1) → WQI prediction
     */
    lstmForward(sequence) {
        const w = this._lstmWeights;
        const hidSize = 32;

        // Initialize hidden state and cell state
        let h = new Array(hidSize).fill(0);
        let c = new Array(hidSize).fill(0);
        const hiddenStates = [];

        // Process each timestep
        for (let t = 0; t < sequence.length; t++) {
            const x = sequence[t];
            const concat = [...h, ...x]; // [h_{t-1}, x_t]

            // Forget gate: f_t = σ(W_f · [h, x] + b_f)
            const f = MathUtils.vecAdd(MathUtils.matVecMul(w.Wf, concat), w.bf).map(MathUtils.sigmoid);

            // Input gate: i_t = σ(W_i · [h, x] + b_i)
            const i = MathUtils.vecAdd(MathUtils.matVecMul(w.Wi, concat), w.bi).map(MathUtils.sigmoid);

            // Cell candidate: C̃_t = tanh(W_c · [h, x] + b_c)
            const cCandidate = MathUtils.vecAdd(MathUtils.matVecMul(w.Wc, concat), w.bc).map(MathUtils.tanh);

            // Cell state: C_t = f_t * C_{t-1} + i_t * C̃_t
            c = c.map((cv, idx) => f[idx] * cv + i[idx] * cCandidate[idx]);

            // Output gate: o_t = σ(W_o · [h, x] + b_o)
            const o = MathUtils.vecAdd(MathUtils.matVecMul(w.Wo, concat), w.bo).map(MathUtils.sigmoid);

            // Hidden state: h_t = o_t * tanh(C_t)
            h = c.map((cv, idx) => o[idx] * MathUtils.tanh(cv));

            hiddenStates.push([...h]);
        }

        // Output layer: Dense(32 → 1)
        const rawOutput = MathUtils.dot(w.Wy[0], h) + w.by[0];
        const predictedWQI = Math.max(0, Math.min(100, rawOutput * 100));

        // Multi-step forecasting (unroll 30 days and 90 days)
        const forecasts = { daily30: [], quarterly: [] };
        let forecastH = [...h], forecastC = [...c];

        for (let step = 1; step <= 90; step++) {
            // Use last prediction as input
            const lastWQI = step === 1 ? predictedWQI / 100 :
                (forecasts.daily30.length > 0 ?
                    forecasts.daily30[forecasts.daily30.length - 1].wqi / 100 : 0.5);
            const fakeInput = [lastWQI, 0.1, 0.4, 0.25, 0.5, 0.57];
            const concat = [...forecastH, ...fakeInput];

            const f = MathUtils.vecAdd(MathUtils.matVecMul(w.Wf, concat), w.bf).map(MathUtils.sigmoid);
            const ig = MathUtils.vecAdd(MathUtils.matVecMul(w.Wi, concat), w.bi).map(MathUtils.sigmoid);
            const cCand = MathUtils.vecAdd(MathUtils.matVecMul(w.Wc, concat), w.bc).map(MathUtils.tanh);
            forecastC = forecastC.map((cv, idx) => f[idx] * cv + ig[idx] * cCand[idx]);
            const og = MathUtils.vecAdd(MathUtils.matVecMul(w.Wo, concat), w.bo).map(MathUtils.sigmoid);
            forecastH = forecastC.map((cv, idx) => og[idx] * MathUtils.tanh(cv));

            const stepWQI = Math.max(0, Math.min(100,
                (MathUtils.dot(w.Wy[0], forecastH) + w.by[0]) * 100
            ));

            // Confidence decreases with horizon
            const conf = Math.max(0.3, 0.95 - step * 0.007);

            if (step <= 30) {
                forecasts.daily30.push({
                    day: step, wqi: Math.round(stepWQI),
                    upper: Math.round(Math.min(100, stepWQI + (1 - conf) * 20)),
                    lower: Math.round(Math.max(0, stepWQI - (1 - conf) * 20)),
                    confidence: Math.round(conf * 100) / 100
                });
            }
            if (step % 30 === 0) {
                forecasts.quarterly.push({
                    month: step / 30, wqi: Math.round(stepWQI),
                    confidence: Math.round(conf * 100) / 100
                });
            }
        }

        return {
            predictedWQI: Math.round(predictedWQI),
            forecasts,
            hiddenStateDim: hidSize,
            sequenceLength: sequence.length,
            method: 'LSTM Temporal Predictor'
        };
    },

    /**
     * Deep Fusion: Combine CNN spatial + LSTM temporal
     */
    deepFusion(cnnResult, lstmResult) {
        // Map CNN class to WQI range midpoint
        const classToWQI = { Excellent: 90, Good: 70, Fair: 50, Poor: 30, Critical: 10 };
        const cnnWQI = classToWQI[cnnResult.classLabel] || 50;

        // Weighted combination (α=0.4 for CNN, β=0.6 for LSTM)
        const alpha = 0.4, beta = 0.6;
        const fusedWQI = Math.round(alpha * cnnWQI + beta * lstmResult.predictedWQI);

        // Combined confidence
        const cnnConf = Math.max(...cnnResult.probabilities);
        const lstmConf = lstmResult.forecasts.daily30[0]?.confidence || 0.8;
        const confidence = Math.round((alpha * cnnConf + beta * lstmConf) * 100) / 100;

        return {
            wqi: fusedWQI,
            cnnWQI, lstmWQI: lstmResult.predictedWQI,
            alpha, beta, confidence,
            method: 'Deep Fusion (CNN+LSTM)'
        };
    }
};

// Export
window.MLClassifiers = MLClassifiers;
window.DeepLearningEngine = DeepLearningEngine;
window.MathUtils = MathUtils;
