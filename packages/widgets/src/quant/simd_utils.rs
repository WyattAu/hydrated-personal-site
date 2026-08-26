//! SIMD-optimized numeric primitives for vector math in quant kernels.
//!
//! Provides `dot_product`, `vec_add`, and `vec_scale` with WASM SIMD128
//! intrinsics when compiled for `wasm32` with the `simd128` target feature,
//! and scalar fallbacks for all other targets.

/// Compute the dot product of two slices.
///
/// Uses SIMD128 intrinsics on `wasm32` when the `simd128` target feature is
/// enabled; falls back to a scalar loop otherwise.
///
/// # Panics
///
/// Panics if `a` and `b` have different lengths.
pub fn dot_product(a: &[f64], b: &[f64]) -> f64 {
    assert_eq!(a.len(), b.len(), "dot_product: length mismatch");

    #[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
    {
        dot_product_simd(a, b)
    }
    #[cfg(not(all(target_arch = "wasm32", target_feature = "simd128")))]
    {
        dot_product_scalar(a, b)
    }
}

/// Element-wise addition: `out[i] = a[i] + b[i]`.
///
/// # Panics
///
/// Panics if `a`, `b`, and `out` have different lengths.
pub fn vec_add(a: &[f64], b: &[f64], out: &mut [f64]) {
    assert_eq!(a.len(), b.len(), "vec_add: length mismatch a/b");
    assert_eq!(a.len(), out.len(), "vec_add: length mismatch a/out");

    #[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
    {
        vec_add_simd(a, b, out);
    }
    #[cfg(not(all(target_arch = "wasm32", target_feature = "simd128")))]
    {
        vec_add_scalar(a, b, out);
    }
}

/// Scalar multiplication: `out[i] = a[i] * scalar`.
///
/// # Panics
///
/// Panics if `a` and `out` have different lengths.
pub fn vec_scale(a: &[f64], scalar: f64, out: &mut [f64]) {
    assert_eq!(a.len(), out.len(), "vec_scale: length mismatch");

    #[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
    {
        vec_scale_simd(a, scalar, out);
    }
    #[cfg(not(all(target_arch = "wasm32", target_feature = "simd128")))]
    {
        vec_scale_scalar(a, scalar, out);
    }
}

// ---------------------------------------------------------------------------
// Scalar fallbacks (unrolled 4x for ILP on scalar targets)
// ---------------------------------------------------------------------------

fn dot_product_scalar(a: &[f64], b: &[f64]) -> f64 {
    let mut sum = 0.0;
    let len = a.len();
    let chunks = len / 4;
    let remainder = len % 4;

    let mut i = 0;
    for _ in 0..chunks {
        sum += a[i] * b[i];
        sum += a[i + 1] * b[i + 1];
        sum += a[i + 2] * b[i + 2];
        sum += a[i + 3] * b[i + 3];
        i += 4;
    }
    for j in 0..remainder {
        sum += a[i + j] * b[i + j];
    }
    sum
}

fn vec_add_scalar(a: &[f64], b: &[f64], out: &mut [f64]) {
    let len = a.len();
    let chunks = len / 4;
    let remainder = len % 4;

    let mut i = 0;
    for _ in 0..chunks {
        out[i] = a[i] + b[i];
        out[i + 1] = a[i + 1] + b[i + 1];
        out[i + 2] = a[i + 2] + b[i + 2];
        out[i + 3] = a[i + 3] + b[i + 3];
        i += 4;
    }
    for j in 0..remainder {
        out[i + j] = a[i + j] + b[i + j];
    }
}

fn vec_scale_scalar(a: &[f64], scalar: f64, out: &mut [f64]) {
    let len = a.len();
    let chunks = len / 4;
    let remainder = len % 4;

    let mut i = 0;
    for _ in 0..chunks {
        out[i] = a[i] * scalar;
        out[i + 1] = a[i + 1] * scalar;
        out[i + 2] = a[i + 2] * scalar;
        out[i + 3] = a[i + 3] * scalar;
        i += 4;
    }
    for j in 0..remainder {
        out[i + j] = a[i + j] * scalar;
    }
}

// ---------------------------------------------------------------------------
// WASM SIMD128 implementations
//
// Uses the low-level `v128_load`, `v128_store`, `f64x2_mul`, `f64x2_add`
// intrinsics which operate on raw `v128` values. This avoids the
// `Simd<...>` nightly-only APIs and works on stable Rust with
// `target_feature = "simd128"`.
// ---------------------------------------------------------------------------

#[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
fn dot_product_simd(a: &[f64], b: &[f64]) -> f64 {
    use std::arch::wasm32::*;

    let len = a.len();
    let simd_len = (len / 2) * 2;
    let mut acc = f64x2::splat(0.0);

    let mut i = 0;
    while i < simd_len {
        // SAFETY: `i` is within bounds and aligned to 8 bytes (f64).
        // We read exactly 16 bytes (2 × f64) which is within the slice
        // because `i < simd_len` and `simd_len <= len`.
        unsafe {
            let va: v128 = v128_load(a[i..].as_ptr() as *const _);
            let vb: v128 = v128_load(b[i..].as_ptr() as *const _);
            acc = f64x2_add(acc, f64x2_mul(va, vb));
        }
        i += 2;
    }

    let mut sum = f64x2_extract_lane::<0>(acc) + f64x2_extract_lane::<1>(acc);

    // Scalar tail
    for j in simd_len..len {
        sum += a[j] * b[j];
    }
    sum
}

