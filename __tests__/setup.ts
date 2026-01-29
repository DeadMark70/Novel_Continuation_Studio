import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import Dexie from 'dexie';

// Mocking global indexedDB for testing
// @ts-ignore: indexedDB might be read-only in some environments
global.indexedDB = indexedDB;
// Mocking global IDBKeyRange for testing
// @ts-ignore: IDBKeyRange might be read-only in some environments
global.IDBKeyRange = IDBKeyRange;

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;
