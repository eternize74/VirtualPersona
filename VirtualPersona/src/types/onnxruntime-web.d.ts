/**
 * @file onnxruntime-web.d.ts
 * @brief ONNX Runtime Web 타입 선언
 */

declare module 'onnxruntime-web' {
    export interface Tensor {
        readonly dims: readonly number[];
        readonly type: string;
        readonly data: Float32Array | Int32Array | Uint8Array | BigInt64Array | BigUint64Array;
        readonly size: number;
    }

    export class Tensor {
        constructor(
            type: 'float32' | 'int32' | 'uint8' | 'bool' | 'int64' | 'uint64',
            data: Float32Array | Int32Array | Uint8Array | BigInt64Array | BigUint64Array | number[],
            dims?: readonly number[]
        );
    }

    export interface InferenceSession {
        run(feeds: Record<string, Tensor>): Promise<Record<string, Tensor>>;
        release(): Promise<void>;
        readonly inputNames: readonly string[];
        readonly outputNames: readonly string[];
    }

    export interface SessionOptions {
        executionProviders?: ('webgpu' | 'webgl' | 'wasm' | 'cpu')[];
        graphOptimizationLevel?: 'disabled' | 'basic' | 'extended' | 'all';
        intraOpNumThreads?: number;
        interOpNumThreads?: number;
        logSeverityLevel?: number;
    }

    export namespace InferenceSession {
        function create(
            modelPath: string | ArrayBuffer | Uint8Array,
            options?: SessionOptions
        ): Promise<InferenceSession>;
    }

    export namespace env {
        namespace wasm {
            let numThreads: number;
            let simd: boolean;
            let proxy: boolean;
            let wasmPaths: string | { mjs?: string; wasm?: string };
        }
        let logLevel: string;
    }
}
