const { TextDecoder, TextEncoder } = require("node:util");
const {
  ReadableStream,
  WritableStream,
  TransformStream,
} = require("node:stream/web");
const { MessageChannel, MessagePort } = require("node:worker_threads");

globalThis.TextDecoder = TextDecoder;
globalThis.TextEncoder = TextEncoder;
globalThis.ReadableStream = ReadableStream;
globalThis.WritableStream = WritableStream;
globalThis.TransformStream = TransformStream;
globalThis.MessageChannel = MessageChannel;
globalThis.MessagePort = MessagePort;

const { fetch, Request, Response, Headers, FormData } = require("undici");

Object.defineProperties(globalThis, {
  fetch: { value: fetch, writable: true, configurable: true },
  Request: { value: Request, writable: true, configurable: true },
  Response: { value: Response, writable: true, configurable: true },
  Headers: { value: Headers, writable: true, configurable: true },
  FormData: { value: FormData, writable: true, configurable: true },
});

if (typeof globalThis.BroadcastChannel === "undefined") {
  globalThis.BroadcastChannel = class BroadcastChannel {
    postMessage() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
  };
}
