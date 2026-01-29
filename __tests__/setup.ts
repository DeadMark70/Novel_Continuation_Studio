import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import Dexie from 'dexie';

// @ts-expect-error: Mocking global indexedDB for testing
global.indexedDB = indexedDB;
// @ts-expect-error: Mocking global IDBKeyRange for testing
global.IDBKeyRange = IDBKeyRange;

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;
