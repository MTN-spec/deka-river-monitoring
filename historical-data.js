/**
 * =============================================================================
 * HISTORICAL DATA MODULE — DEKA RIVER (2020–2025)
 * =============================================================================
 * Provides:
 *   - 60 monthly synthetic observations calibrated to Deka River wet/dry cycle
 *   - Zimbabwe EMA SI 6 of 2007 water quality standards
 *   - Training/validation data for ML/DL model calibration
 *   - Known mining event signatures (pollution spikes)
 *
 * @author  Tadiwanashe Blessings Mbavarira
 * @version 2.0
 */

// ─── Zimbabwe EMA Standards (SI 6 of 2007) ──────────────────────────────────
const EMA_STANDARDS = {
    ph:           { min: 6.0, max: 9.0, optimal: 7.0, unit: '-',      label: 'pH' },
    do:           { min: 5.0, max: 14.0, optimal: 8.0, unit: 'mg/L',  label: 'Dissolved Oxygen' },
    tss:          { min: 0,   max: 50,  optimal: 25,  unit: 'mg/L',   label: 'Total Suspended Solids' },
    conductivity: { min: 0,   max: 1000, optimal: 200, unit: 'µS/cm', label: 'Electrical Conductivity' },
    temperature:  { min: 0,   max: 35,  optimal: 22,  unit: '°C',     label: 'Temperature' },
    iron:         { min: 0,   max: 1.0, optimal: 0.3, unit: 'mg/L',   label: 'Iron (Fe)' },
    manganese:    { min: 0,   max: 0.5, optimal: 0.1, unit: 'mg/L',   label: 'Manganese (Mn)' },
    aluminium:    { min: 0,   max: 0.5, optimal: 0.1, unit: 'mg/L',   label: 'Aluminium (Al)' },
    sulphate:     { min: 0,   max: 400, optimal: 150, unit: 'mg/L',   label: 'Sulphate (SO₄)' },
    nitrate:      { min: 0,   max: 10,  optimal: 2.0, unit: 'mg/L',   label: 'Nitrate (NO₃)' },
    phosphate:    { min: 0,   max: 1.0, optimal: 0.3, unit: 'mg/L',   label: 'Phosphate (PO₄)' },
    turbidity:    { min: 0,   max: 25,  optimal: 5,   unit: 'NTU',    label: 'Turbidity' },
    bod:          { min: 0,   max: 30,  optimal: 3,   unit: 'mg/L',   label: 'BOD₅' },

    // Alert thresholds (derived from EMA)
    alerts: {
        ph:           { warning: [5.5, 6.0, 9.0, 9.5], critical: [0, 5.5, 9.5, 14] },
        do:           { warning: 5.0, critical: 4.0 },
        tss:          { warning: 50,  critical: 100 },
        conductivity: { warning: 700, critical: 1000 },
        temperature:  { warning: 30,  critical: 35 },
        iron:         { warning: 0.5, critical: 1.0 },
        manganese:    { warning: 0.3, critical: 0.5 },
        aluminium:    { warning: 0.3, critical: 0.5 },
        sulphate:     { warning: 250, critical: 400 },
        turbidity:    { warning: 15,  critical: 25 }
    }
};

// ─── Deka River Catchment Parameters ────────────────────────────────────────
const DEKA_CATCHMENT = {
    area_km2: 2500,
    mainChannelLength_km: 80,
    averageSlope: 0.02,
    averageVelocity_ms: 0.3,      // m/s (mean annual)
    averageDepth_m: 1.2,
    averageWidth_m: 15,
    landUse: {
        forest:      0.35,
        agriculture: 0.40,
        mining:      0.15,
        urban:       0.10
    },
    // SCS Curve Numbers by land use and hydrologic soil group (B)
    curveNumbers: {
        forest:      55,
        agriculture: 71,
        mining:      85,
        urban:       80
    },
    // USLE soil erodibility factor (K)
    soilK: 0.032,
    // USLE conservation practice factor (P)
    conservP: 0.8,
    // Reaeration constant at 20°C
    k2_20: 0.46,
    // Deoxygenation rate at 20°C
    k1_20: 0.23,
    // Dispersion coefficient (m²/s)
    dispersionCoeff: 5.0,
    // Mining discharge locations (relative distance along channel, km)
    miningDischarges: [15, 32, 48, 62]
};

