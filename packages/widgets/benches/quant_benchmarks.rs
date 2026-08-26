//! Criterion benchmarks for quant kernels, serialization, and data structures.

use criterion::{criterion_group, criterion_main, BenchmarkId, Criterion};
use hydrated_widgets::quant;
use hydrated_widgets::data_structures;

fn generate_prices(n: usize) -> Vec<f64> {
    let mut prices = Vec::with_capacity(n);
    let mut p = 100.0;
    for i in 0..n {
        let ret = 0.0001 + 0.01 * ((i as f64 * 0.1).sin());
        p *= 1.0 + ret;
        prices.push(p);
    }
    prices
}

fn generate_returns(n: usize) -> Vec<f64> {
    let prices = generate_prices(n + 1);
    (1..prices.len())
        .map(|i| (prices[i] / prices[i - 1]).ln())
        .collect()
}

fn generate_ohlcv(n: usize) -> (Vec<f64>, Vec<f64>, Vec<f64>, Vec<f64>, Vec<f64>) {
    let closes = generate_prices(n);
    let opens: Vec<f64> = closes.iter().map(|c| c * 0.998).collect();
    let highs: Vec<f64> = closes.iter().map(|c| c * 1.005).collect();
    let lows: Vec<f64> = closes.iter().map(|c| c * 0.995).collect();
    let volumes: Vec<f64> = (0..n).map(|i| 1000.0 + (i as f64 * 100.0).sin().abs() * 500.0).collect();
    (opens, highs, lows, closes, volumes)
}

fn bench_montecarlo(c: &mut Criterion) {
    let mut group = c.benchmark_group("montecarlo");
    for &n in &[100, 1_000, 10_000] {
        let prices = generate_prices(252);
        group.bench_with_input(BenchmarkId::new("paths", n), &n, |b, &n| {
            b.iter(|| quant::montecarlo::montecarlo_from_prices(&prices, 252, 252, n));
        });
    }
    group.finish();
}

fn bench_greeks(c: &mut Criterion) {
    c.bench_function("blackscholes_call_greeks", |b| {
        b.iter(|| {
            quant::blackscholes::call_greeks(100.0, 100.0, 0.25, 0.05, 0.2);
        });
    });
    c.bench_function("blackscholes_put_greeks", |b| {
        b.iter(|| {
            quant::blackscholes::put_greeks(100.0, 100.0, 0.25, 0.05, 0.2);
        });
    });
}

fn bench_var(c: &mut Criterion) {
    let returns = generate_returns(2520);
    c.bench_function("var_historical_2520", |b| {
        b.iter(|| quant::risk::var_historical(&returns, 0.05));
    });
}

fn bench_efficient_frontier(c: &mut Criterion) {
    // 5 assets x 252 periods
    let returns: Vec<f64> = (0..5 * 252).map(|i| 0.0001 * (i as f64).sin()).collect();
    c.bench_function("efficient_frontier_5a", |b| {
        b.iter(|| {
            quant::portfolio::efficient_frontier(&returns, 5, 252, 0.02, 100, 252);
        });
    });
}

fn bench_correlation_matrix(c: &mut Criterion) {
    let mut group = c.benchmark_group("correlation_matrix");
    for &n in &[5, 10, 20] {
        let returns: Vec<f64> = (0..n * 252)
            .map(|i| 0.001 * ((i as f64).sin() + (i as f64 * 0.7).cos()))
            .collect();
        group.bench_with_input(BenchmarkId::new("assets", n), &n, |b, &n| {
            b.iter(|| quant::stats::correlation_matrix(&returns, n, 252));
        });
    }
    group.finish();
}

fn bench_serialization(c: &mut Criterion) {
    let mut group = c.benchmark_group("serialization");
    let (opens, highs, lows, closes, volumes) = generate_ohlcv(1000);

    group.bench_function("binary_ohlcv_serialize", |b| {
        b.iter(|| {
            data_structures::flatbuffer_schemas::serialization::serialize_ohlcv_to_bytes(
                &opens, &highs, &lows, &closes, &volumes,
            );
        });
    });

    let bin_data = data_structures::flatbuffer_schemas::serialization::serialize_ohlcv_to_bytes(
        &opens, &highs, &lows, &closes, &volumes,
    );
    group.bench_function("binary_ohlcv_deserialize", |b| {
        b.iter(|| {
            data_structures::flatbuffer_schemas::serialization::deserialize_ohlcv_from_bytes(
                &bin_data,
            )
            .unwrap();
        });
    });

    group.bench_function("json_ohlcv_serialize", |b| {
        b.iter(|| {
            serde_json::to_string(&serde_json::json!({
                "opens": opens, "highs": highs, "lows": lows,
                "closes": closes, "volumes": volumes,
            }))
            .unwrap();
        });
    });

    let json_data = serde_json::to_string(&serde_json::json!({
        "opens": opens, "highs": highs, "lows": lows,
        "closes": closes, "volumes": volumes,
    }))
    .unwrap();
    group.bench_function("json_ohlcv_deserialize", |b| {
        b.iter(|| {
            serde_json::from_str::<serde_json::Value>(&json_data).unwrap();
        });
    });

    // f64 array benchmarks
    let arr: Vec<f64> = (0..1000).map(|i| i as f64 * 0.1).collect();
    group.bench_function("binary_f64_array_serialize", |b| {
        b.iter(|| {
            data_structures::flatbuffer_schemas::serialization::serialize_f64_array(&arr);
        });
    });

    let bin_arr = data_structures::flatbuffer_schemas::serialization::serialize_f64_array(&arr);
    group.bench_function("binary_f64_array_deserialize", |b| {
        b.iter(|| {
            data_structures::flatbuffer_schemas::serialization::deserialize_f64_array(&bin_arr)
                .unwrap();
        });
    });

    group.bench_function("json_f64_array_serialize", |b| {
        b.iter(|| serde_json::to_string(&arr).unwrap());
    });

    let json_arr = serde_json::to_string(&arr).unwrap();
    group.bench_function("json_f64_array_deserialize", |b| {
        b.iter(|| serde_json::from_str::<Vec<f64>>(&json_arr).unwrap());
    });

    group.finish();
}

fn bench_ring_buffer(c: &mut Criterion) {
    let mut group = c.benchmark_group("ring_buffer");

    group.bench_function("push_1000", |b| {
        b.iter(|| {
            let rb = data_structures::ring_buffer::RingBuffer::<u64>::new(1024);
            for i in 0..1000u64 {
                let _ = rb.push(i);
            }
        });
    });

    group.bench_function("pop_1000", |b| {
        b.iter_batched(
            || {
                let rb = data_structures::ring_buffer::RingBuffer::<u64>::new(1024);
                for i in 0..1000u64 {
                    let _ = rb.push(i);
                }
                rb
            },
            |rb| {
                for _ in 0..1000 {
                    let _ = rb.pop();
                }
            },
            criterion::BatchSize::SmallInput,
        );
    });

    group.bench_function("push_pop_interleaved_1000", |b| {
        b.iter(|| {
            let rb = data_structures::ring_buffer::RingBuffer::<u64>::new(64);
            for i in 0..1000u64 {
                let _ = rb.push(i);
                let _ = rb.pop();
            }
        });
    });

    group.finish();
}

criterion_group!(
    benches,
    bench_montecarlo,
    bench_greeks,
    bench_var,
    bench_efficient_frontier,
    bench_correlation_matrix,
    bench_serialization,
    bench_ring_buffer,
);
criterion_main!(benches);
