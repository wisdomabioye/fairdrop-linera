/* tslint:disable */
/* eslint-disable */
export function main(): void;
export function __web_thread_worker_entry_point(code: any, context: any): Promise<any>;
export enum SignerError {
  MissingKey = 0,
  SigningError = 1,
  PublicKeyParse = 2,
  JsConversion = 3,
  UnexpectedSignatureFormat = 4,
  InvalidAccountOwnerType = 5,
  Unknown = 9,
}
/**
 * The `ReadableStreamType` enum.
 *
 * *This API requires the following crate features to be activated: `ReadableStreamType`*
 */
type ReadableStreamType = "bytes";
export interface TransferParams {
    donor?: AccountOwner | undefined;
    amount: number;
    recipient: Account;
}

export interface AddOwnerOptions {
    weight?: number;
}

import type { Signer } from '../signer/index.js';

export interface QueryOptions {
    blockHash?: string | undefined;
    owner?: AccountOwner | undefined;
}

export interface Options extends ChainListenerConfig {
    /**
     * Timeout for sending queries (milliseconds)
     */
    sendTimeout?: { secs: number; nanos: number };
    /**
     * Timeout for receiving responses (milliseconds)
     */
    recvTimeout?: { secs: number; nanos: number };
    /**
     * The maximum number of incoming message bundles to include in a block proposal.
     */
    maxPendingMessageBundles?: number;
    /**
     * The duration in milliseconds after which an idle chain worker will free its memory.
     */
    chainWorkerTtl?: { secs: number; nanos: number };
    /**
     * The duration, in milliseconds, after which an idle sender chain worker will
     * free its memory.
     */
    senderChainWorkerTtl?: { secs: number; nanos: number };
    /**
     * Delay increment for retrying to connect to a validator.
     */
    retryDelay?: { secs: number; nanos: number };
    /**
     * Number of times to retry connecting to a validator.
     */
    maxRetries?: number;
    /**
     * Whether to wait until a quorum of validators has confirmed that all sent cross-chain
     * messages have been delivered.
     */
    waitForOutgoingMessages?: boolean;
    /**
     * (EXPERIMENTAL) Whether application services can persist in some cases between queries.
     */
    longLivedServices?: boolean;
    /**
     * The policy for handling incoming messages.
     */
    blanketMessagePolicy?: BlanketMessagePolicy;
    /**
     * A set of chains to restrict incoming messages from. By default, messages
     * from all chains are accepted. To reject messages from all chains, specify
     * an empty string.
     */
    restrictChainIdsTo?: ChainId[] | undefined;
    /**
     * A set of application IDs. If specified, only bundles with at least one message from one of
     * these applications will be accepted.
     */
    rejectMessageBundlesWithoutApplicationIds?: GenericApplicationId[] | undefined;
    /**
     * A set of application IDs. If specified, only bundles where all messages are from one of
     * these applications will be accepted.
     */
    rejectMessageBundlesWithOtherApplicationIds?: GenericApplicationId[] | undefined;
    /**
     * An additional delay, after reaching a quorum, to wait for additional validator signatures,
     * as a fraction of time taken to reach quorum.
     */
    quorumGracePeriod?: number;
    /**
     * The delay when downloading a blob, after which we try a second validator, in milliseconds.
     */
    blobDownloadTimeout?: { secs: number; nanos: number };
    /**
     * The delay when downloading a batch of certificates, after which we try a second validator,
     * in milliseconds.
     */
    certificateBatchDownloadTimeout?: { secs: number; nanos: number };
    /**
     * Maximum number of certificates that we download at a time from one validator when
     * synchronizing one of our chains.
     */
    certificateDownloadBatchSize?: number;
    /**
     * Maximum number of sender certificates we try to download and receive in one go
     * when syncing sender chains.
     */
    senderCertificateDownloadBatchSize?: number;
    /**
     * Maximum number of tasks that can are joined concurrently in the client.
     */
    maxJoinedTasks?: number;
    /**
     * Maximum expected latency in milliseconds for score normalization.
     */
    maxAcceptedLatencyMs?: number;
    /**
     * Time-to-live for cached responses in milliseconds.
     */
    cacheTtlMs?: number;
    /**
     * Maximum number of entries in the cache.
     */
    cacheMaxSize?: number;
    /**
     * Maximum latency for an in-flight request before we stop deduplicating it (in milliseconds).
     */
    maxRequestTtlMs?: number;
    /**
     * Smoothing factor for Exponential Moving Averages (0 < alpha < 1).
     * Higher values give more weight to recent observations.
     * Typical values are between 0.01 and 0.5.
     * A value of 0.1 means that 10% of the new observation is considered
     * and 90% of the previous average is retained.
     */
    alpha?: number;
    /**
     * Delay in milliseconds between starting requests to different peers.
     * This helps to stagger requests and avoid overwhelming the network.
     */
    alternativePeersRetryDelayMs?: number;
}

