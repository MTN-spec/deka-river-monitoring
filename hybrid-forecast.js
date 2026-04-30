/**
 * HYBRID MODEL — LAYERS 4-7: FORECAST, ANOMALY, BAYESIAN, META-LEARNER
 */

// ═══ LAYER 4: TIME-SERIES FORECASTING ═══
const TimeSeriesEngine = {
    run(wqiSeries) {
        if (!wqiSeries || wqiSeries.length < 6) {
            return { wqi: null, method: 'Insufficient data' };
        }
        const arima = this.arimaForecast(wqiSeries, 30);
        const hw = this.holtWinters(wqiSeries, 90);
        const decomp = this.stlDecompose(wqiSeries);
        const combined = Math.round((arima.nextValue * 0.5 + hw.nextValue * 0.5));
        return { wqi: combined, arima, holtWinters: hw, decomposition: decomp, method: 'Time-Series Ensemble' };
    },

    arimaForecast(series, horizon) {
        const n = series.length;
        const values = series.map(s => s.wqi || s);
        // Differencing (d=1)
        const diff = values.slice(1).map((v, i) => v - values[i]);
        const meanDiff = diff.reduce((s, v) => s + v, 0) / diff.length;
        // AR(1) coefficient
        const lag1 = diff.slice(1).map((v, i) => v * diff[i]);
        const lag1Sum = lag1.reduce((s, v) => s + v, 0);
        const diffVar = diff.reduce((s, v) => s + v * v, 0);
        const phi = diffVar > 0 ? lag1Sum / diffVar : 0;
        // MA(1) - simplified
        const residuals = diff.map((v, i) => i > 0 ? v - phi * diff[i - 1] : v - meanDiff);
        const theta = 0.3;
        // Forecast
        const forecasts = [];
        let lastDiff = diff[diff.length - 1] || 0;
        let lastResid = residuals[residuals.length - 1] || 0;
        let lastVal = values[values.length - 1];
        const std = Math.sqrt(residuals.reduce((s, v) => s + v * v, 0) / residuals.length) || 5;
        for (let h = 1; h <= horizon; h++) {
            const nextDiff = phi * lastDiff + theta * lastResid + meanDiff * 0.1;
            lastVal = Math.max(0, Math.min(100, lastVal + nextDiff));
            const conf = Math.max(0.3, 0.95 - h * 0.02);
            forecasts.push({
                step: h, wqi: Math.round(lastVal),
                upper: Math.round(Math.min(100, lastVal + 1.96 * std * Math.sqrt(h * 0.3))),
                lower: Math.round(Math.max(0, lastVal - 1.96 * std * Math.sqrt(h * 0.3))),
                confidence: Math.round(conf * 100) / 100
            });
            lastDiff = nextDiff;
            lastResid = 0;
        }
        return { nextValue: forecasts[0]?.wqi || lastVal, forecasts, phi: Math.round(phi * 1000) / 1000, theta, aic: Math.round((n * Math.log(std * std) + 4) * 10) / 10, method: 'ARIMA(1,1,1)' };
    },

    holtWinters(series, horizon) {
        const values = series.map(s => s.wqi || s);
        const period = 12;
        const alpha = 0.3, beta = 0.1, gamma = 0.2;
        // Initialize
        let level = values.slice(0, Math.min(period, values.length)).reduce((s, v) => s + v, 0) / Math.min(period, values.length);
        let trend = values.length > period ? (values[period] - values[0]) / period : 0;
        const seasonal = new Array(period).fill(0);
        for (let i = 0; i < Math.min(period, values.length); i++) {
            seasonal[i] = values[i] - level;
        }
        // Fit
        for (let t = 0; t < values.length; t++) {
            const si = t % period;
            const prevLevel = level;
            level = alpha * (values[t] - seasonal[si]) + (1 - alpha) * (level + trend);
            trend = beta * (level - prevLevel) + (1 - beta) * trend;
            seasonal[si] = gamma * (values[t] - level) + (1 - gamma) * seasonal[si];
        }
        // Forecast
        const forecasts = [];
        for (let h = 1; h <= horizon; h++) {
            const si = (values.length + h - 1) % period;
            const pred = Math.max(0, Math.min(100, level + h * trend + seasonal[si]));
            const conf = Math.max(0.3, 0.9 - h * 0.005);
            forecasts.push({ step: h, wqi: Math.round(pred), confidence: Math.round(conf * 100) / 100 });
            if (h % 30 === 0) forecasts[forecasts.length - 1].isMonthly = true;
        }
        return { nextValue: forecasts[0]?.wqi || level, level: Math.round(level), trend: Math.round(trend * 100) / 100, forecasts, alpha, beta, gamma, method: 'Holt-Winters' };
    },

    stlDecompose(series) {
        const values = series.map(s => s.wqi || s);
        const period = 12;
        const n = values.length;
        // Moving average for trend
        const trend = values.map((_, i) => {
            const start = Math.max(0, i - Math.floor(period / 2));
            const end = Math.min(n, i + Math.ceil(period / 2));
            const window = values.slice(start, end);
            return Math.round(window.reduce((s, v) => s + v, 0) / window.length);
        });
        const detrended = values.map((v, i) => v - trend[i]);
        const seasonal = new Array(period).fill(0);
        for (let s = 0; s < period; s++) {
            const vals = detrended.filter((_, i) => i % period === s);
            seasonal[s] = Math.round(vals.reduce((sum, v) => sum + v, 0) / vals.length);
        }
        const residual = values.map((v, i) => Math.round(v - trend[i] - seasonal[i % period]));
        return { trend, seasonal, residual, period, method: 'STL Decomposition' };
    }
};

