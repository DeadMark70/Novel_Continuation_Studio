import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import Dexie from 'dexie';

// @ts-ignore
global.indexedDB = indexedDB;
// @ts-ignore
global.IDBKeyRange = IDBKeyRange;

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;
