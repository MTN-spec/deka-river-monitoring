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
        }
    ],
    roi: {
        center: [-18.3, 26.5],
        zoom: 12,
        bounds: [[-18.55, 26.15], [-18.05, 26.85]]
    }
};
