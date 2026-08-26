//! Lock-free single-producer single-consumer (SPSC) ring buffer.
//!
//! Uses atomic head/tail indices and `UnsafeCell` for the internal storage.
//! Only the producer may call `push` and only the consumer may call `pop`.
//! This is enforced by API convention (separate handles could be added in the future).

use std::cell::UnsafeCell;
use std::sync::atomic::{AtomicUsize, Ordering};

/// A fixed-capacity lock-free SPSC ring buffer.
///
/// # Safety
///
/// The caller must ensure that only one thread/task calls `push` and only one
/// calls `pop`. Violating this invariant is UB.
pub struct RingBuffer<T> {
    buf: UnsafeCell<Vec<Option<T>>>,
    capacity: usize,
    head: AtomicUsize, // next write position (producer)
    tail: AtomicUsize, // next read position (consumer)
}

// SAFETY: The ring buffer is designed for single-producer / single-consumer usage.
// Head is only written by the producer, tail is only written by the consumer.
// The UnsafeCell is safe because we enforce non-overlapping access through the API.
unsafe impl<T: Send> Send for RingBuffer<T> {}
unsafe impl<T: Send> Sync for RingBuffer<T> {}

impl<T> RingBuffer<T> {
    /// Create a new ring buffer with the given fixed capacity.
    ///
    /// The actual usable capacity is `capacity - 1` because one slot is kept
    /// empty to distinguish full from empty states.
    pub fn new(capacity: usize) -> Self {
        assert!(capacity >= 2, "capacity must be at least 2");
        let mut buf = Vec::with_capacity(capacity);
        for _ in 0..capacity {
            buf.push(None);
        }
        Self {
            buf: UnsafeCell::new(buf),
            capacity,
            head: AtomicUsize::new(0),
            tail: AtomicUsize::new(0),
        }
    }

    /// Push an item into the buffer.
    ///
    /// Returns `Err(item)` if the buffer is full.
    pub fn push(&self, item: T) -> Result<(), T> {
        let head = self.head.load(Ordering::Relaxed);
        let tail = self.tail.load(Ordering::Acquire);

        let next_head = (head + 1) % self.capacity;

        // Full check: if advancing head would equal tail, buffer is full
        if next_head == tail {
            return Err(item);
        }

        // SAFETY: Only the producer writes to `head` and accesses `buf[head]`.
        // We just verified that `head` is a valid index and the slot is empty
        // (tail has not wrapped past it).
        unsafe {
            let buf = &mut *self.buf.get();
            buf[head] = Some(item);
        }

        self.head.store(next_head, Ordering::Release);
        Ok(())
    }

    /// Pop an item from the buffer.
    ///
    /// Returns `None` if the buffer is empty.
    pub fn pop(&self) -> Option<T> {
        let tail = self.tail.load(Ordering::Relaxed);
        let head = self.head.load(Ordering::Acquire);

        if tail == head {
            return None;
        }

        // SAFETY: Only the consumer writes to `tail` and accesses `buf[tail]`.
        // We just verified that `tail != head`, so there is a valid item.
        let item = unsafe { (&mut *self.buf.get())[tail].take() };

        let next_tail = (tail + 1) % self.capacity;
        self.tail.store(next_tail, Ordering::Release);

        item
    }

    /// Returns the number of items currently in the buffer.
    pub fn len(&self) -> usize {
        let head = self.head.load(Ordering::Relaxed);
        let tail = self.tail.load(Ordering::Relaxed);
        if head >= tail {
            head - tail
        } else {
            self.capacity - tail + head
        }
    }

    /// Returns `true` if the buffer is empty.
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    /// Returns the maximum number of items the buffer can hold.
    ///
    /// Usable capacity is `capacity() - 1` due to the sentinel slot.
    pub fn capacity(&self) -> usize {
        self.capacity - 1
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;

    #[test]
    fn test_push_pop_basic() {
        let rb = RingBuffer::new(8);
        assert!(rb.is_empty());

        rb.push(1).unwrap();
        rb.push(2).unwrap();
        rb.push(3).unwrap();

        assert_eq!(rb.len(), 3);
        assert_eq!(rb.pop(), Some(1));
        assert_eq!(rb.pop(), Some(2));
        assert_eq!(rb.pop(), Some(3));
        assert!(rb.is_empty());
    }

    #[test]
    fn test_full_buffer_returns_err() {
        let rb = RingBuffer::new(4); // usable capacity = 3
        rb.push(10).unwrap();
        rb.push(20).unwrap();
        rb.push(30).unwrap();

        let result = rb.push(40);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), 40);
    }

    #[test]
    fn test_pop_empty_returns_none() {
        let rb = RingBuffer::<i32>::new(4);
        assert_eq!(rb.pop(), None);
    }

    #[test]
    fn test_wrap_around() {
        let rb = RingBuffer::new(4); // usable = 3
        rb.push(1).unwrap();
        rb.push(2).unwrap();
        rb.push(3).unwrap();

        // Drain
        assert_eq!(rb.pop(), Some(1));
        assert_eq!(rb.pop(), Some(2));
        assert_eq!(rb.pop(), Some(3));

        // Wrap around — head and tail should wrap
        rb.push(10).unwrap();
        rb.push(20).unwrap();
        assert_eq!(rb.pop(), Some(10));
        assert_eq!(rb.pop(), Some(20));
        assert!(rb.is_empty());
    }

    #[test]
    fn test_capacity() {
        let rb = RingBuffer::<i32>::new(16);
        assert_eq!(rb.capacity(), 15);
    }

    #[test]
    fn test_interleaved_push_pop() {
        let rb = RingBuffer::new(8);
        rb.push(1).unwrap();
        rb.push(2).unwrap();
        assert_eq!(rb.pop(), Some(1));
        rb.push(3).unwrap();
        rb.push(4).unwrap();
        assert_eq!(rb.pop(), Some(2));
        assert_eq!(rb.pop(), Some(3));
        assert_eq!(rb.pop(), Some(4));
        assert!(rb.is_empty());
    }

    #[test]
    fn test_concurrent_spsc() {
        use std::sync::Arc;

        let rb = Arc::new(RingBuffer::new(1024));
        let rb_producer = Arc::clone(&rb);
        let rb_consumer = Arc::clone(&rb);

        let producer = thread::spawn(move || {
            for i in 0..1000u64 {
                loop {
                    if rb_producer.push(i).is_ok() {
                        break;
                    }
                }
            }
        });

        let consumer = thread::spawn(move || {
            let mut received = Vec::new();
            loop {
                if let Some(v) = rb_consumer.pop() {
                    received.push(v);
                    if received.len() == 1000 {
                        break;
                    }
                }
            }
            received
        });

        producer.join().unwrap();
        let received = consumer.join().unwrap();

        assert_eq!(received.len(), 1000);
        for window in received.windows(2) {
            assert!(window[0] <= window[1], "out of order: {:?}", window);
        }
    }
}
