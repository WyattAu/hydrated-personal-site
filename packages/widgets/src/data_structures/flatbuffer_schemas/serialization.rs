//! Binary serialization/deserialization for OHLCV data and f64 arrays.
//!
//! Format for OHLCV:
//! ```text
//! [4 bytes: magic "OHLC"]
//! [4 bytes: element count as u32 LE]
//! [count * 8 bytes: opens as f64 LE]
//! [count * 8 bytes: highs as f64 LE]
//! [count * 8 bytes: lows as f64 LE]
//! [count * 8 bytes: closes as f64 LE]
//! [count * 8 bytes: volumes as f64 LE]
//! ```
//!
//! Format for f64 array:
//! ```text
//! [4 bytes: magic "F64A"]
//! [4 bytes: element count as u32 LE]
//! [count * 8 bytes: values as f64 LE]
//! ```

const MAGIC_OHLC: &[u8; 4] = b"OHLC";
const MAGIC_F64A: &[u8; 4] = b"F64A";

/// Serialize OHLCV price/volume arrays into a compact binary format.
///
/// All f64 values are stored in little-endian byte order.
/// Returns a `Vec<u8>` ready for transmission or storage.
pub fn serialize_ohlcv_to_bytes(
    opens: &[f64],
    highs: &[f64],
    lows: &[f64],
    closes: &[f64],
    volumes: &[f64],
) -> Vec<u8> {
    let count = opens.len();
    assert_eq!(count, highs.len(), "highs length mismatch");
    assert_eq!(count, lows.len(), "lows length mismatch");
    assert_eq!(count, closes.len(), "closes length mismatch");
    assert_eq!(count, volumes.len(), "volumes length mismatch");
    assert!(
        count <= u32::MAX as usize,
        "too many elements for u32 count"
    );

    let total_bytes = 8 + count * 8 * 5; // header(8) + 5 series
    let mut buf = Vec::with_capacity(total_bytes);

    buf.extend_from_slice(MAGIC_OHLC);
    buf.extend_from_slice(&(count as u32).to_le_bytes());

    for series in [&opens, &highs, &lows, &closes, &volumes] {
        for &val in series.iter() {
            buf.extend_from_slice(&val.to_le_bytes());
        }
    }

    buf
}

/// Deserialize OHLCV data from the binary format produced by
/// [`serialize_ohlcv_to_bytes`].
pub fn deserialize_ohlcv_from_bytes(
    data: &[u8],
) -> Result<(Vec<f64>, Vec<f64>, Vec<f64>, Vec<f64>, Vec<f64>), String> {
    if data.len() < 8 {
        return Err("data too short for header".to_string());
    }

    if &data[0..4] != MAGIC_OHLC {
        return Err(format!(
            "invalid magic: expected {:?}, got {:?}",
            MAGIC_OHLC,
            &data[0..4]
        ));
    }

    let count = u32::from_le_bytes([data[4], data[5], data[6], data[7]]) as usize;
    let expected_len = 8 + count * 8 * 5;
    if data.len() < expected_len {
        return Err(format!(
            "data too short: expected {} bytes for {} elements, got {}",
            expected_len,
            count,
            data.len()
        ));
    }

    let mut offset = 8;
    let mut read_series = || -> Vec<f64> {
        let mut vals = Vec::with_capacity(count);
        for _ in 0..count {
            let bytes: [u8; 8] = data[offset..offset + 8]
                .try_into()
                .unwrap();
            vals.push(f64::from_le_bytes(bytes));
            offset += 8;
        }
        vals
    };

    let opens = read_series();
    let highs = read_series();
    let lows = read_series();
    let closes = read_series();
    let volumes = read_series();

    Ok((opens, highs, lows, closes, volumes))
}

/// Serialize a slice of `f64` values into little-endian bytes.
pub fn serialize_f64_array(arr: &[f64]) -> Vec<u8> {
    assert!(
        arr.len() <= u32::MAX as usize,
        "too many elements for u32 count"
    );

    let mut buf = Vec::with_capacity(8 + arr.len() * 8);
    buf.extend_from_slice(MAGIC_F64A);
    buf.extend_from_slice(&(arr.len() as u32).to_le_bytes());

    for &val in arr {
        buf.extend_from_slice(&val.to_le_bytes());
    }

    buf
}

