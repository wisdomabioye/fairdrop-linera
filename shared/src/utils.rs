use linera_sdk::linera_base_types::{Amount, Timestamp};
use crate::types::AuctionStatus;

/// Calculate current price for an auction based on time-based decay
/// This is a pure function that is being used in contract, service, indexer
///
/// # Arguments
/// * `start_price` - Initial price at auction start
/// * `floor_price` - Minimum price (price floor/reserve)
/// * `price_decay_amount` - Amount to decrease per interval
/// * `price_decay_interval` - Microseconds between price drops
/// * `start_time` - When the auction starts
/// * `end_time` - When the auction ends
/// * `current_time` - Current timestamp
/// * `status` - Current auction status
///
/// # Returns
/// The calculated current price, guaranteed to be >= floor_price
pub fn calculate_current_price(
    start_price: Amount,
    floor_price: Amount,
    price_decay_amount: Amount,
    price_decay_interval: u64,
    start_time: Timestamp,
    end_time: Timestamp,
    current_time: Timestamp,
    status: AuctionStatus,
) -> Amount {
    match status {
        // Auction hasn't started or was cancelled - return start price
        AuctionStatus::Scheduled | AuctionStatus::Cancelled => start_price,

        // Active, Settled, or Pruned - calculate decay-based price
        AuctionStatus::Active | AuctionStatus::Settled | AuctionStatus::Pruned => {
            // If current time is before start, return start price
            if current_time < start_time {
                return start_price;
            }

            // Cap at end_time - price should not decay past auction end
            let effective_time = if current_time > end_time {
                end_time
            } else {
                current_time
            };

            // Calculate time elapsed since start (in microseconds)
            let elapsed = effective_time.delta_since(start_time);
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
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use linera_sdk::linera_base_types::TimeDelta;

    fn log_calculation(
        label: &str,
        start_price: Amount,
        floor_price: Amount,
        decay_amount: Amount,
        decay_interval: u64,
        start_time: Timestamp,
        end_time: Timestamp,
        current_time: Timestamp,
        status: AuctionStatus,
        result: Amount,
    ) {
        println!("\n=== {} ===", label);
        println!("start_price: {:?}", start_price);
        println!("floor_price: {:?}", floor_price);
        println!("decay_amount: {:?}", decay_amount);
        println!("decay_interval: {} µs ({} seconds)", decay_interval, decay_interval / 1_000_000);
        println!("start_time: {:?}", start_time);
        println!("end_time: {:?}", end_time);
        println!("current_time: {:?}", current_time);
        println!("status: {:?}", status);

        if current_time >= start_time {
            let effective_time = if current_time > end_time { end_time } else { current_time };
            let elapsed = effective_time.delta_since(start_time);
            let elapsed_micros = elapsed.as_micros();
            let intervals_passed = elapsed_micros / decay_interval;
            let total_decay_raw = Into::<u128>::into(decay_amount) * intervals_passed as u128;

            println!("effective_time: {:?}", effective_time);
            println!("elapsed_micros: {}", elapsed_micros);
            println!("intervals_passed: {}", intervals_passed);
            println!("total_decay_raw: {}", total_decay_raw);
        }

        println!("RESULT: {:?}", result);
    }

    #[test]
    fn test_price_at_start() {
        let start_price = Amount::from_tokens(100);
        let floor_price = Amount::from_tokens(10);
        let decay_amount = Amount::from_tokens(1);
        let decay_interval = 60_000_000; // 60 seconds in microseconds
        let start_time = Timestamp::from(1000000);
        let end_time = start_time.saturating_add(TimeDelta::from_micros(3_600_000_000)); // 1 hour
        let current_time = start_time; // At exact start
        let status = AuctionStatus::Active;

        let price = calculate_current_price(
            start_price,
            floor_price,
            decay_amount,
            decay_interval,
            start_time,
            end_time,
            current_time,
            status,
        );

        log_calculation(
            "test_price_at_start",
            start_price, floor_price, decay_amount, decay_interval,
            start_time, end_time, current_time, status, price
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
        let end_time = start_time.saturating_add(TimeDelta::from_micros(3_600_000_000));
        let current_time = Timestamp::from(1000000); // Before start
        let status = AuctionStatus::Active;

        let price = calculate_current_price(
            start_price, floor_price, decay_amount, decay_interval,
            start_time, end_time, current_time, status,
        );

        log_calculation(
            "test_price_before_start",
            start_price, floor_price, decay_amount, decay_interval,
            start_time, end_time, current_time, status, price
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
        let end_time = start_time.saturating_add(TimeDelta::from_micros(3_600_000_000));
        let current_time = start_time.saturating_add(TimeDelta::from_micros(60_000_000));
        let status = AuctionStatus::Active;

        let price = calculate_current_price(
            start_price, floor_price, decay_amount, decay_interval,
            start_time, end_time, current_time, status,
        );

        log_calculation(
            "test_price_after_one_interval",
            start_price, floor_price, decay_amount, decay_interval,
            start_time, end_time, current_time, status, price
        );

        assert_eq!(price, Amount::from_tokens(99));
    }

    #[test]
    fn test_price_reaches_floor_within_auction() {
        let start_price = Amount::from_tokens(100);
        let floor_price = Amount::from_tokens(10);
        let decay_amount = Amount::from_tokens(1);
        let decay_interval = 60_000_000;
        let start_time = Timestamp::from(1000000);
        let end_time = start_time.saturating_add(TimeDelta::from_micros(7_200_000_000)); // 2 hours
        // After 100 intervals (100 min), price would hit floor
        let current_time = start_time.saturating_add(TimeDelta::from_micros(6_000_000_000));
        let status = AuctionStatus::Active;

        let price = calculate_current_price(
            start_price, floor_price, decay_amount, decay_interval,
            start_time, end_time, current_time, status,
        );

        log_calculation(
            "test_price_reaches_floor_within_auction",
            start_price, floor_price, decay_amount, decay_interval,
            start_time, end_time, current_time, status, price
        );

        assert_eq!(price, floor_price);
    }

    #[test]
    fn test_price_capped_at_end_time() {
        let start_price = Amount::from_tokens(100);
        let floor_price = Amount::from_tokens(10);
        let decay_amount = Amount::from_tokens(1);
        let decay_interval = 60_000_000; // 60 seconds
        let start_time = Timestamp::from(1000000);
        // End after 30 intervals (30 min) - price at end would be 70
        let end_time = start_time.saturating_add(TimeDelta::from_micros(1_800_000_000));
        // Current time way past end - should still use end_time for calculation
        let current_time = start_time.saturating_add(TimeDelta::from_micros(10_000_000_000));
        let status = AuctionStatus::Active;

        let price = calculate_current_price(
            start_price, floor_price, decay_amount, decay_interval,
            start_time, end_time, current_time, status,
        );

        log_calculation(
            "test_price_capped_at_end_time",
            start_price, floor_price, decay_amount, decay_interval,
            start_time, end_time, current_time, status, price
        );

        // Price at end_time: 100 - 30 = 70 (not floor!)
        assert_eq!(price, Amount::from_tokens(70));
    }

    #[test]
    fn test_scheduled_returns_start_price() {
        let start_price = Amount::from_tokens(100);
        let floor_price = Amount::from_tokens(10);
        let decay_amount = Amount::from_tokens(1);
        let decay_interval = 60_000_000;
        let start_time = Timestamp::from(2000000);
        let end_time = start_time.saturating_add(TimeDelta::from_micros(3_600_000_000));
        let current_time = Timestamp::from(1000000);
        let status = AuctionStatus::Scheduled;

        let price = calculate_current_price(
            start_price, floor_price, decay_amount, decay_interval,
            start_time, end_time, current_time, status,
        );

        log_calculation(
            "test_scheduled_returns_start_price",
            start_price, floor_price, decay_amount, decay_interval,
            start_time, end_time, current_time, status, price
        );

        assert_eq!(price, start_price);
    }

    #[test]
    fn test_cancelled_returns_start_price() {
        let start_price = Amount::from_tokens(100);
        let floor_price = Amount::from_tokens(10);
        let decay_amount = Amount::from_tokens(1);
        let decay_interval = 60_000_000;
        let start_time = Timestamp::from(1000000);
        let end_time = start_time.saturating_add(TimeDelta::from_micros(3_600_000_000));
        let current_time = start_time.saturating_add(TimeDelta::from_micros(1_800_000_000));
        let status = AuctionStatus::Cancelled;

        let price = calculate_current_price(
            start_price, floor_price, decay_amount, decay_interval,
            start_time, end_time, current_time, status,
        );

        log_calculation(
            "test_cancelled_returns_start_price",
            start_price, floor_price, decay_amount, decay_interval,
            start_time, end_time, current_time, status, price
        );

        assert_eq!(price, start_price);
    }

    /// Test with real auction data from user's bug report
    #[test]
    fn test_real_auction_data() {
        // Data from user's auction that was returning floor price incorrectly
        let start_price = Amount::from_tokens(30);
        let floor_price = Amount::from_tokens(3);
        let decay_amount = Amount::from_tokens(1);
        let decay_interval = 60_000_000; // 60 seconds in microseconds
        let start_time = Timestamp::from(1769986800000000);
        let end_time = Timestamp::from(1770073200000000); // 24 hours later
        let status = AuctionStatus::Active;

        // Test 1: At start time - should be 30
        let current_time = start_time;
        let price = calculate_current_price(
            start_price, floor_price, decay_amount, decay_interval,
            start_time, end_time, current_time, status,
        );
        log_calculation(
            "test_real_auction_data - at start",
            start_price, floor_price, decay_amount, decay_interval,
            start_time, end_time, current_time, status, price
        );
        assert_eq!(price, Amount::from_tokens(30), "Price at start should be 30");

        // Test 2: After 5 minutes - should be 25
        let current_time = start_time.saturating_add(TimeDelta::from_micros(300_000_000));
        let price = calculate_current_price(
            start_price, floor_price, decay_amount, decay_interval,
            start_time, end_time, current_time, status,
        );
        log_calculation(
            "test_real_auction_data - after 5 min",
            start_price, floor_price, decay_amount, decay_interval,
            start_time, end_time, current_time, status, price
        );
        assert_eq!(price, Amount::from_tokens(25), "Price after 5 min should be 25");

        // Test 3: After 27 minutes - should hit floor (3)
        let current_time = start_time.saturating_add(TimeDelta::from_micros(1_620_000_000));
        let price = calculate_current_price(
            start_price, floor_price, decay_amount, decay_interval,
            start_time, end_time, current_time, status,
        );
        log_calculation(
            "test_real_auction_data - after 27 min",
            start_price, floor_price, decay_amount, decay_interval,
            start_time, end_time, current_time, status, price
        );
        assert_eq!(price, Amount::from_tokens(3), "Price after 27 min should be floor (3)");

        // Test 4: Way past end time - should still be capped at end_time price (floor)
        let current_time = end_time.saturating_add(TimeDelta::from_micros(86_400_000_000)); // 1 day after end
        let price = calculate_current_price(
            start_price, floor_price, decay_amount, decay_interval,
            start_time, end_time, current_time, status,
        );
        log_calculation(
            "test_real_auction_data - 1 day past end",
            start_price, floor_price, decay_amount, decay_interval,
            start_time, end_time, current_time, status, price
        );
        assert_eq!(price, Amount::from_tokens(3), "Price past end should be floor (3)");
    }
}
