"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketTransport = void 0;
const WebSocket = globalThis.WebSocket;
class WebSocketTransport {
    constructor(events) {
        this.events = events;
    }
    send(data) {
        // console.log('&&&', 'send to server', data);
        if (!!wx) {
            if (data instanceof Uint8Array) {
                /**
                 * 微信小程序的websocket api不支持直接发送Uint8Array，会报：sendSocketMessage:fail:unknown data
                 * 因此这里要转换成ArrayBuffer发送。而且要注意通过byteOffset和byteLength截取
                 */
                // console.log('&&&', 'send in wx on Uint8Array');
                this.ws.send({ data: data.buffer.slice(data.byteOffset, data.byteLength + data.byteOffset), fail: (err) => console.error('&&& send error', err) });
            }
            else if (Array.isArray(data)) {
                // console.log('&&&', 'send in wx on Array');
                this.ws.send({ data: (new Uint8Array(data)).buffer, fail: (err) => console.error('&&& send error', err) });
            }
            else {
                // console.log('&&&', 'send in wx on Raw');
                this.ws.send({ data, fail: (err) => console.error('&&& send error', err) });
            }
        }
        else {
            // console.log('&&&', 'send in web');
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
        // console.log('&&&', 'start connect');
        if (!!wx) {
            // console.log('&&&', 'connect in wx');
            // 若是微信小程序环境
            this.ws = wx.connectSocket({
                url,
                protocols: Array.isArray(this.protocols) ? this.protocols : [this.protocols]
            });
            this.ws.onOpen(this.events.onopen);
            this.ws.onMessage(this.events.onmessage);
            this.ws.onClose(this.events.onclose);
            this.ws.onError(({ errMsg }) => {
                // TODO: error code defination
                this.events.onerror({ code: -10000, reason: errMsg });
            });
        }
        else {
            // browser environment (custom headers not supported)
            this.ws = new WebSocket(url, this.protocols);
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