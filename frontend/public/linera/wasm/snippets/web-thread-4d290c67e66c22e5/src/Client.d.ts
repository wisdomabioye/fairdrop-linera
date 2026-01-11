export class web_thread$Client {
    constructor(module: any, memory: any);
    nextId: number;
    promises: Map<any, any>;
    worker: Worker;
    ready: Promise<any>;
    setReady: (value: any) => void;
    run(code: any, context: any, transfer: any): Promise<any>;
    destroy(): void;
    handleResponse(event: any): void;
}
