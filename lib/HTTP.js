"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTP = void 0;
const Errors_1 = require("./errors/Errors");
const httpie = __importStar(require("@colyseus/httpie"));
class HTTP {
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
                var _a;
                const status = e.statusCode || -1; //  || -1
                const message = ((_a = e.data) === null || _a === void 0 ? void 0 : _a.error) || e.statusMessage || e.message; //  || "offline"
                if (!status && !message) {
                    throw e;
                }
                throw new Errors_1.ServerError(status, message);
            });
        }
        else {
            return httpie[method](this.client['getHttpEndpoint'](path), this.getOptions(options)).catch((e) => {
                var _a;
                if (e.aborted) {
                    throw new Errors_1.AbortError("Request aborted");
                }
                const status = e.statusCode; //  || -1
                const message = ((_a = e.data) === null || _a === void 0 ? void 0 : _a.error) || e.statusMessage || e.message; //  || "offline"
                if (!status && !message) {
                    throw e;
                }
                throw new Errors_1.ServerError(status, message);
            });
        }
    }
    getOptions(options) {
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
        }
        else {
            // always include credentials
            options.withCredentials = true;
        }
        return options;
    }
}
exports.HTTP = HTTP;
//# sourceMappingURL=HTTP.js.map