export interface ChainListenerConfig {
    /**
     * Do not create blocks automatically to receive incoming messages. Instead, wait for
     * an explicit mutation `processInbox`.
     */
    skipProcessInbox?: boolean;
    /**
     * Wait before processing any notification (useful for testing).
     */
    delayBeforeMs?: number;
    /**
     * Wait after processing any notification (useful for rate limiting).
     */
    delayAfterMs?: number;
}

export type BlanketMessagePolicy = "Accept" | "Reject" | "Ignore";

export type ApplicationId = string;

/**
 * A unique identifier for an application.
 */
export type GenericApplicationId = "System" | { User: ApplicationId };

/**
 * The unique identifier (UID) of a chain. This is currently computed as the hash value
 * of a [`ChainDescription`].
 */
export type ChainId = CryptoHash;

/**
 * A system account.
 */
export interface Account {
    /**
     * The chain of the account.
     */
    chain_id: ChainId;
    /**
     * The owner of the account, or `None` for the chain balance.
     */
    owner: AccountOwner;
}

/**
 * An account owner.
 */
export type AccountOwner = string;

/**
 * A Keccak256 value.
 */
export type CryptoHash = string;

export class Application {
  private constructor();
  free(): void;
  /**
   * Performs a query against an application's service.
   *
   * If `block_hash` is non-empty, it specifies the block at which to
   * perform the query; otherwise, the latest block is used.
   *
   * # Errors
   * If the application ID is invalid, the query is incorrect, or
   * the response isn't valid UTF-8.
   *
   * # Panics
   * On internal protocol errors.
   */
  query(query: string, options?: QueryOptions | null): Promise<string>;
}
export class Chain {
  private constructor();
  free(): void;
  /**
   * Sets a callback to be called when a notification is received
   * from the network.
   *
   * # Errors
   * If we fail to subscribe to the notification stream.
   *
   * # Panics
   * If the handler function fails.
   */
  onNotification(handler: Function): void;
  /**
   * Transfers funds from one account to another.
   *
   * `options` should be an options object of the form `{ donor,
   * recipient, amount }`; omitting `donor` will cause the funds to
   * come from the chain balance.
   *
   * # Errors
   * - if the options object is of the wrong form
   * - if the transfer fails
   */
  transfer(params: TransferParams): Promise<void>;
  /**
   * Gets the balance of the default chain.
   *
   * # Errors
   * If the chain couldn't be established.
   */
  balance(): Promise<string>;
  /**
   * Gets the identity of the default chain.
   *
   * # Errors
   * If the chain couldn't be established.
   */
  identity(): Promise<AccountOwner>;
  /**
   * Adds a new owner to the default chain.
   *
   * # Errors
   *
   * If the owner is in the wrong format, or the chain client can't be instantiated.
   */
  addOwner(owner: AccountOwner, options?: AddOwnerOptions | null): Promise<void>;
  /**
   * Gets the version information of the validators of the current network.
   *
   * # Errors
   * If a validator is unreachable.
   */
  validatorVersionInfo(): Promise<any>;
  /**
   * Retrieves an application for querying.
   *
   * # Errors
   * If the application ID is invalid.
   */
  application(id: string): Promise<Application>;
}
/**
 * The full client API, exposed to the wallet implementation. Calls
 * to this API can be trusted to have originated from the user's
 * request.
 */
export class Client {
  free(): void;
  /**
   * Creates a new client and connects to the network.
   *
   * # Errors
   * On transport or protocol error, if persistent storage is
   * unavailable, or if `options` is incorrectly structured.
   */
  constructor(wallet: Wallet, signer: Signer, options?: Options | null);
  /**
   * Connect to a chain on the Linera network.
   *
   * # Errors
   *
   * If the wallet could not be read or chain synchronization fails.
   */
  chain(chain: ChainId): Promise<Chain>;
}
export class Faucet {
  free(): void;
  constructor(url: string);
  /**
   * Creates a new wallet from the faucet.
   *
   * # Errors
   * If we couldn't retrieve the genesis config from the faucet.
   */
  createWallet(): Promise<Wallet>;
  /**
   * Claims a new chain from the faucet, with a new keypair and some tokens.
   *
   * # Errors
   * - if we fail to get the list of current validators from the faucet
   * - if we fail to claim the chain from the faucet
   * - if we fail to persist the new chain or keypair to the wallet
   *
   * # Panics
   * If an error occurs in the chain listener task.
   */
  claimChain(wallet: Wallet, owner: AccountOwner): Promise<string>;
}
export class IntoUnderlyingByteSource {
  private constructor();
  free(): void;
  start(controller: ReadableByteStreamController): void;
  pull(controller: ReadableByteStreamController): Promise<any>;
  cancel(): void;
  readonly type: ReadableStreamType;
  readonly autoAllocateChunkSize: number;
}
export class IntoUnderlyingSink {
  private constructor();
  free(): void;
  write(chunk: any): Promise<any>;
  close(): Promise<any>;
  abort(reason: any): Promise<any>;
}
export class IntoUnderlyingSource {
  private constructor();
  free(): void;
  pull(controller: ReadableStreamDefaultController): Promise<any>;
  cancel(): void;
}
/**
 * A wallet that stores the user's chains and keys in memory.
 */
