program private_claw.aleo {

    // Validates that a bet amount is within the allowed range.
    // Returns true if valid, otherwise the transition will fail.
    transition validate_bet(amount: u64) -> bool {
        // Amount must be positive
        assert(amount > 0u64);
        // Amount must be below the maximum bet cap (1,000,000 microcredits)
        assert(amount < 1000000u64);
        return true;
    }

    // Simulates private betting logic using ZK execution.
    // Doubles the bet amount as the computed private output.
    transition place_bet(amount: u64) -> u64 {
        // Enforce the same range constraints as validate_bet
        assert(amount > 0u64);
        assert(amount < 1000000u64);

        // Private computation: output is double the input
        let result: u64 = amount * 2u64;

        return result;
    }

    // Calculates the reward for a winning bet.
    // Adds a fixed bonus of 5 microcredits to the amount.
    transition calculate_reward(amount: u64) -> u64 {
        // Must have wagered more than 10 microcredits to earn a reward
        assert(amount > 10u64);

        let reward: u64 = amount + 5u64;

        return reward;
    }

}
