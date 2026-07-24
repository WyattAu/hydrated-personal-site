//! Historical stress testing — replay extreme market scenarios on a portfolio.

/// Hardcoded historical crisis scenarios (daily returns for major assets).
/// Each scenario has: name, description, approximate dates, and representative
/// asset returns during the crisis peak.
pub struct Scenario {
    pub name: &'static str,
    pub description: &'static str,
    pub year: u32,
    pub shocks: &'static [(&'static str, f64)],
}

pub const SCENARIOS: &[Scenario] = &[
    Scenario {
        name: "2008 GFC",
        description: "Lehman collapse, credit freeze, global equity crash",
        year: 2008,
        shocks: &[
            ("US Equities", -45.0),
            ("Tech", -42.0),
            ("Financials", -58.0),
            ("International", -50.0),
            ("US Bonds", 5.0),
            ("Gold", 5.0),
            ("Oil", -55.0),
            ("USD", 12.0),
            ("Crypto", 0.0), // didn't exist
        ],
    },
    Scenario {
        name: "2020 COVID",
        description: "Pandemic crash, fastest bear market in history",
        year: 2020,
        shocks: &[
            ("US Equities", -34.0),
            ("Tech", -16.0),
            ("Financials", -35.0),
            ("International", -34.0),
            ("US Bonds", 3.0),
            ("Gold", -3.0),
            ("Oil", -66.0),
            ("USD", 8.0),
            ("Crypto", -45.0),
        ],
    },
    Scenario {
        name: "2022 Rate Hikes",
        description: "Fed aggressive tightening, bond bloodbath",
        year: 2022,
        shocks: &[
            ("US Equities", -19.0),
            ("Tech", -33.0),
            ("Financials", -15.0),
            ("International", -18.0),
            ("US Bonds", -13.0),
            ("Gold", -1.0),
            ("Oil", 7.0),
            ("USD", 8.0),
            ("Crypto", -65.0),
        ],
    },
    Scenario {
        name: "2024 Nikkei Flash",
        description: "Japan carry trade unwind, Nikkei -12% in a day",
        year: 2024,
        shocks: &[
            ("US Equities", -8.0),
            ("Tech", -12.0),
            ("Financials", -6.0),
            ("International", -12.0),
            ("US Bonds", 2.0),
            ("Gold", 1.0),
            ("Oil", -3.0),
            ("USD", -3.0),
            ("Crypto", -18.0),
        ],
    },
    Scenario {
        name: "Dot-Com Bust",
        description: "2000-2002 tech bubble collapse",
        year: 2000,
        shocks: &[
            ("US Equities", -38.0),
            ("Tech", -75.0),
            ("Financials", -20.0),
            ("International", -35.0),
            ("US Bonds", 20.0),
            ("Gold", 8.0),
            ("Oil", 40.0),
            ("USD", -8.0),
            ("Crypto", 0.0),
        ],
    },
];

/// Classify an asset into a shock category based on its symbol.
pub fn classify_asset(symbol: &str) -> &'static str {
    let s = symbol.to_uppercase();
    // Crypto
    if s.contains("BTC") || s.contains("ETH") || s.contains("SOL") || s.contains("XRP") {
        return "Crypto";
    }
    // Oil/Commodities
    if s.contains("CL=F") || s.contains("OIL") || s.contains("USO") || s.contains("UNG") {
        return "Oil";
    }
    // Gold
    if s.contains("GLD") || s.contains("GOLD") || s.contains("GC=F") {
        return "Gold";
    }
    // Bonds
    if s.contains("TLT") || s.contains("AGG") || s.contains("BND") || s.contains("TIP") || s.contains("HYG") {
        return "US Bonds";
    }
    // USD
    if s.contains("DX-Y") || s.contains("UUP") {
        return "USD";
    }
    // Tech
    let tech = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AVGO",
                "ADBE", "NFLX", "CRM", "ORCL", "AMD", "INTC", "QCOM", "TXN", "XLK", "SMH", "QQQ"];
    if tech.iter().any(|t| s.starts_with(t)) {
        return "Tech";
    }
    // Financials
    let fin = ["JPM", "BAC", "WFC", "GS", "MS", "C", "BLK", "AXP", "XLF"];
    if fin.iter().any(|t| s.starts_with(t)) {
        return "Financials";
    }
    // International
    let intl = ["EFA", "EEM", "VXUS", "VEA", "FXI", "INDA", "EWJ", "RSX"];
    if intl.iter().any(|t| s.starts_with(t)) {
        return "International";
    }
    // Default: US Equities
    "US Equities"
}

/// Apply stress test scenarios to a list of assets.
/// Returns the estimated portfolio P&L under each scenario.
pub fn stress_test(
    symbols: &[String],
    weights: &[f64],
) -> Vec<StressResult> {
    let mut results = Vec::new();

    for scenario in SCENARIOS {
        let mut portfolio_pnl = 0.0;
        let mut asset_pnls = Vec::new();

        for (i, symbol) in symbols.iter().enumerate() {
            let category = classify_asset(symbol);
            let shock = scenario.shocks
                .iter()
                .find(|(cat, _)| *cat == category)
                .map(|(_, ret)| *ret)
                .unwrap_or(-20.0); // default: assume -20% for unknown

            let weight = if i < weights.len() { weights[i] } else { 1.0 / symbols.len() as f64 };
            let contribution = shock * weight / 100.0;
            portfolio_pnl += contribution;
            asset_pnls.push((symbol.clone(), category.to_string(), shock, contribution));
        }

        results.push(StressResult {
            scenario: scenario.name.to_string(),
            description: scenario.description.to_string(),
            year: scenario.year,
            portfolio_pnl,
            asset_pnls,
        });
    }

    results
}

#[derive(Debug, Clone)]
pub struct StressResult {
    pub scenario: String,
    pub description: String,
    pub year: u32,
    pub portfolio_pnl: f64,
    pub asset_pnls: Vec<(String, String, f64, f64)>, // (symbol, category, shock%, contribution)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stress_2008() {
        let symbols = vec!["SPY".to_string(), "QQQ".to_string(), "TLT".to_string(), "GLD".to_string()];
        let weights = vec![0.4, 0.3, 0.2, 0.1];
        let results = stress_test(&symbols, &weights);
        let gfc = results.iter().find(|r| r.scenario == "2008 GFC").unwrap();
        assert!(gfc.portfolio_pnl < -0.20, "2008 GFC should be very negative, got {}", gfc.portfolio_pnl);
        // TLT should be positive
        let tlt = gfc.asset_pnls.iter().find(|(s, _, _, _)| s == "TLT").unwrap();
        assert!(tlt.2 > 0.0, "Bonds should be positive in GFC");
    }

    #[test]
    fn test_classification() {
        assert_eq!(classify_asset("BTC-USD"), "Crypto");
        assert_eq!(classify_asset("AAPL"), "Tech");
        assert_eq!(classify_asset("JPM"), "Financials");
        assert_eq!(classify_asset("TLT"), "US Bonds");
        assert_eq!(classify_asset("^GSPC"), "US Equities");
    }
}