// ═══ LAYER 5: ANOMALY DETECTION + EMA COMPLIANCE ═══
const AnomalyDetector = {
    run(currentData, historicalSeries) {
        const ema = this.emaComplianceCheck(currentData);
        const zScore = this.zScoreMonitor(currentData, historicalSeries);
        const isolation = this.isolationForest(currentData, historicalSeries);
        const cusum = this.cusumDetect(historicalSeries);
        const alerts = [...ema.violations, ...zScore.alerts, ...isolation.alerts, ...cusum.alerts];
        const riskLevel = alerts.some(a => a.severity === 'critical') ? 'Critical' :
                          alerts.some(a => a.severity === 'warning') ? 'Warning' : 'Normal';
        return { alerts, riskLevel, ema, zScore, isolation, cusum, alertCount: alerts.length, method: 'Multi-Algorithm Anomaly Detection' };
    },

    emaComplianceCheck(data) {
        const standards = (typeof EMA_STANDARDS !== 'undefined') ? EMA_STANDARDS : {};
        const violations = [];
        const compliance = {};
        const insitu = data.insitu || data;
        const checks = [
            { key: 'ph', value: insitu.ph },
            { key: 'do', value: insitu.do },
            { key: 'tss', value: insitu.tss },
            { key: 'conductivity', value: insitu.conductivity },
            { key: 'turbidity', value: insitu.turbidity },
            { key: 'temperature', value: insitu.temperature || insitu.temp }
        ];
        checks.forEach(({ key, value }) => {
            if (value === undefined || !standards[key]) return;
            const std = standards[key];
            let status = 'compliant';
            if (key === 'ph') {
                if (value < std.min || value > std.max) { status = 'critical'; violations.push({ param: std.label, value, limit: `${std.min}-${std.max}`, severity: 'critical', message: `${std.label} = ${value} outside EMA range` }); }
                else if (value < std.min + 0.5 || value > std.max - 0.5) { status = 'warning'; violations.push({ param: std.label, value, severity: 'warning', message: `${std.label} = ${value} near EMA limit` }); }
            } else if (key === 'do') {
                if (value < 4.0) { status = 'critical'; violations.push({ param: std.label, value, limit: '≥5.0', severity: 'critical', message: `${std.label} = ${value} mg/L critically low` }); }
                else if (value < std.min) { status = 'warning'; violations.push({ param: std.label, value, limit: '≥5.0', severity: 'warning', message: `${std.label} = ${value} mg/L below standard` }); }
            } else {
                if (value > std.max) { status = 'critical'; violations.push({ param: std.label, value, limit: `≤${std.max}`, severity: 'critical', message: `${std.label} = ${value} exceeds EMA limit` }); }
                else if (value > std.max * 0.7) { status = 'warning'; violations.push({ param: std.label, value, severity: 'warning', message: `${std.label} = ${value} approaching limit` }); }
            }
            compliance[key] = { value, status, standard: std };
        });
        const score = Object.values(compliance).filter(c => c.status === 'compliant').length / Math.max(1, Object.keys(compliance).length);
        return { compliance, violations, complianceScore: Math.round(score * 100), method: 'Zimbabwe EMA SI 6/2007' };
    },

    zScoreMonitor(currentData, historicalSeries) {
        const alerts = [];
        if (!historicalSeries || historicalSeries.length < 6) return { alerts, method: 'Z-Score (insufficient data)' };
        const wqiValues = historicalSeries.map(d => d.wqi || d);
        const mean = wqiValues.reduce((s, v) => s + v, 0) / wqiValues.length;
        const std = Math.sqrt(wqiValues.reduce((s, v) => s + (v - mean) ** 2, 0) / wqiValues.length) || 1;
        const currentWQI = currentData.wqi || wqiValues[wqiValues.length - 1];
        const z = (currentWQI - mean) / std;
        if (Math.abs(z) > 3.0) alerts.push({ type: 'z-score', severity: 'critical', z: Math.round(z * 100) / 100, message: `WQI z-score = ${Math.round(z * 100) / 100} (extreme deviation)` });
        else if (Math.abs(z) > 2.5) alerts.push({ type: 'z-score', severity: 'warning', z: Math.round(z * 100) / 100, message: `WQI z-score = ${Math.round(z * 100) / 100} (significant deviation)` });
        return { z: Math.round(z * 100) / 100, mean: Math.round(mean), std: Math.round(std * 10) / 10, alerts, method: 'Statistical Z-Score' };
    },

    isolationForest(currentData, historicalSeries) {
        const alerts = [];
        if (!historicalSeries || historicalSeries.length < 10) return { score: 0, alerts, method: 'Isolation Forest (insufficient data)' };
        const values = historicalSeries.map(d => d.wqi || d);
        const currentWQI = currentData.wqi || values[values.length - 1];
        const sorted = [...values].sort((a, b) => a - b);
        const n = sorted.length;
        // Anomaly score: how "isolated" is the current value
        let pathLength = 0;
        let lo = 0, hi = n - 1;
        while (lo < hi) {
            const mid = Math.floor((lo + hi) / 2);
            pathLength++;
            if (currentWQI <= sorted[mid]) hi = mid; else lo = mid + 1;
        }
        const avgPath = Math.log2(n);
        const anomalyScore = Math.pow(2, -pathLength / avgPath);
        if (anomalyScore > 0.7) alerts.push({ type: 'isolation', severity: 'critical', score: Math.round(anomalyScore * 100) / 100, message: `Anomaly score = ${Math.round(anomalyScore * 100) / 100} (likely pollution event)` });
        else if (anomalyScore > 0.55) alerts.push({ type: 'isolation', severity: 'warning', score: Math.round(anomalyScore * 100) / 100, message: `Anomaly score = ${Math.round(anomalyScore * 100) / 100} (unusual pattern)` });
        return { score: Math.round(anomalyScore * 100) / 100, pathLength, alerts, method: 'Isolation Forest' };
    },

    cusumDetect(historicalSeries) {
        const alerts = [];
        if (!historicalSeries || historicalSeries.length < 10) return { alerts, method: 'CUSUM (insufficient data)' };
        const values = historicalSeries.map(d => d.wqi || d);
        const mean = values.reduce((s, v) => s + v, 0) / values.length;
        const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length) || 1;
        const threshold = 4 * std;
        let sPlus = 0, sMinus = 0;
        const k = std * 0.5;
        values.forEach((v, i) => {
            sPlus = Math.max(0, sPlus + (v - mean) - k);
            sMinus = Math.max(0, sMinus - (v - mean) - k);
            if (sPlus > threshold || sMinus > threshold) {
                if (i === values.length - 1) {
                    alerts.push({ type: 'cusum', severity: 'warning', index: i, message: `CUSUM detected baseline shift at latest observation` });
                }
            }
        });
        return { sPlus: Math.round(sPlus * 10) / 10, sMinus: Math.round(sMinus * 10) / 10, threshold: Math.round(threshold * 10) / 10, alerts, method: 'CUSUM Change Detection' };
    }
};