// ─── Seasonal Profile (Deka River, Zimbabwe) ────────────────────────────────
// Wet season: Nov–Mar, Dry season: Apr–Oct
const SEASONAL_PROFILE = {
    //                    Jan   Feb   Mar   Apr   May   Jun   Jul   Aug   Sep   Oct   Nov   Dec
    precipitation_mm:   [ 180,  165,  120,   30,    5,    0,    0,    0,    5,   25,   90,  150 ],
    temperature_C:      [ 26.5, 26.0, 25.0, 23.0, 19.5, 17.0, 16.5, 19.0, 22.5, 25.0, 26.0, 26.5 ],
    evapotransp_mm:     [ 155,  140,  130,   95,   65,   50,   55,   75,  100,  130,  145,  155 ],
    riverFlow_m3s:      [ 12.5, 15.0, 10.0,  5.0,  2.5,  1.5,  1.0,  0.8,  1.0,  2.0,  5.0,  9.0 ],
    ndvi:               [ 0.72, 0.75, 0.70, 0.60, 0.50, 0.42, 0.38, 0.35, 0.40, 0.50, 0.60, 0.68 ],
    ndwi:               [ 0.48, 0.52, 0.45, 0.35, 0.28, 0.22, 0.18, 0.16, 0.20, 0.28, 0.38, 0.45 ],
    turbidity_NTU:      [ 18,   22,   15,    8,    5,    3,    2,    2,    3,    5,   10,   15 ]
};

