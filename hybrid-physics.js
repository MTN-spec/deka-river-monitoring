/**
 * =============================================================================
 * HYBRID MODEL — LAYER 1: PHYSICS ENGINE
 * =============================================================================
 * Deterministic hydrology: SCS-CN Runoff, USLE Sediment, Streeter-Phelps
 * BOD/DO, Multi-Pollutant Decay, Advection-Dispersion Mixing
 */

const PhysicsEngine = {
    /**
     * Run all physics calculations
     * @param {Object} data - Fused input data
     * @returns {Object} Physics results with sub-model outputs
     */
    run(data) {
        const catchment = (typeof DEKA_CATCHMENT !== 'undefined') ? DEKA_CATCHMENT : this._defaultCatchment();
        const precip = data.precipitation?.value || data.climate?.precipitation || 50;
        const temp = data.temperature?.value || data.climate?.lst || 25;
        const ndvi = data.ndvi?.value || data.gee?.ndvi || 0.5;
        const doVal = data.dissolvedOxygen?.value || data.insitu?.do || 8;
        const flow = data.riverFlow?.value || data.climate?.riverFlow || 3;

        const runoff = this.scsRunoff(precip, catchment);
        const sediment = this.usleSediment(precip, catchment);
        const doSag = this.streeterPhelps(doVal, temp, flow, catchment);
        const decay = this.pollutantDecay(data, catchment);
        const transport = this.advectionDispersion(data, flow, catchment);
        const organicLoad = this.ndviOrganicLoad(ndvi);
        const waterTemp = this.lstWaterTemp(temp);

        // Physics-based WQI component (0-100)
        let physWQI = 80;
        physWQI -= Math.max(0, (runoff.value - 30) * 0.3);
        physWQI -= Math.max(0, (sediment.value - 5) * 1.5);
        physWQI -= Math.max(0, (8 - doSag.criticalDO) * 4);
        physWQI -= transport.pollutionIndex * 15;
        physWQI = Math.max(0, Math.min(100, physWQI));

        return {
            wqi: Math.round(physWQI),
            runoff, sediment, doSag, decay, transport,
            organicLoad, waterTemp,
            method: 'Physics-Based Deterministic'
        };
    },

    /**
     * SCS Curve Number Runoff Model
     */
    scsRunoff(precipitation, catchment) {
        const lu = catchment.landUse;
        const cn = catchment.curveNumbers;

        // Weighted CN
        const weightedCN = Object.keys(lu).reduce((sum, type) => {
            return sum + (cn[type] || 70) * lu[type];
        }, 0);

        // Potential maximum retention (mm)
        const S = (25400 / weightedCN) - 254;

        // Initial abstraction
        const Ia = 0.2 * S;

        // Runoff (mm)
        let Q = 0;
        if (precipitation > Ia) {
            Q = Math.pow(precipitation - Ia, 2) / (precipitation - Ia + S);
        }

        // AMC adjustment (Antecedent Moisture Condition)
        const amcFactor = precipitation > 100 ? 1.3 : (precipitation > 50 ? 1.0 : 0.7);
        Q *= amcFactor;

        // Volume (m³)
        const volume = Q * catchment.area_km2 * 1000;

        return {
            value: Math.round(Q * 100) / 100,
            unit: 'mm',
            volume: Math.round(volume),
            weightedCN: Math.round(weightedCN),
            S: Math.round(S * 10) / 10,
            amcFactor,
            method: 'SCS Curve Number'
        };
    },

    /**
     * USLE Sediment Yield Model
     */
    usleSediment(precipitation, catchment) {
        // R factor (rainfall erosivity) - simplified
        const R = 0.0483 * Math.pow(precipitation, 1.61);

        // K factor (soil erodibility)
        const K = catchment.soilK;

        // LS factor (slope-length)
        const L = catchment.mainChannelLength_km * 1000;
        const S_slope = catchment.averageSlope;
        const LS = Math.pow(L / 22.13, 0.4) * Math.pow(S_slope / 0.0896, 1.3);

        // C factor (cover management) - weighted by land use
        const cFactors = { forest: 0.003, agriculture: 0.20, mining: 0.50, urban: 0.01 };
        const C = Object.keys(catchment.landUse).reduce((sum, type) => {
            return sum + (cFactors[type] || 0.1) * catchment.landUse[type];
        }, 0);

        // P factor (conservation practice)
        const P = catchment.conservP;

        // Soil loss (tons/ha/year) → converted to daily
        const A_annual = R * K * LS * C * P;
        const A_daily = A_annual / 365;

        // Sediment Delivery Ratio
        const SDR = 0.42 * Math.pow(catchment.area_km2, -0.125);
        const sedimentYield = A_daily * SDR * catchment.area_km2 * 100;

        return {
            value: Math.round(sedimentYield * 100) / 100,
            unit: 'tons/day',
            R: Math.round(R * 10) / 10,
            K, LS: Math.round(LS * 100) / 100,
            C: Math.round(C * 1000) / 1000,
            P, SDR: Math.round(SDR * 1000) / 1000,
            method: 'Universal Soil Loss Equation'
        };
    },

    /**
     * Streeter-Phelps BOD-DO Sag Curve Model
     */
    streeterPhelps(initialDO, temperature, flow, catchment) {
        const k1_20 = catchment.k1_20;
        const k2_20 = catchment.k2_20;

        // Temperature correction (θ = 1.047 for k1, 1.024 for k2)
        const k1 = k1_20 * Math.pow(1.047, temperature - 20);
        const k2 = k2_20 * Math.pow(1.024, temperature - 20);

        // DO saturation at temperature
        const DOsat = 14.62 - 0.3898 * temperature + 0.006969 * temperature * temperature
                      - 0.00005896 * Math.pow(temperature, 3);

        // Initial BOD (estimated from flow and land use)
        const L0 = 15 * (1 + catchment.landUse.mining * 3) / Math.max(0.5, flow / 5);

        // Initial deficit
        const D0 = Math.max(0, DOsat - initialDO);

        // Critical time (days)
        const tc = (k1 !== k2) ?
            (1 / (k2 - k1)) * Math.log((k2 / k1) * (1 - D0 * (k2 - k1) / (k1 * L0))) :
            1 / k1;

        // Critical deficit
        const Dc = (k1 * L0 / k2) * Math.exp(-k1 * Math.max(0, tc));

        // Critical DO
        const criticalDO = DOsat - Dc;

        // DO profile at key distances (0, 10, 20, 40, 60, 80 km)
        const velocity_kmd = catchment.averageVelocity_ms * 86.4;
        const doProfile = [0, 10, 20, 40, 60, 80].map(dist => {
            const t = dist / velocity_kmd;
            const D = (k1 * L0 / (k2 - k1)) *
                      (Math.exp(-k1 * t) - Math.exp(-k2 * t)) +
                      D0 * Math.exp(-k2 * t);
            return {
                distance_km: dist,
                time_days: Math.round(t * 100) / 100,
                DO: Math.round((DOsat - Math.max(0, D)) * 100) / 100,
                deficit: Math.round(Math.max(0, D) * 100) / 100
            };
        });

        return {
            DOsat: Math.round(DOsat * 100) / 100,
            criticalDO: Math.round(criticalDO * 100) / 100,
            criticalTime_days: Math.round(Math.max(0, tc) * 100) / 100,
            criticalDistance_km: Math.round(Math.max(0, tc) * velocity_kmd * 10) / 10,
            k1: Math.round(k1 * 1000) / 1000,
            k2: Math.round(k2 * 1000) / 1000,
            L0: Math.round(L0 * 10) / 10,
            D0: Math.round(D0 * 100) / 100,
            doProfile,
            method: 'Streeter-Phelps BOD-DO'
        };
    },

    /**
     * Multi-Pollutant First-Order Decay
     */
    pollutantDecay(data, catchment) {
        const decayRates = {
            organic:    { rate: 0.15, initial: 1.0 },
            nitrogen:   { rate: 0.08, initial: 1.0 },
            phosphorus: { rate: 0.05, initial: 1.0 },
            iron:       { rate: 0.01, initial: data.gee?.ironOxide || 0.3 },
            manganese:  { rate: 0.015, initial: data.gee?.manganeseStress || 0.15 },
            aluminium:  { rate: 0.02, initial: data.gee?.aluminium || 0.06 },
            amd:        { rate: 0.03, initial: data.gee?.amdi || 0.1 }
        };

        const travelTime = catchment.mainChannelLength_km /
                           (catchment.averageVelocity_ms * 86.4);

        const results = {};
        Object.entries(decayRates).forEach(([pollutant, config]) => {
            const remaining = config.initial * Math.exp(-config.rate * travelTime);
            const removal = 1 - (remaining / config.initial);
            results[pollutant] = {
                initial: Math.round(config.initial * 1000) / 1000,
                remaining: Math.round(remaining * 1000) / 1000,
                removalPct: Math.round(removal * 100),
                halfLife_days: Math.round(0.693 / config.rate * 10) / 10
            };
        });

        return { pollutants: results, travelTime_days: Math.round(travelTime * 10) / 10, method: 'First-Order Decay' };
    },

    /**
     * 1D Advection-Dispersion Transport
     */
    advectionDispersion(data, flow, catchment) {
        const velocity = Math.max(0.1, flow / (catchment.averageWidth_m * catchment.averageDepth_m));
        const D = catchment.dispersionCoeff;
        const amdi = data.gee?.amdi || data.acidMineDrainage?.value || 0.1;

        // Pollution plumes from mining discharge points
        const plumes = catchment.miningDischarges.map(sourceDist => {
            const profiles = [10, 20, 30, 50].map(dx => {
                const x = dx * 1000;
                const t = x / velocity;
                const conc = (amdi / Math.sqrt(4 * Math.PI * D * Math.max(1, t))) *
                             Math.exp(-Math.pow(x - velocity * t, 2) / (4 * D * Math.max(1, t)));
                return { distance_km: sourceDist + dx, concentration: Math.round(conc * 10000) / 10000 };
            });
            return { sourceKm: sourceDist, downstream: profiles };
        });

        const maxConc = Math.max(...plumes.flatMap(p => p.downstream.map(d => d.concentration)));
        const pollutionIndex = Math.min(1, maxConc * 50 + amdi);

        return {
            velocity_ms: Math.round(velocity * 100) / 100,
            dispersionCoeff: D,
            plumes,
            pollutionIndex: Math.round(pollutionIndex * 1000) / 1000,
            method: 'Advection-Dispersion'
        };
    },

    /** NDVI-derived organic load */
    ndviOrganicLoad(ndvi) {
        const load = (1 - ndvi) * 100;
        return { value: Math.round(load * 10) / 10, unit: 'kg/day', method: 'NDVI-derived' };
    },

    /** LST-derived water temperature */
    lstWaterTemp(lst) {
        const waterTemp = lst * 0.85;
        return { value: Math.round(waterTemp * 10) / 10, unit: '°C', method: 'LST-derived' };
    },

    /** Default catchment if DEKA_CATCHMENT not loaded */
    _defaultCatchment() {
        return {
            area_km2: 2500, mainChannelLength_km: 80, averageSlope: 0.02,
            averageVelocity_ms: 0.3, averageDepth_m: 1.2, averageWidth_m: 15,
            landUse: { forest: 0.35, agriculture: 0.40, mining: 0.15, urban: 0.10 },
            curveNumbers: { forest: 55, agriculture: 71, mining: 85, urban: 80 },
            soilK: 0.032, conservP: 0.8, k2_20: 0.46, k1_20: 0.23,
            dispersionCoeff: 5.0, miningDischarges: [15, 32, 48, 62]
        };
    }
};

window.PhysicsEngine = PhysicsEngine;
