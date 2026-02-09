import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import Dexie from 'dexie';

// Mocking global indexedDB for testing
global.indexedDB = indexedDB;
// Mocking global IDBKeyRange for testing
global.IDBKeyRange = IDBKeyRange;

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;
