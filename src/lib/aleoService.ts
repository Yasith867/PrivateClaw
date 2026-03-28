import type { TransactionOptions } from '@provablehq/aleo-types';

// The deployed Leo program on Aleo Testnet
export const PROGRAM_ID = 'private_claw.aleo';

const API_BASE_URL = 'https://api.provable.com/v2/testnet';

// Maximum bet amount enforced by the Leo contract
export const MAX_BET_AMOUNT = 999_999;
export const MIN_BET_AMOUNT = 1;

export class AleoService {
  private static instance: AleoService;

  static getInstance(): AleoService {
    if (!AleoService.instance) {
      AleoService.instance = new AleoService();
    }
    return AleoService.instance;
  }

  // ─── Local simulation (no wallet required) ──────────────────────────────

  /**
   * Simulates validate_bet locally — mirrors the Leo contract logic exactly.
   * Returns { valid, reason } without touching the blockchain.
   */
  simulateValidateBet(amount: number): { valid: boolean; reason: string } {
    if (amount <= 0) return { valid: false, reason: 'Amount must be greater than 0' };
    if (amount >= 1_000_000) return { valid: false, reason: 'Amount must be less than 1,000,000' };
    return { valid: true, reason: 'Amount is within the valid range' };
  }

  /**
   * Simulates place_bet output locally — mirrors the Leo transition.
   * Returns the computed result (amount * 2) or null if validation fails.
   */
  simulatePlaceBet(amount: number): number | null {
    const { valid } = this.simulateValidateBet(amount);
    if (!valid) return null;
    return amount * 2;
  }

  /**
   * Simulates calculate_reward locally — mirrors the Leo transition.
   * Returns the reward (amount + 5) or null if below threshold.
   */
  simulateCalculateReward(amount: number): number | null {
    if (amount <= 10) return null;
    return amount + 5;
  }

  // ─── On-chain transactions (requires Shield Wallet) ─────────────────────

  /**
   * place_bet — calls the place_bet transition on private_claw.aleo.
   * amount: u64 — order size in microcredits (private, hidden on-chain).
   */
  createPlaceOrderTransaction(
    _publicKey: string,
    pairId: string,
    side: 'buy' | 'sell',
    amount: number,
    _price: number,
    fee: number = 500_000,
  ): TransactionOptions {
    const sideField = side === 'buy' ? '1' : '2';
    const amountInt = Math.trunc(amount);

    if (amountInt <= 0) {
      throw new Error(`Invalid amount: ${amount} — must be a positive integer (microcredits).`);
    }

    const pairIdNumeric = pairId.replace(/\D/g, '');
    if (!pairIdNumeric) {
      throw new Error(`Invalid pairId: "${pairId}" — must contain digits for a Leo field literal.`);
    }

    return {
      program: PROGRAM_ID,
      function: 'place_bet',
      inputs: [
        `${pairIdNumeric}field`,
        `${sideField}field`,
        `${amountInt}u64`,
      ],
      fee,
      privateFee: false,
    };
  }

  /**
   * validate_bet — calls the validate_bet transition on private_claw.aleo.
   * Submits amount for on-chain ZK validation.
   */
  createValidateBetTransaction(amount: number, fee: number = 300_000): TransactionOptions {
    const amountInt = Math.trunc(amount);
    return {
      program: PROGRAM_ID,
      function: 'validate_bet',
      inputs: [`${amountInt}u64`],
      fee,
      privateFee: false,
    };
  }

  /**
   * calculate_reward — calls the calculate_reward transition on private_claw.aleo.
   */
  createCalculateRewardTransaction(amount: number, fee: number = 300_000): TransactionOptions {
    const amountInt = Math.trunc(amount);
    return {
      program: PROGRAM_ID,
      function: 'calculate_reward',
      inputs: [`${amountInt}u64`],
      fee,
      privateFee: false,
    };
  }

  /**
   * cancel_order — cancels an open private order record.
   */
  createCancelOrderTransaction(
    _publicKey: string,
    orderId: string,
    fee: number = 300_000,
  ): TransactionOptions {
    return {
      program: PROGRAM_ID,
      function: 'cancel_order',
      inputs: [`${orderId}field`],
      fee,
      privateFee: false,
    };
  }

  /**
   * create_market — lists a new trading pair on-chain.
   */
  createListPairTransaction(
    _publicKey: string,
    pairId: string,
    numOutcomes: number = 2,
    fee: number = 500_000,
  ): TransactionOptions {
    const pairIdNumeric = pairId.replace(/\D/g, '') || '1';
    const resolutionTs = Math.trunc(Date.now() / 1000) + 90 * 24 * 60 * 60;

    return {
      program: PROGRAM_ID,
      function: 'create_market',
      inputs: [
        `${pairIdNumeric}field`,
        `${resolutionTs}u64`,
        `${numOutcomes}u8`,
      ],
      fee,
      privateFee: false,
    };
  }

  async getTransactionStatus(transactionId: string): Promise<'pending' | 'confirmed' | 'failed' | 'unknown'> {
    try {
      const response = await fetch(`${API_BASE_URL}/transaction/confirmed/${transactionId}`);
      if (response.status === 404) return 'pending';
      if (!response.ok) return 'unknown';
      const data = await response.json();
      if (data.status === 'accepted') return 'confirmed';
      if (data.status === 'rejected' || data.status === 'aborted') return 'failed';
      return 'confirmed';
    } catch {
      return 'unknown';
    }
  }

  generatePairId(): string {
    return Math.floor(Math.random() * 1_000_000_000).toString();
  }
}

export const aleoService = AleoService.getInstance();