#[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
fn vec_add_simd(a: &[f64], b: &[f64], out: &mut [f64]) {
    use std::arch::wasm32::*;

    let len = a.len();
    let simd_len = (len / 2) * 2;

    let mut i = 0;
    while i < simd_len {
        // SAFETY: `i` is within bounds; reads 16 bytes (2 × f64) from each
        // input and writes 16 bytes to `out`, all within slice bounds.
        unsafe {
            let va: v128 = v128_load(a[i..].as_ptr() as *const _);
            let vb: v128 = v128_load(b[i..].as_ptr() as *const _);
            let vo: v128 = f64x2_add(va, vb);
            v128_store(out[i..].as_mut_ptr() as *mut _, vo);
        }
        i += 2;
    }

    for j in simd_len..len {
        out[j] = a[j] + b[j];
    }
}

#[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
fn vec_scale_simd(a: &[f64], scalar: f64, out: &mut [f64]) {
    use std::arch::wasm32::*;

    let len = a.len();
    let simd_len = (len / 2) * 2;
    let vs = f64x2::splat(scalar);

    let mut i = 0;
    while i < simd_len {
        // SAFETY: `i` is within bounds; reads 16 bytes from `a` and writes
        // 16 bytes to `out`, all within slice bounds.
        unsafe {
            let va: v128 = v128_load(a[i..].as_ptr() as *const _);
            let vo: v128 = f64x2_mul(va, vs);
            v128_store(out[i..].as_mut_ptr() as *mut _, vo);
        }
        i += 2;
    }

    for j in simd_len..len {
        out[j] = a[j] * scalar;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dot_product_basic() {
        let a = [1.0, 2.0, 3.0, 4.0];
        let b = [5.0, 6.0, 7.0, 8.0];
        // 1*5 + 2*6 + 3*7 + 4*8 = 5+12+21+32 = 70
        assert!((dot_product(&a, &b) - 70.0).abs() < 1e-12);
    }

    #[test]
    fn test_dot_product_empty() {
        assert_eq!(dot_product(&[], &[]), 0.0);
    }

    #[test]
    fn test_dot_product_non_aligned() {
        // Length not divisible by 4 or 2
        let a = [1.0, 2.0, 3.0];
        let b = [4.0, 5.0, 6.0];
        // 1*4 + 2*5 + 3*6 = 4+10+18 = 32
        assert!((dot_product(&a, &b) - 32.0).abs() < 1e-12);
    }

    #[test]
    fn test_dot_product_one_element() {
        assert!((dot_product(&[3.0], &[7.0]) - 21.0).abs() < 1e-12);
    }

    #[test]
    fn test_vec_add_basic() {
        let a = [1.0, 2.0, 3.0, 4.0];
        let b = [10.0, 20.0, 30.0, 40.0];
        let mut out = [0.0; 4];
        vec_add(&a, &b, &mut out);
        assert_eq!(out, [11.0, 22.0, 33.0, 44.0]);
    }

    #[test]
    fn test_vec_add_non_aligned() {
        let a = [1.0, 2.0, 3.0];
        let b = [4.0, 5.0, 6.0];
        let mut out = [0.0; 3];
        vec_add(&a, &b, &mut out);
        assert_eq!(out, [5.0, 7.0, 9.0]);
    }

    #[test]
    fn test_vec_scale_basic() {
        let a = [1.0, 2.0, 3.0, 4.0];
        let mut out = [0.0; 4];
        vec_scale(&a, 2.5, &mut out);
        assert_eq!(out, [2.5, 5.0, 7.5, 10.0]);
    }

    #[test]
    fn test_vec_scale_zero() {
        let a = [100.0, 200.0];
        let mut out = [0.0; 2];
        vec_scale(&a, 0.0, &mut out);
        assert_eq!(out, [0.0, 0.0]);
    }

    #[test]
    fn test_vec_scale_non_aligned() {
        let a = [1.0, 2.0, 3.0];
        let mut out = [0.0; 3];
        vec_scale(&a, -1.0, &mut out);
        assert_eq!(out, [-1.0, -2.0, -3.0]);
    }

    #[test]
    fn test_dot_product_zeros() {
        let a = [0.0; 100];
        let b = [1.0; 100];
        assert_eq!(dot_product(&a, &b), 0.0);
    }

    #[test]
    fn test_vec_add_large() {
        let a: Vec<f64> = (0..1000).map(|i| i as f64).collect();
        let b: Vec<f64> = (0..1000).map(|i| i as f64 * 2.0).collect();
        let mut out = vec![0.0; 1000];
        vec_add(&a, &b, &mut out);
        for (i, &v) in out.iter().enumerate() {
            assert!((v - i as f64 * 3.0).abs() < 1e-10, "mismatch at {i}");
        }
    }

    #[test]
    fn test_vec_scale_large() {
        let a: Vec<f64> = (0..1000).map(|i| i as f64).collect();
        let mut out = vec![0.0; 1000];
        vec_scale(&a, 3.0, &mut out);
        for (i, &v) in out.iter().enumerate() {
            assert!((v - i as f64 * 3.0).abs() < 1e-10, "mismatch at {i}");
        }
    }
}
