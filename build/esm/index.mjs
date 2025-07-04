// colyseus.js@0.17.2
import './legacy.mjs';
export { Client, MatchMakeError } from './Client.mjs';
export { ErrorCode, Protocol } from './Protocol.mjs';
export { Room } from './Room.mjs';
export { Auth } from './Auth.mjs';
export { ServerError } from './errors/Errors.mjs';
import { SchemaSerializer } from './serializer/SchemaSerializer.mjs';
export { getStateCallbacks } from './serializer/SchemaSerializer.mjs';
import { NoneSerializer } from './serializer/NoneSerializer.mjs';
import { registerSerializer } from './serializer/Serializer.mjs';

/// <reference path="../wx-typings/index.d.ts" />
registerSerializer('schema', SchemaSerializer);
registerSerializer('none', NoneSerializer);

export { SchemaSerializer, registerSerializer };
//# sourceMappingURL=index.mjs.map
