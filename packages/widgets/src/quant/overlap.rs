/// Holdings overlap analysis between ETFs.

/// Jaccard index: |intersection| / |union| of holdings tickers.
pub fn jaccard_index(set_a: &[String], set_b: &[String]) -> f64 {
    let intersection = set_a.iter().filter(|t| set_b.contains(t)).count();
    let union = set_a.len() + set_b.len() - intersection;
    if union == 0 {
        return 0.0;
    }
    intersection as f64 / union as f64
}

/// Weighted overlap: sum of min(weight_a, weight_b) for common holdings.
/// Returns 0-1 where 1 = identical portfolios.
pub fn weighted_overlap(
    tickers_a: &[String],
    weights_a: &[f64],
    tickers_b: &[String],
    weights_b: &[f64],
) -> f64 {
    let mut total: f64 = 0.0;
    for (i, ticker) in tickers_a.iter().enumerate() {
        if let Some(j) = tickers_b.iter().position(|t| t == ticker) {
            total += weights_a[i].min(weights_b[j]);
        }
    }
    total
}

/// Full overlap analysis between two ETFs.
pub fn analyze_overlap(
    tickers_a: &[String],
    weights_a: &[f64],
    tickers_b: &[String],
    weights_b: &[f64],
) -> OverlapResult {
    let set_a: Vec<&String> = tickers_a.iter().collect();
    let set_b: Vec<&String> = tickers_b.iter().collect();
    let intersection: Vec<String> = set_a
        .iter()
        .filter(|t| set_b.contains(t))
        .map(|t| (*t).clone())
        .collect();
    let union_count = tickers_a.len() + tickers_b.len() - intersection.len();

    let jaccard = if union_count > 0 {
        intersection.len() as f64 / union_count as f64
    } else {
        0.0
    };

    let w_overlap = weighted_overlap(tickers_a, weights_a, tickers_b, weights_b);

    // Common holdings with their weights from both ETFs
    let common: Vec<(String, f64, f64)> = intersection
        .iter()
        .map(|t| {
            let i = tickers_a.iter().position(|x| x == t).unwrap();
            let j = tickers_b.iter().position(|x| x == t).unwrap();
            (t.clone(), weights_a[i], weights_b[j])
        })
        .collect();

    OverlapResult {
        jaccard_index: jaccard,
        weighted_overlap: w_overlap,
        common_holdings_count: intersection.len(),
        union_count,
        common_holdings: common,
    }
}

#[derive(Debug, Clone)]
pub struct OverlapResult {
    pub jaccard_index: f64,
    pub weighted_overlap: f64,
    pub common_holdings_count: usize,
    pub union_count: usize,
    pub common_holdings: Vec<(String, f64, f64)>, // (ticker, weight_a, weight_b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_identical_overlap() {
        let a = vec!["AAPL".to_string(), "MSFT".to_string()];
        let wa = vec![0.5, 0.5];
        let b = vec!["AAPL".to_string(), "MSFT".to_string()];
        let wb = vec![0.5, 0.5];
        let result = analyze_overlap(&a, &wa, &b, &wb);
        assert!((result.jaccard_index - 1.0).abs() < 0.001);
        assert!((result.weighted_overlap - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_no_overlap() {
        let a = vec!["AAPL".to_string()];
        let wa = vec![1.0];
        let b = vec!["TSLA".to_string()];
        let wb = vec![1.0];
        let result = analyze_overlap(&a, &wa, &b, &wb);
        assert!((result.jaccard_index - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_partial_overlap() {
        let a = vec!["AAPL".to_string(), "MSFT".to_string(), "GOOG".to_string()];
        let wa = vec![0.3, 0.3, 0.4];
        let b = vec!["MSFT".to_string(), "TSLA".to_string()];
        let wb = vec![0.5, 0.5];
        let result = analyze_overlap(&a, &wa, &b, &wb);
        assert!((result.jaccard_index - (1.0 / 4.0)).abs() < 0.001); // 1 common, 4 union
        assert!((result.weighted_overlap - 0.3).abs() < 0.001); // min(0.3, 0.5)
    }
}