// ─── Generate 2020–2025 Monthly Historical Data ─────────────────────────────
function generateHistoricalData() {
    const data = [];
    const startYear = 2020;
    const endYear = 2025;

    // Seeded pseudo-random for reproducibility
    let seed = 42;
    function seededRandom() {
        seed = (seed * 16807 + 0) % 2147483647;
        return (seed - 1) / 2147483646;
    }
    function gaussianRandom(mean, std) {
        const u1 = seededRandom();
        const u2 = seededRandom();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + std * z;
    }

    // Known pollution events (year, month, severity 0-1)
    const pollutionEvents = [
        { year: 2020, month: 7,  severity: 0.6, type: 'mining_spill' },
        { year: 2021, month: 3,  severity: 0.4, type: 'runoff_surge' },
        { year: 2021, month: 11, severity: 0.5, type: 'mining_discharge' },
        { year: 2022, month: 6,  severity: 0.7, type: 'amd_event' },
        { year: 2023, month: 1,  severity: 0.3, type: 'seasonal_flush' },
        { year: 2023, month: 8,  severity: 0.8, type: 'major_spill' },
        { year: 2024, month: 4,  severity: 0.35, type: 'mining_discharge' },
        { year: 2024, month: 9,  severity: 0.45, type: 'amd_event' },
        { year: 2025, month: 2,  severity: 0.25, type: 'runoff_surge' }
    ];

    for (let year = startYear; year <= endYear; year++) {
        for (let month = 0; month < 12; month++) {
            // Skip future months in 2025
            if (year === 2025 && month > 3) break;

            const monthIdx = month;
            const seasonal = SEASONAL_PROFILE;

            // Check for pollution event this month
            const event = pollutionEvents.find(e => e.year === year && e.month === month + 1);
            const eventSeverity = event ? event.severity : 0;

            // Base values from seasonal profile + inter-annual variability
            const yearOffset = (year - 2022) * 0.02; // Slight degradation trend

            // In-situ parameters
            const ph = gaussianRandom(
                7.1 - eventSeverity * 1.5 - yearOffset * 0.5,
                0.3
            );
            const doVal = gaussianRandom(
                8.0 - eventSeverity * 3.0 + (seasonal.riverFlow_m3s[monthIdx] > 5 ? 0.5 : -0.5),
                0.5
            );
            const tss = Math.max(0, gaussianRandom(
                seasonal.turbidity_NTU[monthIdx] * 1.5 + eventSeverity * 40,
                5
            ));
            const conductivity = Math.max(50, gaussianRandom(
                190 + eventSeverity * 200 - seasonal.precipitation_mm[monthIdx] * 0.3,
                25
            ));
            const turbidity = Math.max(0, gaussianRandom(
                seasonal.turbidity_NTU[monthIdx] + eventSeverity * 15,
                3
            ));
            const temp = gaussianRandom(seasonal.temperature_C[monthIdx], 1.0);

            // GEE spectral indices
            const ndvi = Math.max(-0.1, Math.min(0.95, gaussianRandom(
                seasonal.ndvi[monthIdx] - eventSeverity * 0.15,
                0.05
            )));
            const ndwi = Math.max(-0.3, Math.min(0.8, gaussianRandom(
                seasonal.ndwi[monthIdx] - eventSeverity * 0.1,
                0.04
            )));
            const amdi = Math.max(0, Math.min(0.5, gaussianRandom(
                0.10 + eventSeverity * 0.25 + yearOffset * 0.02,
                0.03
            )));
            const salinity = Math.max(0, gaussianRandom(
                2.5 + eventSeverity * 2.0 - seasonal.precipitation_mm[monthIdx] * 0.005,
                0.4
            ));
            const heavyMetals = Math.max(0, Math.min(1.0, gaussianRandom(
                0.25 + eventSeverity * 0.4 + yearOffset * 0.03,
                0.05
            )));
            const aluminium = Math.max(0, Math.min(0.5, gaussianRandom(
                0.06 + eventSeverity * 0.2,
                0.02
            )));
            const ironOxide = Math.max(0, Math.min(1.0, gaussianRandom(
                0.3 + eventSeverity * 0.35,
                0.06
            )));
            const ferricRatio = Math.max(0, Math.min(1.0, gaussianRandom(
                0.4 + eventSeverity * 0.3,
                0.05
            )));
            const ironSulfate = Math.max(0, Math.min(1.0, gaussianRandom(
                0.2 + eventSeverity * 0.4,
                0.05
            )));
            const manganeseStress = Math.max(0, Math.min(1.0, gaussianRandom(
                0.15 + eventSeverity * 0.3,
                0.04
            )));
            const ndsi = Math.max(-1, Math.min(1, gaussianRandom(
                0.1 + eventSeverity * 0.2 - seasonal.precipitation_mm[monthIdx] * 0.001,
                0.05
            )));
            const mndwi = Math.max(-1, Math.min(1, gaussianRandom(
                seasonal.ndwi[monthIdx] * 0.9 - eventSeverity * 0.15,
                0.04
            )));
            const ndti = Math.max(0, Math.min(1, gaussianRandom(
                0.2 + eventSeverity * 0.3 + (1 - seasonal.ndwi[monthIdx]) * 0.1,
                0.04
            )));
            const saturationIndex = Math.max(0, Math.min(1, gaussianRandom(
                0.5 + eventSeverity * 0.2 - seasonal.ndvi[monthIdx] * 0.2,
                0.06
            )));
            const redEdgeStress = Math.max(0, Math.min(1, gaussianRandom(
                0.2 + eventSeverity * 0.35,
                0.04
            )));
            const ndStressSensitivity = Math.max(0, Math.min(1, gaussianRandom(
                0.3 + eventSeverity * 0.3,
                0.05
            )));
            const lst = gaussianRandom(
                seasonal.temperature_C[monthIdx] + 3 + eventSeverity * 2,
                1.5
            );

            // Calculate WQI from in-situ parameters (CCME-style)
            const wqi = calculateWQI({
                ph, do: doVal, tss, conductivity, turbidity, temp
            });

            const record = {
                date: `${year}-${String(month + 1).padStart(2, '0')}`,
                year,
                month: month + 1,
                monthName: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month],

                // In-situ measurements
                insitu: {
                    ph: Math.round(ph * 100) / 100,
                    do: Math.round(doVal * 100) / 100,
                    tss: Math.round(tss * 10) / 10,
                    conductivity: Math.round(conductivity),
                    turbidity: Math.round(turbidity * 10) / 10,
                    temperature: Math.round(temp * 10) / 10
                },

                // GEE spectral indices (all 18)
                gee: {
                    ndvi:               Math.round(ndvi * 1000) / 1000,
                    ndwi:               Math.round(ndwi * 1000) / 1000,
                    amdi:               Math.round(amdi * 1000) / 1000,
                    salinity:           Math.round(salinity * 100) / 100,
                    heavyMetals:        Math.round(heavyMetals * 1000) / 1000,
                    aluminium:          Math.round(aluminium * 1000) / 1000,
                    ironOxide:          Math.round(ironOxide * 1000) / 1000,
                    ferricRatio:        Math.round(ferricRatio * 1000) / 1000,
                    ironSulfate:        Math.round(ironSulfate * 1000) / 1000,
                    manganeseStress:    Math.round(manganeseStress * 1000) / 1000,
                    ndsi:               Math.round(ndsi * 1000) / 1000,
                    mndwi:              Math.round(mndwi * 1000) / 1000,
                    ndti:               Math.round(ndti * 1000) / 1000,
                    saturationIndex:    Math.round(saturationIndex * 1000) / 1000,
                    redEdgeStress:      Math.round(redEdgeStress * 1000) / 1000,
                    ndStressSensitivity:Math.round(ndStressSensitivity * 1000) / 1000,
                    lst:                Math.round(lst * 10) / 10,
                    amdDetection:       Math.round((amdi * 0.5 + ironSulfate * 0.3 + ferricRatio * 0.2) * 1000) / 1000
                },

                // Climate
                climate: {
                    precipitation: seasonal.precipitation_mm[monthIdx] + Math.round(gaussianRandom(0, 15)),
                    evapotranspiration: seasonal.evapotransp_mm[monthIdx] + Math.round(gaussianRandom(0, 10)),
                    riverFlow: Math.round((seasonal.riverFlow_m3s[monthIdx] + gaussianRandom(0, 1)) * 10) / 10,
                    lst: Math.round(lst * 10) / 10
                },

                // Computed WQI
                wqi: Math.round(wqi),

                // Pollution event metadata
                event: event || null
            };

            data.push(record);
        }
    }

    return data;
}

