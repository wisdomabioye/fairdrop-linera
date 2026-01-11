import type { Signer } from "./Signer.js";
/**
 * A signer implementation that tries multiple signers in series.
 */
export default class Composite implements Signer {
    private signers;
    constructor(...signers: Signer[]);
    sign(owner: string, value: Uint8Array): Promise<string>;
    containsKey(owner: string): Promise<boolean>;
}
