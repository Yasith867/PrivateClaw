import type { TransactionOptions } from '@provablehq/aleo-types';

// The deployed Leo program on Aleo Testnet
export const PROGRAM_ID = 'private_claw.aleo';

const API_BASE_URL = 'https://api.provable.com/v2/testnet';

export class AleoService {
  private static instance: AleoService;

  static getInstance(): AleoService {
    if (!AleoService.instance) {
      AleoService.instance = new AleoService();
    }
    return AleoService.instance;
  }

  async getTransactionStatus(transactionId: string): Promise<'pending' | 'confirmed' | 'failed' | 'unknown'> {
    try {
      const response = await fetch(`${API_BASE_URL}/transaction/confirmed/${transactionId}`);

      if (response.status === 404) {
        console.log(`[AleoService] TX ${transactionId.slice(0, 16)}… still pending`);
        return 'pending';
      }
      if (!response.ok) {
        console.warn(`[AleoService] TX status check error: ${response.status}`);
        return 'unknown';
      }

      const data = await response.json();
      if (data.status === 'accepted') return 'confirmed';
      if (data.status === 'rejected' || data.status === 'aborted') return 'failed';
      return 'confirmed';
    } catch (error) {
      console.error('[AleoService] Error fetching transaction status:', error);
      return 'unknown';
    }
  }

  /**
   * place_bet — calls the place_bet transition on private_claw.aleo
   *   amount: u64  ← order size in microcredits (private — hidden on-chain)
   */
  createPlaceOrderTransaction(
    _publicKey: string,
    pairId: string,
    side: 'buy' | 'sell',
    amount: number,
    _price: number,
    fee: number = 500_000
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
   * cancel_order — cancels an open private order record.
   */
  createCancelOrderTransaction(
    _publicKey: string,
    orderId: string,
    fee: number = 300_000
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
   * settle_trade — matches a buy and sell order and settles.
   */
  createSettleTradeTransaction(
    _publicKey: string,
    buyOrderId: string,
    sellOrderId: string,
    fee: number = 500_000
  ): TransactionOptions {
    return {
      program: PROGRAM_ID,
      function: 'settle_trade',
      inputs: [`${buyOrderId}field`, `${sellOrderId}field`],
      fee,
      privateFee: false,
    };
  }

  /**
   * create_market — lists a new trading pair on-chain.
   *   input r0 as field.public;   ← market_id
   *   input r1 as u64.public;     ← resolution_timestamp
   *   input r2 as u8.public;      ← num_outcomes
   */
  createListPairTransaction(
    _publicKey: string,
    pairId: string,
    numOutcomes: number = 2,
    fee: number = 500_000
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

  generatePairId(): string {
    return Math.floor(Math.random() * 1_000_000_000).toString();
  }
}

export const aleoService = AleoService.getInstance();
