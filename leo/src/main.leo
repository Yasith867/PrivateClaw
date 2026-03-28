program private_claw.aleo {

    transition place_bet(amount: u64) -> u64 {
        assert(amount > 0u64);
        return amount;
    }

}
