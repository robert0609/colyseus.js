"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = exports.MatchMakeError = void 0;
const Errors_1 = require("./errors/Errors");
const Room_1 = require("./Room");
const HTTP_1 = require("./HTTP");
const Auth_1 = require("./Auth");
const discord_1 = require("./3rd_party/discord");
class MatchMakeError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = "MatchMakeError";
        Object.setPrototypeOf(this, MatchMakeError.prototype);
    }
}
exports.MatchMakeError = MatchMakeError;
// - React Native does not provide `window.location`
// - Cocos Creator (Native) does not provide `window.location.hostname`
const DEFAULT_ENDPOINT = (typeof (window) !== "undefined" && typeof ((_a = window === null || window === void 0 ? void 0 : window.location) === null || _a === void 0 ? void 0 : _a.hostname) !== "undefined")
    ? `${window.location.protocol.replace("http", "ws")}//${window.location.hostname}${(window.location.port && `:${window.location.port}`)}`
    : "ws://127.0.0.1:2567";
class Client {
    constructor(settings = DEFAULT_ENDPOINT, options) {
        var _a, _b, _c;
        if (typeof (settings) === "string") {
            //
            // endpoint by url
            //
            const url = (settings.startsWith("/"))
                ? (0, Room_1.splitURL)(settings, DEFAULT_ENDPOINT)
                : (0, Room_1.splitURL)(settings);
            const secure = (url.protocol === "https:" || url.protocol === "wss:");
            const port = Number(url.port || (secure ? 443 : 80));
            this.settings = {
                hostname: url.hostname,
                pathname: url.pathname,
                port,
                secure,
                searchParams: ((_a = url.searchParams) === null || _a === void 0 ? void 0 : _a.toString()) || undefined,
            };
        }
        else {
            //
            // endpoint by settings
            //
            if (settings.port === undefined) {
                settings.port = (settings.secure) ? 443 : 80;
            }
            if (settings.pathname === undefined) {
                settings.pathname = "";
            }
            this.settings = settings;
        }
        // make sure pathname does not end with "/"
        if (this.settings.pathname.endsWith("/")) {
            this.settings.pathname = this.settings.pathname.slice(0, -1);
        }
        this.http = new HTTP_1.HTTP(this, (options === null || options === void 0 ? void 0 : options.headers) || {});
        this.auth = new Auth_1.Auth(this.http);
        this.urlBuilder = options === null || options === void 0 ? void 0 : options.urlBuilder;
        //
        // Discord Embedded SDK requires a custom URL builder
        //
        if (!this.urlBuilder &&
            typeof (window) !== "undefined" &&
            ((_c = (_b = window === null || window === void 0 ? void 0 : window.location) === null || _b === void 0 ? void 0 : _b.hostname) === null || _c === void 0 ? void 0 : _c.includes("discordsays.com"))) {
            this.urlBuilder = discord_1.discordURLBuilder;
            console.log("Colyseus SDK: Discord Embedded SDK detected. Using custom URL builder.");
        }
    }
    joinOrCreate(roomName_1) {
        return __awaiter(this, arguments, void 0, function* (roomName, options = {}, rootSchema) {
            return yield this.createMatchMakeRequest('joinOrCreate', roomName, options, rootSchema);
        });
    }
    create(roomName_1) {
        return __awaiter(this, arguments, void 0, function* (roomName, options = {}, rootSchema) {
            return yield this.createMatchMakeRequest('create', roomName, options, rootSchema);
        });
    }
    join(roomName_1) {
        return __awaiter(this, arguments, void 0, function* (roomName, options = {}, rootSchema) {
            return yield this.createMatchMakeRequest('join', roomName, options, rootSchema);
        });
    }
    joinById(roomId_1) {
        return __awaiter(this, arguments, void 0, function* (roomId, options = {}, rootSchema) {
            return yield this.createMatchMakeRequest('joinById', roomId, options, rootSchema);
        });
    }
    /**
     * Re-establish connection with a room this client was previously connected to.
     *
     * @param reconnectionToken The `room.reconnectionToken` from previously connected room.
     * @param rootSchema (optional) Concrete root schema definition
     * @returns Promise<Room>
     */
    reconnect(reconnectionToken, rootSchema) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof (reconnectionToken) === "string" && typeof (rootSchema) === "string") {
                throw new Error("DEPRECATED: .reconnect() now only accepts 'reconnectionToken' as argument.\nYou can get this token from previously connected `room.reconnectionToken`");
            }
            const [roomId, token] = reconnectionToken.split(":");
            if (!roomId || !token) {
                throw new Error("Invalid reconnection token format.\nThe format should be roomId:reconnectionToken");
            }
            return yield this.createMatchMakeRequest('reconnect', roomId, { reconnectionToken: token }, rootSchema);
        });
    }
    consumeSeatReservation(response, rootSchema, reuseRoomInstance // used in devMode
    ) {
        return __awaiter(this, void 0, void 0, function* () {
            const room = this.createRoom(response.room.name, rootSchema);
            room.roomId = response.room.roomId;
            room.sessionId = response.sessionId;
            const options = { sessionId: room.sessionId };
            // forward "reconnection token" in case of reconnection.
            if (response.reconnectionToken) {
                options.reconnectionToken = response.reconnectionToken;
            }
            const targetRoom = reuseRoomInstance || room;
            room.connect(this.buildEndpoint(response.room, options, response.protocol), response.devMode && (() => __awaiter(this, void 0, void 0, function* () {
                console.info(`[Colyseus devMode]: ${String.fromCodePoint(0x1F504)} Re-establishing connection with room id '${room.roomId}'...`); // 🔄
                let retryCount = 0;
                let retryMaxRetries = 8;
                const retryReconnection = () => __awaiter(this, void 0, void 0, function* () {
                    retryCount++;
                    try {
                        yield this.consumeSeatReservation(response, rootSchema, targetRoom);
                        console.info(`[Colyseus devMode]: ${String.fromCodePoint(0x2705)} Successfully re-established connection with room '${room.roomId}'`); // ✅
                    }
                    catch (e) {
                        if (retryCount < retryMaxRetries) {
                            console.info(`[Colyseus devMode]: ${String.fromCodePoint(0x1F504)} retrying... (${retryCount} out of ${retryMaxRetries})`); // 🔄
                            setTimeout(retryReconnection, 2000);
                        }
                        else {
                            console.info(`[Colyseus devMode]: ${String.fromCodePoint(0x274C)} Failed to reconnect. Is your server running? Please check server logs.`); // ❌
                        }
                    }
                });
                setTimeout(retryReconnection, 2000);
            })), targetRoom, response, this.http.headers);
            return new Promise((resolve, reject) => {
                const onError = (code, message) => reject(new Errors_1.ServerError(code, message));
                targetRoom.onError.once(onError);
                targetRoom['onJoin'].once(() => {
                    targetRoom.onError.remove(onError);
                    resolve(targetRoom);
                });
            });
        });
    }
    createMatchMakeRequest(method_1, roomName_1) {
        return __awaiter(this, arguments, void 0, function* (method, roomName, options = {}, rootSchema, reuseRoomInstance) {
            const response = (yield this.http.post(`matchmake/${method}/${roomName}`, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(options)
            })).data;
            // FIXME: HTTP class is already handling this as ServerError.
            // @ts-ignore
            if (response.error) {
                throw new MatchMakeError(response.error, response.code);
            }
            // forward reconnection token during "reconnect" methods.
            if (method === "reconnect") {
                response.reconnectionToken = options.reconnectionToken;
            }
            return yield this.consumeSeatReservation(response, rootSchema, reuseRoomInstance);
        });
    }
    createRoom(roomName, rootSchema) {
        return new Room_1.Room(roomName, rootSchema);
    }
    buildEndpoint(room, options = {}, protocol = "ws") {
        let searchParams = this.settings.searchParams || "";
        // forward authentication token
        if (this.http.authToken) {
            options['_authToken'] = this.http.authToken;
        }
        // append provided options
        for (const name in options) {
            if (!options.hasOwnProperty(name)) {
                continue;
            }
            searchParams += (searchParams ? '&' : '') + `${name}=${options[name]}`;
        }
        if (protocol === "h3") {
            protocol = "http";
        }
        let endpoint = (this.settings.secure)
            ? `${protocol}s://`
            : `${protocol}://`;
        if (room.publicAddress) {
            endpoint += `${room.publicAddress}`;
        }
        else {
            endpoint += `${this.settings.hostname}${this.getEndpointPort()}${this.settings.pathname}`;
        }
        const endpointURL = `${endpoint}/${room.processId}/${room.roomId}?${searchParams}`;
        return (this.urlBuilder)
            ? this.urlBuilder((0, Room_1.splitURL)(endpointURL))
            : endpointURL;
    }
    getHttpEndpoint(segments = '') {
        const path = segments.startsWith("/") ? segments : `/${segments}`;
        let endpointURL = `${(this.settings.secure) ? "https" : "http"}://${this.settings.hostname}${this.getEndpointPort()}${this.settings.pathname}${path}`;
        if (this.settings.searchParams) {
            endpointURL += `?${this.settings.searchParams}`;
        }
        return (this.urlBuilder)
            ? this.urlBuilder((0, Room_1.splitURL)(endpointURL))
            : endpointURL;
    }
    getEndpointPort() {
        return (this.settings.port !== 80 && this.settings.port !== 443)
            ? `:${this.settings.port}`
            : "";
    }
}
exports.Client = Client;
Client.VERSION = process.env.VERSION;
//# sourceMappingURL=Client.js.map