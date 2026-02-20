import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';

const PROGRAM_ID = 'prediction_marketv01.aleo';
const API_BASE_URL = 'https://api.provable.com/v2/testnet';

export interface TransactionResult {
  transactionId: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export class AleoService {
  private static instance: AleoService;

  static getInstance(): AleoService {
    if (!AleoService.instance) {
      AleoService.instance = new AleoService();
    }
    return AleoService.instance;
  }

  async getMappingValue(mappingName: string, key: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/program/${PROGRAM_ID}/mapping/${mappingName}/${key}`
      );
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch mapping: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      console.error(`Error fetching mapping ${mappingName}/${key}:`, error);
      return null;
    }
  }

  async getTransactionStatus(transactionId: string): Promise<'pending' | 'confirmed' | 'failed' | 'unknown'> {
    try {
      // Use the /confirmed/ endpoint — 404 means still pending, 200 means on-chain.
      const response = await fetch(`${API_BASE_URL}/transaction/confirmed/${transactionId}`);

      if (response.status === 404) {
        console.log(`[AleoService] TX ${transactionId.slice(0, 16)}… still pending (not yet confirmed)`);
        return 'pending';
      }
      if (!response.ok) {
        console.warn(`[AleoService] TX status check error: ${response.status}`);
        return 'unknown';
      }

      const data = await response.json();
      console.log(`[AleoService] TX ${transactionId.slice(0, 16)}… status:`, data.status);

      // Aleo confirmed endpoint status field: "accepted" | "rejected" | "aborted"
      if (data.status === 'accepted') return 'confirmed';
      if (data.status === 'rejected' || data.status === 'aborted') return 'failed';

      // If we got a 200 with any status, transaction is at least on-chain
      return 'confirmed';
    } catch (error) {
      console.error('[AleoService] Error fetching transaction status:', error);
      return 'unknown';
    }
  }

  /**
   * place_bet — the actual deployed transition on prediction_marketv01.aleo.
   *
   * Deployed contract signature:
   *   function place_bet:
   *     input r0 as field.public;   ← market_id  (pairId numeric → e.g. "1field")
   *     input r1 as field.public;   ← outcome_id (1field = buy, 2field = sell)
   *     input r2 as u64.private;    ← amount in microcredits (private)
   *
   * NOTE: There is NO price input — the contract does not track limit price on-chain.
   *       There is NO place_order transition; calling it caused "function does not exist".
   */
  createPlaceOrderTransaction(
    publicKey: string,
    pairId: string,
    side: 'buy' | 'sell',
    amount: number,
    _price: number,       // kept for API compatibility — not sent on-chain
    fee: number = 500_000
  ): Transaction {
    const sideField = side === 'buy' ? '1' : '2';
    const amountInt = Math.trunc(amount);

    if (amountInt <= 0) {
      throw new Error(`Invalid amount: ${amount} — must be a positive integer (microcredits).`);
    }

    // Strip non-numeric chars so "pair-1" → "1" → valid Leo field literal
    const pairIdNumeric = pairId.replace(/\D/g, '');
    if (!pairIdNumeric) {
      throw new Error(`Invalid pairId: "${pairId}" — must contain digits for a Leo field literal.`);
    }

    const inputs = [
      `${pairIdNumeric}field`,  // r0: market_id as field.public
      `${sideField}field`,      // r1: outcome_id as field.public (1=buy, 2=sell)
      `${amountInt}u64`,        // r2: amount as u64.private
    ];

    console.log('[AleoService] place_bet transaction', {
      program: PROGRAM_ID,
      functionName: 'place_bet',
      chainId: WalletAdapterNetwork.TestnetBeta,
      inputs,
      fee,
      feePrivate: false,
    });

    return Transaction.createTransaction(
      publicKey,
      WalletAdapterNetwork.TestnetBeta,
      PROGRAM_ID,
      'place_bet',        // ← correct transition name from deployed contract
      inputs,
      fee,
      false               // public fee
    );
  }

  /**
   * cancel_order — cancels an open private order record.
   */
  createCancelOrderTransaction(
    publicKey: string,
    orderId: string,
    fee: number = 300_000
  ): Transaction {
    const inputs = [`${orderId}field`];
    return Transaction.createTransaction(
      publicKey,
      WalletAdapterNetwork.TestnetBeta,
      PROGRAM_ID,
      'cancel_order',
      inputs,
      fee,
      false
    );
  }

  /**
   * settle_trade — matches a buy and sell order and settles.
   */
  createSettleTradeTransaction(
    publicKey: string,
    buyOrderId: string,
    sellOrderId: string,
    fee: number = 500_000
  ): Transaction {
    const inputs = [`${buyOrderId}field`, `${sellOrderId}field`];
    return Transaction.createTransaction(
      publicKey,
      WalletAdapterNetwork.TestnetBeta,
      PROGRAM_ID,
      'settle_trade',
      inputs,
      fee,
      false
    );
  }

  /**
   * create_market — lists a new trading pair on-chain.
   *
   * Deployed contract signature:
   *   function create_market:
   *     input r0 as field.public;   ← market_id (numeric pairId → e.g. "42field")
   *     input r1 as u64.public;     ← resolution_timestamp (unix seconds as u64)
   *     input r2 as u8.public;      ← num_outcomes (always 2 for buy/sell)
   *
   * IMPORTANT: Previously only 2 inputs were sent — r1 (resolution_timestamp)
   * was missing, causing "function does not exist" / invalid params from Leo Wallet.
   */
  createListPairTransaction(
    publicKey: string,
    pairId: string,
    numOutcomes: number = 2,
    fee: number = 500_000
  ): Transaction {
    // Strip non-numeric so "pair-42" → "42" → valid Leo field literal
    const pairIdNumeric = pairId.replace(/\D/g, '') || '1';

    // resolution_timestamp: 90 days from now in unix seconds, as u64
    const resolutionTs = Math.trunc(Date.now() / 1000) + 90 * 24 * 60 * 60;

    const inputs = [
      `${pairIdNumeric}field`,   // r0: market_id as field.public
      `${resolutionTs}u64`,      // r1: resolution_timestamp as u64.public
      `${numOutcomes}u8`,        // r2: num_outcomes as u8.public
    ];

    console.log('[AleoService] create_market transaction', {
      program: PROGRAM_ID,
      functionName: 'create_market',
      chainId: WalletAdapterNetwork.TestnetBeta,
      inputs,
      fee,
    });

    return Transaction.createTransaction(
      publicKey,
      WalletAdapterNetwork.TestnetBeta,
      PROGRAM_ID,
      'create_market',
      inputs,
      fee,
      false
    );
  }

  generatePairId(): string {
    return Math.floor(Math.random() * 1_000_000_000).toString();
  }
}

export const aleoService = AleoService.getInstance();
