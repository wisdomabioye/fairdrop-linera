/**
 * Escape GraphQL string values to prevent injection attacks
 */
function escapeGraphQLString(value: string): string {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
}

/**
 * Format a value for use in GraphQL queries with proper escaping
 */
export function formatGraphQLValue(value: unknown): string {
    if (typeof value === 'string') {
        return `"${escapeGraphQLString(value)}"`;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    if (value === null || value === undefined) {
        return 'null';
    }
    if (Array.isArray(value)) {
        return `[${value.map(formatGraphQLValue).join(', ')}]`;
    }
    if (typeof value === 'object') {
        const entries = Object.entries(value)
            .map(([k, v]) => `${k}: ${formatGraphQLValue(v)}`)
            .join(', ');
        return `{${entries}}`;
    }
    throw new Error(`Unsupported value type: ${typeof value}`);
}

/**
 * Simplified builder class for composing multiple queries into a single GraphQL request
 */
export class QueryBatchBuilder {
    protected fragments: string[] = [];
    private queryType: 'query' | 'mutation';

    constructor(queryType: 'query' | 'mutation' = 'query') {
        this.queryType = queryType;
    }

    /**
     * Add a query fragment (complete GraphQL field with args and selection)
     */
    addFragment(queryBody: string): this {
        this.fragments.push(queryBody);
        return this;
    }

    /**
     * Build the combined query
     */
    build(): { query: string } {
        if (this.fragments.length === 0) {
            throw new Error('No queries added to batch builder');
        }

        const combinedBody = this.fragments.join('\n                ');

        return {
            query: `${this.queryType} {\n                ${combinedBody}\n            }`
        };
    }

    /**
     * Clear all fragments
     */
    clear(): this {
        this.fragments = [];
        return this;
    }

    /**
     * Get number of fragments in the batch
     */
    get length(): number {
        return this.fragments.length;
    }
}