// ═══ LAYER 6: BAYESIAN FUSION ═══
const BayesianFusion = {
    run(physicsWQI, mlWQI, dlWQI, timeSeriesWQI, historicalSeries) {
        // Prior from historical data
        const hist = (historicalSeries || []).map(d => d.wqi || d);
        const priorMean = hist.length > 0 ? hist.reduce((s, v) => s + v, 0) / hist.length : 60;
        const priorStd = hist.length > 1 ? Math.sqrt(hist.reduce((s, v) => s + (v - priorMean) ** 2, 0) / hist.length) : 15;
        // Likelihood from current observations (weighted average of model outputs)
        const observations = [physicsWQI, mlWQI, dlWQI, timeSeriesWQI].filter(v => v != null && !isNaN(v));
        if (observations.length === 0) return { wqi: Math.round(priorMean), confidence: 0.5, method: 'Bayesian (prior only)' };
        const likelihoodMean = observations.reduce((s, v) => s + v, 0) / observations.length;
        const likelihoodStd = observations.length > 1 ? Math.sqrt(observations.reduce((s, v) => s + (v - likelihoodMean) ** 2, 0) / observations.length) : 10;
        // Posterior (conjugate Gaussian)
        const priorPrec = 1 / (priorStd * priorStd);
        const likePrec = 1 / (likelihoodStd * likelihoodStd + 0.01);
        const postPrec = priorPrec + likePrec;
        const postMean = (priorPrec * priorMean + likePrec * likelihoodMean) / postPrec;
        const postStd = Math.sqrt(1 / postPrec);
        const ci95 = [Math.max(0, postMean - 1.96 * postStd), Math.min(100, postMean + 1.96 * postStd)];
        return {
            wqi: Math.round(postMean),
            prior: { mean: Math.round(priorMean), std: Math.round(priorStd * 10) / 10 },
            likelihood: { mean: Math.round(likelihoodMean), std: Math.round(likelihoodStd * 10) / 10, sources: observations.length },
            posterior: { mean: Math.round(postMean * 10) / 10, std: Math.round(postStd * 10) / 10 },
            ci95: ci95.map(v => Math.round(v)),
            confidence: Math.round((1 - postStd / 50) * 100) / 100,
            method: 'Bayesian Gaussian Conjugate'
        };
    }
};