// ─── CCME-style Water Quality Index Calculation ─────────────────────────────
function calculateWQI(params) {
    const standards = EMA_STANDARDS;
    const variables = ['ph', 'do', 'tss', 'conductivity', 'turbidity'];
    let failedVars = 0;
    let totalTests = 0;
    let failedTests = 0;
    let nse = 0; // Normalized sum of excursions

    variables.forEach(v => {
        totalTests++;
        const val = params[v];
        const std = standards[v];
        if (!std) return;

        let excursion = 0;
        if (v === 'ph') {
            if (val < std.min) {
                excursion = (std.min - val) / std.min;
                failedTests++;
                failedVars++;
            } else if (val > std.max) {
                excursion = (val - std.max) / std.max;
                failedTests++;
                failedVars++;
            }
        } else if (v === 'do') {
            if (val < std.min) {
                excursion = (std.min - val) / std.min;
                failedTests++;
                failedVars++;
            }
        } else {
            if (val > std.max) {
                excursion = (val - std.max) / std.max;
                failedTests++;
                failedVars++;
            }
        }
        nse += excursion;
    });

    // CCME formula
    const f1 = (failedVars / variables.length) * 100;
    const f2 = (failedTests / totalTests) * 100;
    const f3 = totalTests > 0 ? (nse / totalTests) / (0.01 * nse / totalTests + 0.01) : 0;

    const wqi = 100 - (Math.sqrt(f1 * f1 + f2 * f2 + f3 * f3) / 1.732);
    return Math.max(0, Math.min(100, wqi));
}

