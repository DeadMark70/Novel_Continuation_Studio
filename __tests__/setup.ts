import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import Dexie from 'dexie';

// Mocking global indexedDB for testing
// @ts-ignore
global.indexedDB = indexedDB;
// Mocking global IDBKeyRange for testing
// @ts-ignore
global.IDBKeyRange = IDBKeyRange;

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;