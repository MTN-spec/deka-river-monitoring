const mockData = {
    indices: [
        {
            id: 'amdi',
            name: 'AMDI (Acid Mine Drainage Index)',
            description: 'Detects acidity levels in water bodies using spectral signatures.',
            unit: 'Index Value',
            threshold: 0.2,
            currentValue: 0.142,
            trend: 4.2,
            palette: ['#fbbf24', '#ffffff', '#3b82f6'],
            history: [
                { date: 'Jan', value: 0.12 },
                { date: 'Feb', value: 0.15 },
                { date: 'Mar', value: 0.11 },
                { date: 'Apr', value: 0.13 },
                { date: 'May', value: 0.16 },
                { date: 'Jun', value: 0.14 },
                { date: 'Jul', value: 0.18 },
                { date: 'Aug', value: 0.15 },
                { date: 'Sep', value: 0.12 },
                { date: 'Oct', value: 0.14 }
            ]
        },
        {
            id: 'salinity',
            name: 'NDSI (Salinity Index)',
            description: 'Monitors salt concentration in soil and water.',
            unit: 'dS/m',
            threshold: 4.0,
            currentValue: 2.8,
            trend: -1.5,
            palette: ['#ecfdf5', '#10b981', '#064e3b'],
            history: [
                { date: 'Jan', value: 3.1 },
                { date: 'Feb', value: 3.0 },
                { date: 'Mar', value: 2.9 },
                { date: 'Apr', value: 2.8 },
                { date: 'May', value: 2.7 },
                { date: 'Jun', value: 2.8 },
                { date: 'Jul', value: 2.9 },
                { date: 'Aug', value: 2.8 },
                { date: 'Sep', value: 2.7 },
                { date: 'Oct', value: 2.8 }
            ]
        },
        {
            id: 'heavy_metals',
            name: 'Heavy Metal Stress Index',
            description: 'Identifies areas with high heavy metal concentration in vegetation.',
            unit: 'Stress Level',
            threshold: 0.5,
            currentValue: 0.32,
            trend: 2.1,
            palette: ['#fee2e2', '#ef4444', '#7f1d1d'],
            history: [
                { date: 'Jan', value: 0.28 }, { date: 'Feb', value: 0.30 }, { date: 'Mar', value: 0.31 }, { date: 'Apr', value: 0.29 }, { date: 'May', value: 0.32 }, { date: 'Jun', value: 0.33 }, { date: 'Jul', value: 0.35 }, { date: 'Aug', value: 0.34 }, { date: 'Sep', value: 0.32 }, { date: 'Oct', value: 0.32 }
            ]
        },
        {
            id: 'aluminium',
            name: 'Aluminium Hydroxide Index',
            description: 'Detects aluminium hydroxide deposits and runoff in water bodies.',
            unit: 'Concentration',
            threshold: 0.15,
            currentValue: 0.08,
            trend: 1.2,
            palette: ['#e0f2fe', '#38bdf8', '#0369a1'],
            history: [
                { date: 'Jan', value: 0.05 }, { date: 'Feb', value: 0.06 }, { date: 'Mar', value: 0.07 }, { date: 'Apr', value: 0.06 }, { date: 'May', value: 0.08 }, { date: 'Jun', value: 0.09 }, { date: 'Jul', value: 0.10 }, { date: 'Aug', value: 0.09 }, { date: 'Sep', value: 0.08 }, { date: 'Oct', value: 0.08 }
            ]
        },
        {
            id: 'ndwi',
            name: 'NDWI (Water Index)',
            description: 'Normalized Difference Water Index to monitor surface water extent.',
            unit: 'Index',
            threshold: 0.0,
            currentValue: 0.45,
            trend: -0.5,
            palette: ['#f0f9ff', '#0ea5e9', '#0c4a6e'],
            history: [
                { date: 'Jan', value: 0.50 }, { date: 'Feb', value: 0.48 }, { date: 'Mar', value: 0.46 }, { date: 'Apr', value: 0.45 }, { date: 'May', value: 0.44 }, { date: 'Jun', value: 0.45 }, { date: 'Jul', value: 0.46 }, { date: 'Aug', value: 0.47 }, { date: 'Sep', value: 0.45 }, { date: 'Oct', value: 0.45 }
            ]
        },
        {
            id: 'ferric_iron',
            name: 'Ferric Iron Index',
            description: 'Identifies ferric iron concentration in water and soil.',
            unit: 'Index Value',
            threshold: 0.4,
            currentValue: 0.28,
            trend: 1.8,
            palette: ['#fff7ed', '#fb923c', '#7c2d12'],
            history: [
                { date: 'Jan', value: 0.22 }, { date: 'Feb', value: 0.24 }, { date: 'Mar', value: 0.25 }, { date: 'Apr', value: 0.23 }, { date: 'May', value: 0.26 }, { date: 'Jun', value: 0.27 }, { date: 'Jul', value: 0.29 }, { date: 'Aug', value: 0.30 }, { date: 'Sep', value: 0.28 }, { date: 'Oct', value: 0.28 }
            ]
        },
        {
            id: 'turbidity',
            name: 'NDTI (Turbidity Index)',
            description: 'Monitors water turbidity and suspended solids.',
            unit: 'Index Value',
            threshold: 0.1,
            currentValue: 0.15,
            trend: 5.4,
            palette: ['#f5f5f4', '#78716c', '#292524'],
            history: [
                { date: 'Jan', value: 0.08 }, { date: 'Feb', value: 0.10 }, { date: 'Mar', value: 0.12 }, { date: 'Apr', value: 0.11 }, { date: 'May', value: 0.13 }, { date: 'Jun', value: 0.15 }, { date: 'Jul', value: 0.18 }, { date: 'Aug', value: 0.17 }, { date: 'Sep', value: 0.15 }, { date: 'Oct', value: 0.15 }
            ]
        },
        {
            id: 'iron_oxide',
            name: 'Iron Oxide Index',
            description: 'Detects presence of iron oxide minerals.',
            unit: 'Index Value',
            threshold: 0.3,
            currentValue: 0.35,
            trend: -0.8,
            palette: ['#fef2f2', '#f87171', '#7f1d1d'],
            history: [
                { date: 'Jan', value: 0.38 }, { date: 'Feb', value: 0.37 }, { date: 'Mar', value: 0.36 }, { date: 'Apr', value: 0.35 }, { date: 'May', value: 0.34 }, { date: 'Jun', value: 0.35 }, { date: 'Jul', value: 0.36 }, { date: 'Aug', value: 0.35 }, { date: 'Sep', value: 0.35 }, { date: 'Oct', value: 0.35 }
            ]
        },
        {
            id: 'manganese',
            name: 'Manganese Stress Index',
            description: 'Monitors vegetation stress caused by manganese concentration.',
            unit: 'Stress Level',
            threshold: 0.45,
            currentValue: 0.22,
            trend: 0.5,
            palette: ['#f3e8ff', '#a855f7', '#4c1d95'],
            history: [
                { date: 'Jan', value: 0.20 }, { date: 'Feb', value: 0.21 }, { date: 'Mar', value: 0.20 }, { date: 'Apr', value: 0.22 }, { date: 'May', value: 0.21 }, { date: 'Jun', value: 0.23 }, { date: 'Jul', value: 0.24 }, { date: 'Aug', value: 0.23 }, { date: 'Sep', value: 0.22 }, { date: 'Oct', value: 0.22 }
            ]
        },
        {
            id: 'amwi',
            name: 'AMWI (Acid Mine Water Index)',
            description: 'Specifically targets acidic water detection in pits and runoff.',
            unit: 'Index Value',
            threshold: 0.3,
            currentValue: 0.25,
            trend: 3.1,
            palette: ['#fff1f2', '#f43f5e', '#881337'],
            history: [
                { date: 'Jan', value: 0.18 }, { date: 'Feb', value: 0.20 }, { date: 'Mar', value: 0.22 }, { date: 'Apr', value: 0.21 }, { date: 'May', value: 0.23 }, { date: 'Jun', value: 0.25 }, { date: 'Jul', value: 0.28 }, { date: 'Aug', value: 0.27 }, { date: 'Sep', value: 0.25 }, { date: 'Oct', value: 0.25 }
            ]
        },
        {
            id: 'iron_sulfate',
            name: 'Iron Sulfate Index',
            description: 'Detects iron sulfate deposits associated with mine drainage.',
            unit: 'Concentration',
            threshold: 0.2,
            currentValue: 0.12,
            trend: -2.5,
            palette: ['#ecfdf5', '#10b981', '#064e3b'],
            history: [
                { date: 'Jan', value: 0.15 }, { date: 'Feb', value: 0.14 }, { date: 'Mar', value: 0.13 }, { date: 'Apr', value: 0.12 }, { date: 'May', value: 0.11 }, { date: 'Jun', value: 0.12 }, { date: 'Jul', value: 0.13 }, { date: 'Aug', value: 0.12 }, { date: 'Sep', value: 0.12 }, { date: 'Oct', value: 0.12 }
            ]
        },
        {
            id: 'red_edge_stress',
            name: 'Red Edge Stress Index',
            description: 'Uses red-edge bands to detect early vegetation stress from mining.',
            unit: 'Stress Index',
            threshold: 0.6,
            currentValue: 0.48,
            trend: 0.8,
            palette: ['#f0fdf4', '#22c55e', '#14532d'],
            history: [
                { date: 'Jan', value: 0.45 }, { date: 'Feb', value: 0.46 }, { date: 'Mar', value: 0.45 }, { date: 'Apr', value: 0.47 }, { date: 'May', value: 0.46 }, { date: 'Jun', value: 0.48 }, { date: 'Jul', value: 0.49 }, { date: 'Aug', value: 0.48 }, { date: 'Sep', value: 0.48 }, { date: 'Oct', value: 0.48 }
            ]
        },
        {
            id: 'saturation',
            name: 'Saturation Index',
            description: 'Monitors soil moisture and water logging in mine-affected areas.',
            unit: 'Index Value',
            threshold: 0.4,
            currentValue: 0.55,
            trend: 1.2,
            palette: ['#eff6ff', '#3b82f6', '#1e3a8a'],
            history: [
                { date: 'Jan', value: 0.50 }, { date: 'Feb', value: 0.52 }, { date: 'Mar', value: 0.54 }, { date: 'Apr', value: 0.53 }, { date: 'May', value: 0.55 }, { date: 'Jun', value: 0.56 }, { date: 'Jul', value: 0.58 }, { date: 'Aug', value: 0.57 }, { date: 'Sep', value: 0.55 }, { date: 'Oct', value: 0.55 }
            ]
        }
    ],
    roi: {
        center: [-18.3, 26.5],
        zoom: 12,
        bounds: [[-18.55, 26.15], [-18.05, 26.85]]
    }
};