// ─── Data Access API ────────────────────────────────────────────────────────
const HistoricalData = {
    _data: null,

    /** Get all historical records */
    getAll() {
        if (!this._data) this._data = generateHistoricalData();
        return this._data;
    },

    /** Get records for a specific year */
    getYear(year) {
        return this.getAll().filter(d => d.year === year);
    },

    /** Get records for a date range */
    getRange(startDate, endDate) {
        return this.getAll().filter(d => d.date >= startDate && d.date <= endDate);
    },

    /** Get the last N months of data */
    getLastN(n) {
        const all = this.getAll();
        return all.slice(-n);
    },

    /** Get WQI time series */
    getWQISeries() {
        return this.getAll().map(d => ({
            date: d.date,
            wqi: d.wqi,
            event: d.event
        }));
    },

    /** Get 18-dim GEE feature vector for a record */
    getGEEVector(record) {
        const g = record.gee;
        return [
            g.ndvi, g.ndwi, g.amdi, g.salinity, g.heavyMetals,
            g.aluminium, g.ironOxide, g.ferricRatio, g.ironSulfate,
            g.manganeseStress, g.ndsi, g.mndwi, g.ndti,
            g.saturationIndex, g.redEdgeStress, g.ndStressSensitivity,
            g.lst / 50, // normalized to 0-1 range
            g.amdDetection
        ];
    },

    /** Get LSTM input sequence (last 12 months, 6-dim per step) */
    getLSTMSequence() {
        const last12 = this.getLastN(12);
        return last12.map(d => [
            d.wqi / 100,
            d.gee.amdi,
            d.gee.ndwi,
            d.gee.heavyMetals,
            d.insitu.ph / 14,
            d.insitu.do / 14
        ]);
    },

    /** Get training/validation split (80/20) */
    getTrainValSplit() {
        const all = this.getAll();
        const splitIdx = Math.floor(all.length * 0.8);
        return {
            train: all.slice(0, splitIdx),
            val: all.slice(splitIdx)
        };
    },

    /** Get pollution events */
    getEvents() {
        return this.getAll().filter(d => d.event !== null);
    },

    /** Get EMA standards */
    getEMAStandards() {
        return EMA_STANDARDS;
    },

    /** Get catchment parameters */
    getCatchmentParams() {
        return DEKA_CATCHMENT;
    },

    /** Get seasonal profile */
    getSeasonalProfile() {
        return SEASONAL_PROFILE;
    },

    /** Get statistics summary */
    getStatistics() {
        const all = this.getAll();
        const wqiValues = all.map(d => d.wqi);
        const n = wqiValues.length;
        const mean = wqiValues.reduce((s, v) => s + v, 0) / n;
        const std = Math.sqrt(wqiValues.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
        const sorted = [...wqiValues].sort((a, b) => a - b);

        return {
            count: n,
            mean: Math.round(mean * 10) / 10,
            std: Math.round(std * 10) / 10,
            min: sorted[0],
            max: sorted[n - 1],
            median: sorted[Math.floor(n / 2)],
            q25: sorted[Math.floor(n * 0.25)],
            q75: sorted[Math.floor(n * 0.75)]
        };
    }
};

// Export
window.HistoricalData = HistoricalData;
window.EMA_STANDARDS = EMA_STANDARDS;
window.DEKA_CATCHMENT = DEKA_CATCHMENT;
window.SEASONAL_PROFILE = SEASONAL_PROFILE;
