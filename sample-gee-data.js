/**
 * Sample GEE Data Format
 * 
 * This file demonstrates the expected data format for importing
 * GEE indices into the Deka River Dashboard.
 * 
 * To use: Export this data from GEE, then import via the dashboard's
 * GEE modal (cloud icon → upload button).
 */

const sampleGEEData = {
    // Export metadata
    exportedAt: new Date().toISOString(),
    source: 'Google Earth Engine - Deka Indices Dashboard',
    region: 'Deka River Catchment',
    
    // Index data from GEE
    indices: {
        // Vegetation Indices
        NDVI: {
            value: 0.65,
            min: -0.1,
            max: 0.9,
            unit: 'Index (-1 to 1)',
            description: 'Normalized Difference Vegetation Index'
        },
        EVI: {
            value: 0.42,
            min: -0.1,
            max: 1.0,
            unit: 'Index',
            description: 'Enhanced Vegetation Index'
        },
        
        // Water Indices
        NDWI: {
            value: 0.45,
            min: -0.3,
            max: 0.8,
            unit: 'Index',
            description: 'Normalized Difference Water Index'
        },
        NDMI: {
            value: 0.28,
            min: -0.3,
            max: 0.5,
            unit: 'Index',
            description: 'Normalized Difference Moisture Index'
        },
        
        // Water Quality Indices
        AMDI: {
            value: 0.142,
            min: 0.0,
            max: 0.5,
            unit: 'Index Value',
            description: 'Acid Mine Drainage Index'
        },
        NDSI: {
            value: 2.8,
            min: 0.0,
            max: 10.0,
            unit: 'dS/m',
            description: 'Normalized Difference Salinity Index'
        },
        
        // Environmental Stress Indices
        heavy_metals: {
            value: 0.32,
            min: 0.0,
            max: 1.0,
            unit: 'Stress Level',
            description: 'Heavy Metal Stress Index'
        },
        aluminium: {
            value: 0.08,
            min: 0.0,
            max: 0.5,
            unit: 'Concentration',
            description: 'Aluminium Hydroxide Index'
        },
        
        // Climate Variables
        LST: {
            value: 28.5,
            min: 15.0,
            max: 45.0,
            unit: '°C',
            description: 'Land Surface Temperature'
        },
        precipitation: {
            value: 850,
            min: 0,
            max: 2000,
            unit: 'mm/year',
            description: 'Annual Precipitation'
        },
        evapotranspiration: {
            value: 1450,
            min: 800,
            max: 2000,
            unit: 'mm/year',
            description: 'Actual Evapotranspiration'
        }
    },
    
    // Time series data (monthly for past 12 months)
    timeSeries: {
        NDVI: [
            { date: '2025-01', value: 0.58 }, { date: '2025-02', value: 0.62 },
            { date: '2025-03', value: 0.68 }, { date: '2025-04', value: 0.72 },
            { date: '2025-05', value: 0.65 }, { date: '2025-06', value: 0.55 },
            { date: '2025-07', value: 0.48 }, { date: '2025-08', value: 0.45 },
            { date: '2025-09', value: 0.52 }, { date: '2025-10', value: 0.58 },
            { date: '2025-11', value: 0.62 }, { date: '2025-12', value: 0.65 }
        ],
        NDWI: [
            { date: '2025-01', value: 0.38 }, { date: '2025-02', value: 0.42 },
            { date: '2025-03', value: 0.48 }, { date: '2025-04', value: 0.52 },
            { date: '2025-05', value: 0.45 }, { date: '2025-06', value: 0.35 },
            { date: '2025-07', value: 0.28 }, { date: '2025-08', value: 0.25 },
            { date: '2025-09', value: 0.32 }, { date: '2025-10', value: 0.38 },
            { date: '2025-11', value: 0.42 }, { date: '2025-12', value: 0.45 }
        ],
        AMDI: [
            { date: '2025-01', value: 0.12 }, { date: '2025-02', value: 0.15 },
            { date: '2025-03', value: 0.11 }, { date: '2025-04', value: 0.13 },
            { date: '2025-05', value: 0.16 }, { date: '2025-06', value: 0.14 },
            { date: '2025-07', value: 0.18 }, { date: '2025-08', value: 0.15 },
            { date: '2025-09', value: 0.12 }, { date: '2025-10', value: 0.14 },
            { date: '2025-11', value: 0.13 }, { date: '2025-12', value: 0.142 }
        ]
    },
    
    // Spatial layers available
    layers: [
        { id: 'watershed', name: 'Deka Watershed Boundary', type: 'vector' },
        { id: 'landcover', name: 'Land Cover Classification', type: 'raster' },
        { id: 'dem', name: 'Digital Elevation Model', type: 'raster' },
        { id: 'soil', name: 'Soil Type Map', type: 'raster' },
        { id: 'mines', name: 'Mining Concessions', type: 'vector' },
        { id: 'rivers', name: 'River Network', type: 'vector' }
    ]
};

// Auto-load sample data for demonstration
console.log('[GEE] Sample data loaded. Use GEEAPI.importData() to use in dashboard.');