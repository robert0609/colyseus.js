import { Client } from "./Client";
import { AbortError, ServerError } from "./errors/Errors";
import * as httpie from "@colyseus/httpie";

export class HTTP {
    public authToken: string;

    constructor(
        protected client: Client,
        public headers: { [id: string]: string } = {},
    ) {}

    public get<T = any>(path: string, options: Partial<httpie.Options> = {}): Promise<httpie.Response<T>> {
        return this.request("get", path, options);
    }

    public post<T = any>(path: string, options: Partial<httpie.Options> = {}): Promise<httpie.Response<T>> {
        return this.request("post", path, options);
    }

    public del<T = any>(path: string, options: Partial<httpie.Options> = {}): Promise<httpie.Response<T>> {
        return this.request("del", path, options);
    }

    public put<T = any>(path: string, options: Partial<httpie.Options> = {}): Promise<httpie.Response<T>> {
        return this.request("put", path, options);
    }

    protected request(method: "get" | "post" | "put" | "del", path: string, options: Partial<httpie.Options> = {}): Promise<httpie.Response> {
        if (!!wx) {
            // 微信小程序环境
            const fullOptions = this.getOptions(options);
            return new Promise<httpie.Response>((resolve, reject) => {
                wx.request({
                    url: this.client['getHttpEndpoint'](path),
                    // @ts-ignore
                    method: method.toUpperCase(),
                    header: fullOptions.headers,
                    timeout: fullOptions.timeout,
                    data: fullOptions.body,
                    success: ({ data, statusCode, header }) => {
                        resolve({
                            data,
                            statusCode,
                            statusMessage: '',
                            headers: header
                        });
                    },
                    fail : ({ errMsg }) => {
                        reject(new Error(errMsg));
                    }
                });
            }).catch((e: any) => {
                const status = e.statusCode || -1; //  || -1
                const message = e.data?.error || e.statusMessage || e.message; //  || "offline"

                if (!status && !message) {
                    throw e;
                }

                throw new ServerError(status, message);
            });
        } else {
            return httpie[method](this.client['getHttpEndpoint'](path), this.getOptions(options)).catch((e: any) => {
                if (e.aborted) {
                    throw new AbortError("Request aborted");
                }

                const status = e.statusCode; //  || -1
                const message = e.data?.error || e.statusMessage || e.message; //  || "offline"

                if (!status && !message) {
                    throw e;
                }

                throw new ServerError(status, message);
            });
        }
    }

    protected getOptions(options: Partial<httpie.Options>) {
        // merge default custom headers with user headers
        options.headers = Object.assign({}, this.headers, options.headers);

        if (this.authToken) {
            options.headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        if (typeof (cc) !== 'undefined' && cc.sys && cc.sys.isNative) {
            //
            // Workaround for Cocos Creator on Native platform
            // "Cannot set property withCredentials of #<XMLHttpRequest> which has only a getter"
            //
        } else {
            // always include credentials
            options.withCredentials = true;
        }

        return options;
    }
}