// ═══ LAYER 7: ENSEMBLE META-LEARNER ═══
const MetaLearner = {
    run(results) {
        const { physics, ml, deepLearning, timeSeries, bayesian, anomaly } = results;
        // Collect all WQI estimates
        const sources = [];
        if (physics?.wqi != null) sources.push({ name: 'Physics', wqi: physics.wqi, weight: 0.20 });
        if (ml?.wqi != null) sources.push({ name: 'ML Ensemble', wqi: ml.wqi, weight: 0.20 });
        if (deepLearning?.wqi != null) sources.push({ name: 'Deep Learning', wqi: deepLearning.wqi, weight: 0.25 });
        if (timeSeries?.wqi != null) sources.push({ name: 'Time-Series', wqi: timeSeries.wqi, weight: 0.15 });
        if (bayesian?.wqi != null) sources.push({ name: 'Bayesian', wqi: bayesian.wqi, weight: 0.20 });
        if (sources.length === 0) return { wqi: 50, riskLevel: 'Unknown', confidence: 0 };
        // Normalize weights
        const totalW = sources.reduce((s, src) => s + src.weight, 0);
        sources.forEach(src => src.weight /= totalW);
        // Weighted ensemble
        const finalWQI = Math.round(sources.reduce((s, src) => s + src.wqi * src.weight, 0));
        // Agreement score
        const wqiValues = sources.map(s => s.wqi);
        const spread = Math.max(...wqiValues) - Math.min(...wqiValues);
        const agreement = Math.max(0, Math.round((1 - spread / 60) * 100) / 100);
        // Risk classification
        let riskLevel, riskColor;
        if (finalWQI >= 80) { riskLevel = 'Excellent'; riskColor = '#10b981'; }
        else if (finalWQI >= 60) { riskLevel = 'Good'; riskColor = '#3b82f6'; }
        else if (finalWQI >= 40) { riskLevel = 'Fair'; riskColor = '#fbbf24'; }
        else if (finalWQI >= 20) { riskLevel = 'Poor'; riskColor = '#f97316'; }
        else { riskLevel = 'Critical'; riskColor = '#ef4444'; }
        // Override if anomaly detected
        if (anomaly?.riskLevel === 'Critical') { riskLevel = 'Critical'; riskColor = '#ef4444'; }
        // Dominant model
        const dominant = sources.reduce((best, src) => src.weight > best.weight ? src : best, sources[0]);
        // Confidence interval from Bayesian
        const ci95 = bayesian?.ci95 || [Math.max(0, finalWQI - 15), Math.min(100, finalWQI + 15)];
        // 30-day forecast (prefer LSTM, fallback to ARIMA)
        let forecast30 = deepLearning?.lstm?.forecasts?.daily30 || timeSeries?.arima?.forecasts || [];
        let forecastQuarterly = deepLearning?.lstm?.forecasts?.quarterly || timeSeries?.holtWinters?.forecasts?.filter(f => f.isMonthly) || [];
        return {
            wqi: finalWQI, riskLevel, riskColor, confidence: Math.round((agreement * 0.5 + (bayesian?.confidence || 0.5) * 0.5) * 100) / 100,
            ci95, agreement,
            sources: sources.map(s => ({ ...s, wqi: s.wqi, contribution: Math.round(s.weight * 100) })),
            dominant: dominant.name,
            forecast: { daily30: forecast30.slice(0, 30), quarterly: forecastQuarterly },
            alerts: anomaly?.alerts || [],
            emaCompliance: anomaly?.ema || {},
            timestamp: new Date().toISOString(),
            method: 'Stacking Meta-Learner (8 Layers)'
        };
    }
};

window.TimeSeriesEngine = TimeSeriesEngine;
window.AnomalyDetector = AnomalyDetector;
window.BayesianFusion = BayesianFusion;
window.MetaLearner = MetaLearner;
