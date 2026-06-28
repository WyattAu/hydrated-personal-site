/// Concentration metrics for portfolio analysis.

/// Herfindahl-Hirschman Index (HHI).
/// Sum of squared weights (0-10000 scale for percentages).
/// <1500 = competitive, 1500-2500 = moderately concentrated, >2500 = highly concentrated.
pub fn hhi(weights: &[f64]) -> f64 {
    weights.iter().map(|w| w * w).sum()
}

/// Normalised HHI (0-1 scale).
/// 0 = perfectly diversified, 1 = single asset.
pub fn normalised_hhi(weights: &[f64]) -> f64 {
    let n = weights.len() as f64;
    if n <= 1.0 {
        return 1.0;
    }
    let raw = hhi(weights);
    let min_hhi = 1.0 / n; // minimum possible HHI (equal weights)
    let max_hhi = 1.0; // maximum (one asset = 100%)
    if max_hhi - min_hhi < 1e-10 {
        return 0.0;
    }
    (raw - min_hhi) / (max_hhi - min_hhi)
}

/// Effective number of positions (inverse HHI).
/// 1/HHI = how many equal-weight positions would give the same concentration.
pub fn effective_n(weights: &[f64]) -> f64 {
    let h = hhi(weights);
    if h > 0.0 {
        1.0 / h
    } else {
        weights.len() as f64
    }
}

/// Shannon entropy of the portfolio (in bits).
/// Higher = more diversified. log2(N) = maximum (equal weight).
pub fn entropy(weights: &[f64]) -> f64 {
    weights
        .iter()
        .filter(|w| **w > 1e-10)
        .map(|w| -w * (w.ln() / std::f64::consts::LN_2))
        .sum()
}

/// Top-N concentration ratio: sum of top N weights.
pub fn concentration_ratio(weights: &[f64], n: usize) -> f64 {
    let mut sorted = weights.to_vec();
    sorted.sort_by(|a, b| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));
    sorted.iter().take(n).sum()
}

/// Gini coefficient (0 = equal, 1 = concentrated).
pub fn gini_coefficient(weights: &[f64]) -> f64 {
    let n = weights.len();
    if n < 2 {
        return 0.0;
    }
    let mut sorted = weights.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let total: f64 = sorted.iter().sum();
    if total <= 0.0 {
        return 0.0;
    }
    // Gini = (2 * sum(i * w_i) / (n * sum(w))) - (n + 1) / n
    let weighted_sum: f64 = sorted
        .iter()
        .enumerate()
        .map(|(i, w)| ((i + 1) as f64) * w)
        .sum();
    let nf = n as f64;
    (2.0 * weighted_sum) / (nf * total) - (nf + 1.0) / nf
}

#[derive(Debug, Clone)]
pub struct ConcentrationResult {
    pub hhi: f64,
    pub normalised_hhi: f64,
    pub effective_n: f64,
    pub entropy: f64,
    pub max_entropy: f64,
    pub top5_concentration: f64,
    pub top10_concentration: f64,
    pub gini: f64,
    pub classification: String,
}

pub fn full_analysis(weights: &[f64]) -> ConcentrationResult {
    let h = hhi(weights);
    let nh = normalised_hhi(weights);
    let eff_n = effective_n(weights);
    let ent = entropy(weights);
    let max_ent = (weights.len() as f64).log2();
    let top5 = concentration_ratio(weights, 5);
    let top10 = concentration_ratio(weights, 10);
    let gini = gini_coefficient(weights);

    let classification = if h < 0.15 {
        "Diversified".to_string()
    } else if h < 0.25 {
        "Moderately Concentrated".to_string()
    } else {
        "Highly Concentrated".to_string()
    };

    ConcentrationResult {
        hhi: h,
        normalised_hhi: nh,
        effective_n: eff_n,
        entropy: ent,
        max_entropy: max_ent,
        top5_concentration: top5,
        top10_concentration: top10,
        gini,
        classification,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_equal_weight_hhi() {
        let weights = vec![0.25, 0.25, 0.25, 0.25];
        assert!((hhi(&weights) - 0.25).abs() < 0.001);
    }

    #[test]
    fn test_single_asset_hhi() {
        let weights = vec![1.0];
        assert!((hhi(&weights) - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_effective_n() {
        let weights = vec![0.5, 0.5];
        assert!((effective_n(&weights) - 2.0).abs() < 0.001);
    }

    #[test]
    fn test_concentration_ratio() {
        let weights = vec![0.4, 0.3, 0.2, 0.1];
        assert!((concentration_ratio(&weights, 2) - 0.7).abs() < 0.001);
    }

    #[test]
    fn test_entropy() {
        let weights = vec![0.5, 0.5];
        assert!((entropy(&weights) - 1.0).abs() < 0.001); // 1 bit
    }

    #[test]
    fn test_gini_equal() {
        let weights = vec![0.25, 0.25, 0.25, 0.25];
        assert!(gini_coefficient(&weights) < 0.1, "gini for equal weight should be small: {}", gini_coefficient(&weights));
    }
}