/// Deserialize a `f64` array from the binary format produced by
/// [`serialize_f64_array`].
pub fn deserialize_f64_array(data: &[u8]) -> Result<Vec<f64>, String> {
    if data.len() < 8 {
        return Err("data too short for header".to_string());
    }

    if &data[0..4] != MAGIC_F64A {
        return Err(format!(
            "invalid magic: expected {:?}, got {:?}",
            MAGIC_F64A,
            &data[0..4]
        ));
    }

    let count = u32::from_le_bytes([data[4], data[5], data[6], data[7]]) as usize;
    let expected_len = 8 + count * 8;
    if data.len() < expected_len {
        return Err(format!(
            "data too short: expected {} bytes for {} elements, got {}",
            expected_len,
            count,
            data.len()
        ));
    }

    let mut vals = Vec::with_capacity(count);
    let mut offset = 8;
    for _ in 0..count {
        let bytes: [u8; 8] = data[offset..offset + 8]
            .try_into()
            .unwrap();
        vals.push(f64::from_le_bytes(bytes));
        offset += 8;
    }

    Ok(vals)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ohlcv_roundtrip() {
        let opens = vec![1.5, 2.5, 3.5];
        let highs = vec![2.0, 3.0, 4.0];
        let lows = vec![1.0, 2.0, 3.0];
        let closes = vec![1.8, 2.8, 3.8];
        let volumes = vec![100.0, 200.0, 300.0];

        let bytes = serialize_ohlcv_to_bytes(&opens, &highs, &lows, &closes, &volumes);
        let (o, h, l, c, v) = deserialize_ohlcv_from_bytes(&bytes).unwrap();

        assert_eq!(o, opens);
        assert_eq!(h, highs);
        assert_eq!(l, lows);
        assert_eq!(c, closes);
        assert_eq!(v, volumes);
    }

    #[test]
    fn test_ohlcv_empty() {
        let bytes = serialize_ohlcv_to_bytes(&[], &[], &[], &[], &[]);
        let (o, h, l, c, v) = deserialize_ohlcv_from_bytes(&bytes).unwrap();
        assert!(o.is_empty());
        assert!(h.is_empty());
        assert!(l.is_empty());
        assert!(c.is_empty());
        assert!(v.is_empty());
    }

    #[test]
    fn test_ohlcv_invalid_magic() {
        let mut data = vec![0u8; 48];
        data[0..4].copy_from_slice(b"NOPE");
        assert!(deserialize_ohlcv_from_bytes(&data).is_err());
    }

    #[test]
    fn test_ohlcv_truncated() {
        let data = b"OHLC\x03\x00\x00\x00"; // count=3 but no payload
        assert!(deserialize_ohlcv_from_bytes(data).is_err());
    }

    #[test]
    fn test_f64_array_roundtrip() {
        let arr = vec![1.0, std::f64::consts::PI, -0.001, 1e10];
        let bytes = serialize_f64_array(&arr);
        let out = deserialize_f64_array(&bytes).unwrap();
        assert_eq!(out, arr);
    }

    #[test]
    fn test_f64_array_empty() {
        let bytes = serialize_f64_array(&[]);
        let out = deserialize_f64_array(&bytes).unwrap();
        assert!(out.is_empty());
    }

    #[test]
    fn test_f64_array_invalid_magic() {
        assert!(deserialize_f64_array(b"NOPE\x00\x00\x00\x00").is_err());
    }

    #[test]
    fn test_f64_array_truncated() {
        let data = b"F64A\x05\x00\x00\x00"; // count=5, no data
        assert!(deserialize_f64_array(data).is_err());
    }

    #[test]
    fn test_nan_and_special_values() {
        let arr = vec![f64::NAN, f64::INFINITY, f64::NEG_INFINITY, 0.0];
        let bytes = serialize_f64_array(&arr);
        let out = deserialize_f64_array(&bytes).unwrap();
        assert!(out[0].is_nan());
        assert_eq!(out[1], f64::INFINITY);
        assert_eq!(out[2], f64::NEG_INFINITY);
        assert_eq!(out[3], 0.0);
    }

    #[test]
    fn test_binary_size_ohlcv() {
        let opens = vec![1.0; 10];
        let bytes = serialize_ohlcv_to_bytes(&opens, &opens, &opens, &opens, &opens);
        // 8 header + 5 series * 10 * 8 bytes = 408
        assert_eq!(bytes.len(), 8 + 5 * 10 * 8);
    }

    #[test]
    fn test_binary_size_f64() {
        let arr = vec![1.0; 20];
        let bytes = serialize_f64_array(&arr);
        // 8 header + 20 * 8 = 168
        assert_eq!(bytes.len(), 8 + 20 * 8);
    }
}