export class Wallet {
  private constructor();
  free(): void;
  /**
   * Set the owner of a chain (the account used to sign blocks on this chain).
   *
   * # Errors
   *
   * If the provided `ChainId` or `AccountOwner` are in the wrong format.
   */
  setOwner(chain_id: any, owner: any): Promise<void>;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly __wbg_chain_free: (a: number, b: number) => void;
  readonly chain_onNotification: (a: number, b: any) => [number, number];
  readonly chain_transfer: (a: number, b: any) => any;
  readonly chain_balance: (a: number) => any;
  readonly chain_identity: (a: number) => any;
  readonly chain_addOwner: (a: number, b: any, c: number) => any;
  readonly chain_validatorVersionInfo: (a: number) => any;
  readonly chain_application: (a: number, b: number, c: number) => any;
  readonly __wbg_faucet_free: (a: number, b: number) => void;
  readonly faucet_new: (a: number, b: number) => number;
  readonly faucet_createWallet: (a: number) => any;
  readonly faucet_claimChain: (a: number, b: number, c: any) => any;
  readonly __wbg_client_free: (a: number, b: number) => void;
  readonly client_new: (a: number, b: any, c: number) => any;
  readonly client_chain: (a: number, b: any) => any;
  readonly main: () => void;
  readonly __wbg_application_free: (a: number, b: number) => void;
  readonly application_query: (a: number, b: number, c: number, d: number) => any;
  readonly __wbg_wallet_free: (a: number, b: number) => void;
  readonly wallet_setOwner: (a: number, b: any, c: any) => any;
  readonly __web_thread_worker_entry_point: (a: any, b: any) => any;
  readonly __wbg_intounderlyingsource_free: (a: number, b: number) => void;
  readonly intounderlyingsource_pull: (a: number, b: any) => any;
  readonly intounderlyingsource_cancel: (a: number) => void;
  readonly __wbg_intounderlyingsink_free: (a: number, b: number) => void;
  readonly intounderlyingsink_write: (a: number, b: any) => any;
  readonly intounderlyingsink_close: (a: number) => any;
  readonly intounderlyingsink_abort: (a: number, b: any) => any;
  readonly __wbg_intounderlyingbytesource_free: (a: number, b: number) => void;
  readonly intounderlyingbytesource_type: (a: number) => number;
  readonly intounderlyingbytesource_autoAllocateChunkSize: (a: number) => number;
  readonly intounderlyingbytesource_start: (a: number, b: any) => void;
  readonly intounderlyingbytesource_pull: (a: number, b: any) => any;
  readonly intounderlyingbytesource_cancel: (a: number) => void;
  readonly __wbg_trap_free: (a: number, b: number) => void;
  readonly trap___wbg_wasmer_trap: () => void;
  readonly memory: WebAssembly.Memory;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_export_5: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_export_7: WebAssembly.Table;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly _dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h6c108f0cdc15a49a: (a: number, b: number) => void;
  readonly _dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h82e53cc2539c8fc5_multivalue_shim: (a: number, b: number) => [number, number];
  readonly closure3289_externref_shim: (a: number, b: number, c: any) => void;
  readonly closure3779_externref_shim: (a: number, b: number, c: any, d: any) => void;
  readonly __wbindgen_thread_destroy: (a?: number, b?: number, c?: number) => void;
  readonly __wbindgen_start: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput, memory?: WebAssembly.Memory, thread_stack_size?: number }} module - Passing `SyncInitInput` directly is deprecated.
* @param {WebAssembly.Memory} memory - Deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput, memory?: WebAssembly.Memory, thread_stack_size?: number } | SyncInitInput, memory?: WebAssembly.Memory): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput>, memory?: WebAssembly.Memory, thread_stack_size?: number }} module_or_path - Passing `InitInput` directly is deprecated.
* @param {WebAssembly.Memory} memory - Deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput>, memory?: WebAssembly.Memory, thread_stack_size?: number } | InitInput | Promise<InitInput>, memory?: WebAssembly.Memory): Promise<InitOutput>;
