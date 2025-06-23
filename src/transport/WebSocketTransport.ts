import NodeWebSocket from "ws";
import { ITransport, ITransportEventMap } from "./ITransport";

const WebSocket = globalThis.WebSocket || NodeWebSocket;

export class WebSocketTransport implements ITransport {
    ws: WebSocket | NodeWebSocket | WechatMiniprogram.SocketTask;
    protocols?: string | string[];

    constructor(public events: ITransportEventMap) {}

    public send(data: Buffer | Uint8Array): void {
        if (!!wx) {
            this.ws.send({ data });
        } else {
            this.ws.send(data);
        }
    }

    public sendUnreliable(data: ArrayBuffer | Array<number>): void {
        console.warn("colyseus.js: The WebSocket transport does not support unreliable messages");
    }

    /**
     * @param url URL to connect to
     * @param headers custom headers to send with the connection (only supported in Node.js. Web Browsers do not allow setting custom headers)
     */
    public connect(url: string, headers?: any): void {
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
        } else {
            try {
                // Node or Bun environments (supports custom headers)
                this.ws = new WebSocket(url, { headers, protocols: this.protocols });

            } catch (e) {
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

    public close(code?: number, reason?: string) {
        if (!!wx) {
            this.ws.send({ code, reason });
        } else {
            this.ws.close(code, reason);
        }
    }

    get isOpen() {
        return this.ws.readyState === WebSocket.OPEN;
    }

}
