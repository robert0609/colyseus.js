"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Room = void 0;
exports.splitURL = splitURL;
const Connection_1 = require("./Connection");
const Protocol_1 = require("./Protocol");
const Serializer_1 = require("./serializer/Serializer");
// The unused imports here are important for better `.d.ts` file generation
// (Later merged with `dts-bundle-generator`)
const nanoevents_1 = require("./core/nanoevents");
const signal_1 = require("./core/signal");
const schema_1 = require("@colyseus/schema");
const SchemaSerializer_1 = require("./serializer/SchemaSerializer");
const Errors_1 = require("./errors/Errors");
const msgpackr_1 = require("@colyseus/msgpackr");
function splitURL(url, base) {
    // 检查 URL 是否为空或非字符串
    if (!url || typeof url !== 'string') {
        throw new Error("URL must be a non-empty string");
    }
    // 尝试使用全局 URL 构造函数
    if (typeof globalThis !== 'undefined' && globalThis.URL) {
        try {
            return base ? new URL(url, base) : new URL(url);
        }
        catch (e) {
            // URL 构造函数可能会因为无效 URL 抛出错误
            // 继续使用备选方案
        }
    }
    // 如果有基础 URL 且 url 是相对路径，先进行合并
    if (base && url.startsWith('/')) {
        // 简单合并，可能需要更复杂的逻辑来处理各种情况
        let baseUrl = base;
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }
        url = baseUrl + url;
    }
    // 备选方案：使用正则表达式解析 URL
    var urlPattern = /^(?:([A-Za-z]+):)?(?:\/\/)?(?:([0-9.\-A-Za-z]+)(?::(\d+))?)?(\/[^?#]*)?(?:\?([^#]*))?(?:#(.*))?$/;
    var matches = url.match(urlPattern);
    if (!matches) {
        throw new Error("Invalid URL");
    }
    return {
        protocol: matches[1] ? matches[1] + ":" : "",
        hostname: matches[2] || "",
        port: matches[3] || "",
        pathname: matches[4] || "/",
        search: matches[5] ? "?" + matches[5] : "",
        searchParams: matches[5] ? matches[5] : "",
        hash: matches[6] ? "#" + matches[6] : "",
        href: url,
        origin: (matches[1] ? matches[1] + "://" : "//") + (matches[2] || "") + (matches[3] ? ":" + matches[3] : "")
    };
}
class Room {
    constructor(name, rootSchema) {
        // Public signals
        this.onStateChange = (0, signal_1.createSignal)();
        this.onError = (0, signal_1.createSignal)();
        this.onLeave = (0, signal_1.createSignal)();
        this.onJoin = (0, signal_1.createSignal)();
        this.hasJoined = false;
        this.onMessageHandlers = (0, nanoevents_1.createNanoEvents)();
        this.roomId = null;
        this.name = name;
        this.packr = new msgpackr_1.Packr();
        // msgpackr workaround: force buffer to be created.
        this.packr.encode(undefined);
        if (rootSchema) {
            this.serializer = new ((0, Serializer_1.getSerializer)("schema"));
            this.rootSchema = rootSchema;
            this.serializer.state = new rootSchema();
        }
        this.onError((code, message) => { var _a; return (_a = console.warn) === null || _a === void 0 ? void 0 : _a.call(console, `colyseus.js - onError => (${code}) ${message}`); });
        this.onLeave(() => this.removeAllListeners());
    }
    connect(endpoint, devModeCloseCallback, room = this, // when reconnecting on devMode, re-use previous room intance for handling events.
    options, headers) {
        const connection = new Connection_1.Connection(options.protocol);
        room.connection = connection;
        connection.events.onmessage = Room.prototype.onMessageCallback.bind(room);
        connection.events.onclose = function (e) {
            var _a;
            if (!room.hasJoined) {
                (_a = console.warn) === null || _a === void 0 ? void 0 : _a.call(console, `Room connection was closed unexpectedly (${e.code}): ${e.reason}`);
                room.onError.invoke(e.code, e.reason);
                return;
            }
            if (e.code === Errors_1.CloseCode.DEVMODE_RESTART && devModeCloseCallback) {
                devModeCloseCallback();
            }
            else {
                room.onLeave.invoke(e.code, e.reason);
                room.destroy();
            }
        };
        connection.events.onerror = function (e) {
            var _a;
            (_a = console.warn) === null || _a === void 0 ? void 0 : _a.call(console, `Room, onError (${e.code}): ${e.reason}`);
            room.onError.invoke(e.code, e.reason);
        };
        // FIXME: refactor this.
        if (options.protocol === "h3") {
            const url = splitURL(endpoint);
            connection.connect(url.origin, options);
        }
        else {
            connection.connect(endpoint, headers);
        }
    }
    leave(consented = true) {
        return new Promise((resolve) => {
            this.onLeave((code) => resolve(code));
            if (this.connection) {
                if (consented) {
                    this.packr.buffer[0] = Protocol_1.Protocol.LEAVE_ROOM;
                    this.connection.send(this.packr.buffer.subarray(0, 1));
                }
                else {
                    this.connection.close();
                }
            }
            else {
                this.onLeave.invoke(Errors_1.CloseCode.CONSENTED);
            }
        });
    }
    onMessage(type, callback) {
        return this.onMessageHandlers.on(this.getMessageHandlerKey(type), callback);
    }
    send(type, message) {
        const it = { offset: 1 };
        this.packr.buffer[0] = Protocol_1.Protocol.ROOM_DATA;
        if (typeof (type) === "string") {
            schema_1.encode.string(this.packr.buffer, type, it);
        }
        else {
            schema_1.encode.number(this.packr.buffer, type, it);
        }
        // force packr to use beginning of the buffer
        this.packr.position = 0;
        const data = (message !== undefined)
            ? this.packr.pack(message, 2048 + it.offset) // 2048 = RESERVE_START_SPACE
            : this.packr.buffer.subarray(0, it.offset);
        this.connection.send(data);
    }
    sendUnreliable(type, message) {
        const it = { offset: 1 };
        this.packr.buffer[0] = Protocol_1.Protocol.ROOM_DATA;
        if (typeof (type) === "string") {
            schema_1.encode.string(this.packr.buffer, type, it);
        }
        else {
            schema_1.encode.number(this.packr.buffer, type, it);
        }
        // force packr to use beginning of the buffer
        this.packr.position = 0;
        const data = (message !== undefined)
            ? this.packr.pack(message, 2048 + it.offset) // 2048 = RESERVE_START_SPACE
            : this.packr.buffer.subarray(0, it.offset);
        this.connection.sendUnreliable(data);
    }
    sendBytes(type, bytes) {
        const it = { offset: 1 };
        this.packr.buffer[0] = Protocol_1.Protocol.ROOM_DATA_BYTES;
        if (typeof (type) === "string") {
            schema_1.encode.string(this.packr.buffer, type, it);
        }
        else {
            schema_1.encode.number(this.packr.buffer, type, it);
        }
        // check if buffer needs to be resized
        // TODO: can we avoid this?
        if (bytes.byteLength + it.offset > this.packr.buffer.byteLength) {
            const newBuffer = new Uint8Array(it.offset + bytes.byteLength);
            newBuffer.set(this.packr.buffer);
            this.packr.useBuffer(newBuffer);
        }
        this.packr.buffer.set(bytes, it.offset);
        this.connection.send(this.packr.buffer.subarray(0, it.offset + bytes.byteLength));
    }
    get state() {
        return this.serializer.getState();
    }
    removeAllListeners() {
        this.onJoin.clear();
        this.onStateChange.clear();
        this.onError.clear();
        this.onLeave.clear();
        this.onMessageHandlers.events = {};
        if (this.serializer instanceof SchemaSerializer_1.SchemaSerializer) {
            // Remove callback references
            this.serializer.decoder.root.callbacks = {};
        }
    }
    onMessageCallback(event) {
        // console.log('&&& onMessageCallback', event);
        const buffer = new Uint8Array(event.data);
        const it = { offset: 1 };
        const code = buffer[0];
        if (code === Protocol_1.Protocol.JOIN_ROOM) {
            const reconnectionToken = schema_1.decode.utf8Read(buffer, it, buffer[it.offset++]);
            this.serializerId = schema_1.decode.utf8Read(buffer, it, buffer[it.offset++]);
            // Instantiate serializer if not locally available.
            if (!this.serializer) {
                const serializer = (0, Serializer_1.getSerializer)(this.serializerId);
                this.serializer = new serializer();
            }
            if (buffer.byteLength > it.offset && this.serializer.handshake) {
                this.serializer.handshake(buffer, it);
            }
            this.reconnectionToken = `${this.roomId}:${reconnectionToken}`;
            this.hasJoined = true;
            this.onJoin.invoke();
            // acknowledge successfull JOIN_ROOM
            this.packr.buffer[0] = Protocol_1.Protocol.JOIN_ROOM;
            this.connection.send(this.packr.buffer.subarray(0, 1));
        }
        else if (code === Protocol_1.Protocol.ERROR) {
            const code = schema_1.decode.number(buffer, it);
            const message = schema_1.decode.string(buffer, it);
            this.onError.invoke(code, message);
        }
        else if (code === Protocol_1.Protocol.LEAVE_ROOM) {
            this.leave();
        }
        else if (code === Protocol_1.Protocol.ROOM_STATE) {
            this.serializer.setState(buffer, it);
            this.onStateChange.invoke(this.serializer.getState());
        }
        else if (code === Protocol_1.Protocol.ROOM_STATE_PATCH) {
            this.serializer.patch(buffer, it);
            this.onStateChange.invoke(this.serializer.getState());
        }
        else if (code === Protocol_1.Protocol.ROOM_DATA) {
            const type = (schema_1.decode.stringCheck(buffer, it))
                ? schema_1.decode.string(buffer, it)
                : schema_1.decode.number(buffer, it);
            const message = (buffer.byteLength > it.offset)
                ? (0, msgpackr_1.unpack)(buffer, { start: it.offset })
                : undefined;
            this.dispatchMessage(type, message);
        }
        else if (code === Protocol_1.Protocol.ROOM_DATA_BYTES) {
            const type = (schema_1.decode.stringCheck(buffer, it))
                ? schema_1.decode.string(buffer, it)
                : schema_1.decode.number(buffer, it);
            this.dispatchMessage(type, buffer.subarray(it.offset));
        }
    }
    dispatchMessage(type, message) {
        var _a;
        const messageType = this.getMessageHandlerKey(type);
        if (this.onMessageHandlers.events[messageType]) {
            this.onMessageHandlers.emit(messageType, message);
        }
        else if (this.onMessageHandlers.events['*']) {
            this.onMessageHandlers.emit('*', type, message);
        }
        else {
            (_a = console.warn) === null || _a === void 0 ? void 0 : _a.call(console, `colyseus.js: onMessage() not registered for type '${type}'.`);
        }
    }
    destroy() {
        if (this.serializer) {
            this.serializer.teardown();
        }
    }
    getMessageHandlerKey(type) {
        switch (typeof (type)) {
            // string
            case "string": return type;
            // number
            case "number": return `i${type}`;
            default: throw new Error("invalid message type.");
        }
    }
}
exports.Room = Room;
//# sourceMappingURL=Room.js.map