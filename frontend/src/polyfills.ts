/***************************************************************************************************
 * Polyfills for NodeJS globals needed by crypto, jwt, buffer, etc. in the browser.
 ***************************************************************************************************/
(window as any).global = window;
(window as any).process = { env: { NODE_ENV: 'development' } };

import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;
