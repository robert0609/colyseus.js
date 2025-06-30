"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketTransport = void 0;
const ws_1 = __importDefault(require("ws"));
const WebSocket = globalThis.WebSocket || ws_1.default;
class WebSocketTransport {
    constructor(events) {
        this.events = events;
    }
    send(data) {
        if (!!wx) {
            this.ws.send({ data });
        }
        else {
            this.ws.send(data);
        }
    }
    sendUnreliable(data) {
        console.warn("colyseus.js: The WebSocket transport does not support unreliable messages");
    }
    /**
     * @param url URL to connect to
     * @param headers custom headers to send with the connection (only supported in Node.js. Web Browsers do not allow setting custom headers)
     */
    connect(url, headers) {
        if (!!wx) {
            // 若是微信小程序环境
            this.ws = wx.connectSocket({
                url,
                protocols: Array.isArray(this.protocols) ? this.protocols : [this.protocols]
            });
            this.ws.onOpen(this.events.onopen);
            this.ws.onMessage(this.events.onmessage);
            this.ws.onClose(this.events.onclose);
            this.ws.onError(({ errMsg }) => {
                this.events.onerror({ code: -10000, reason: errMsg });
            });
        }
        else {
            try {
                // Node or Bun environments (supports custom headers)
                this.ws = new WebSocket(url, { headers, protocols: this.protocols });
            }
            catch (e) {
                // browser environment (custom headers not supported)
                this.ws = new WebSocket(url, this.protocols);
            }
            this.ws.binaryType = 'arraybuffer';
            this.ws.onopen = this.events.onopen;
            this.ws.onmessage = this.events.onmessage;
            this.ws.onclose = this.events.onclose;
            this.ws.onerror = this.events.onerror;
        }
    }
    close(code, reason) {
        if (!!wx) {
            this.ws.send({ code, reason });
        }
        else {
            this.ws.close(code, reason);
        }
    }
    get isOpen() {
        return this.ws.readyState === WebSocket.OPEN;
    }
}
exports.WebSocketTransport = WebSocketTransport;
//# sourceMappingURL=WebSocketTransport.js.map