use linera_sdk::linera_base_types::{Amount, Timestamp};

/// Calculate current price for an auction based on time-based decay
/// This is a pure function that is being used in contract, service, indexer
///
/// # Arguments
/// * `start_price` - Initial price at auction start
/// * `floor_price` - Minimum price (price floor/reserve)
/// * `price_decay_amount` - Amount to decrease per interval
/// * `price_decay_interval` - Microseconds between price drops
/// * `start_time` - When the auction starts
/// * `current_time` - Current timestamp
///
/// # Returns
/// The calculated current price, guaranteed to be >= floor_price
pub fn calculate_current_price(
    start_price: Amount,
    floor_price: Amount,
    price_decay_amount: Amount,
    price_decay_interval: u64,
    start_time: Timestamp,
    current_time: Timestamp,
) -> Amount {
    // If auction hasn't started, return start price
    if current_time < start_time {
        return start_price;
    }

    // Calculate time elapsed since start (in microseconds)
    let elapsed = current_time.delta_since(start_time);
    let elapsed_micros = elapsed.as_micros();

    // Calculate number of intervals that have passed
    let intervals_passed = elapsed_micros / price_decay_interval;

    // Calculate total decrement
    let total_decay = price_decay_amount.saturating_mul(intervals_passed as u128);

    // Calculate current price, ensuring it doesn't go below floor price
    start_price
        .saturating_sub(total_decay)
        .max(floor_price)
}

#[cfg(test)]
mod tests {
    use super::*;
    use linera_sdk::linera_base_types::TimeDelta;

    #[test]
    fn test_price_at_start() {
        let start_price = Amount::from_tokens(100);
        let floor_price = Amount::from_tokens(10);
        let decay_amount = Amount::from_tokens(1);
        let decay_interval = 60_000_000; // 60 seconds in microseconds
        let start_time = Timestamp::from(1000000);

        let price = calculate_current_price(
            start_price,
            floor_price,
            decay_amount,
            decay_interval,
            start_time,
            start_time, // At exact start
        );
        assert_eq!(price, start_price);
    }

    #[test]
    fn test_price_before_start() {
        let start_price = Amount::from_tokens(100);
        let floor_price = Amount::from_tokens(10);
        let decay_amount = Amount::from_tokens(1);
        let decay_interval = 60_000_000;
        let start_time = Timestamp::from(2000000);
        let current_time = Timestamp::from(1000000);

        let price = calculate_current_price(
            start_price,
            floor_price,
            decay_amount,
            decay_interval,
            start_time,
            current_time,
        );
        assert_eq!(price, start_price);
    }

    #[test]
    fn test_price_after_one_interval() {
        let start_price = Amount::from_tokens(100);
        let floor_price = Amount::from_tokens(10);
        let decay_amount = Amount::from_tokens(1);
        let decay_interval = 60_000_000; // 60 seconds
        let start_time = Timestamp::from(1000000);
        let current_time = start_time.saturating_add(TimeDelta::from_micros(60_000_000));

        let price = calculate_current_price(
            start_price,
            floor_price,
            decay_amount,
            decay_interval,
            start_time,
            current_time,
        );
        assert_eq!(price, Amount::from_tokens(99));
    }

    #[test]
    fn test_price_reaches_floor() {
        let start_price = Amount::from_tokens(100);
        let floor_price = Amount::from_tokens(10);
        let decay_amount = Amount::from_tokens(1);
        let decay_interval = 60_000_000;
        let start_time = Timestamp::from(1000000);
        // After 100 intervals, price would be 0 without floor
        let current_time = start_time.saturating_add(TimeDelta::from_micros(6_000_000_000));

        let price = calculate_current_price(
            start_price,
            floor_price,
            decay_amount,
            decay_interval,
            start_time,
            current_time,
        );
        assert_eq!(price, floor_price);
    }
}
