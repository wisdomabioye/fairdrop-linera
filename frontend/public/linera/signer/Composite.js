/**
 * A signer implementation that tries multiple signers in series.
 */
export default class Composite {
    signers;
    constructor(...signers) {
        this.signers = signers;
    }
    async sign(owner, value) {
        for (const signer of this.signers)
            if (await signer.containsKey(owner))
                return await signer.sign(owner, value);
        throw new Error(`no signer found for owner ${owner}`);
    }
    async containsKey(owner) {
        for (const signer of this.signers)
            if (await signer.containsKey(owner))
                return true;
        return false;
    }
}
//# sourceMappingURL=Composite.js.map