// colyseus.js@0.17.1
import { ServerError, AbortError } from './errors/Errors.mjs';
import * as httpie from '@colyseus/httpie';

class HTTP {
    client;
    headers;
    authToken;
    constructor(client, headers = {}) {
        this.client = client;
        this.headers = headers;
    }
    get(path, options = {}) {
        return this.request("get", path, options);
    }
    post(path, options = {}) {
        return this.request("post", path, options);
    }
    del(path, options = {}) {
        return this.request("del", path, options);
    }
    put(path, options = {}) {
        return this.request("put", path, options);
    }
    request(method, path, options = {}) {
        if (!!wx) {
            // 微信小程序环境
            const fullOptions = this.getOptions(options);
            return new Promise((resolve, reject) => {
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
                    fail: ({ errMsg }) => {
                        reject(new Error(errMsg));
                    }
                });
            }).catch((e) => {
                const status = e.statusCode || -1; //  || -1
                const message = e.data?.error || e.statusMessage || e.message; //  || "offline"
                throw new ServerError(status, message);
            });
        }
        else {
            return httpie[method](this.client['getHttpEndpoint'](path), this.getOptions(options)).catch((e) => {
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
    getOptions(options) {
        // merge default custom headers with user headers
        options.headers = Object.assign({}, this.headers, options.headers);
        if (this.authToken) {
            options.headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        if (typeof (cc) !== 'undefined' && cc.sys && cc.sys.isNative) ;
        else {
            // always include credentials
            options.withCredentials = true;
        }
        return options;
    }
}

export { HTTP };
//# sourceMappingURL=HTTP.mjs.map
