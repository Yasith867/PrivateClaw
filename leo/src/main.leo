program private_claw.aleo;

// Record representing a private limit order
record Order:
    owner as address.private;
    market_id as field.private;
    side as field.private;
    amount as u64.private;

// Place a private limit order on the DEX.
// market_id: unique field identifier for the trading pair
// side: 1field = buy, 2field = sell
// amount: order size in microcredits (must be > 0)
transition place_bet(
    public market_id as field,
    public side as field,
    private amount as u64
) -> Order {
    assert(amount > 0u64);
    assert(side == 1field || side == 2field);
    return Order {
        owner: self.caller,
        market_id: market_id,
        side: side,
        amount: amount,
    };
}

// Cancel an existing private order record.
transition cancel_order(
    order: Order,
) -> bool {
    assert_eq(order.owner, self.caller);
    return true;
}

// Create a new trading market / pair.
transition create_market(
    public market_id as field,
    public resolution_timestamp as u64,
    public num_outcomes as u8,
) -> bool {
    assert(num_outcomes >= 2u8);
    assert(resolution_timestamp > 0u64);
    return true;
}
