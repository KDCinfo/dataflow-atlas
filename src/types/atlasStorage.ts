/**
 * Atlas Storage Data Structure Types
 */

import { DFACard } from './dfa';

export interface AtlasMetadata {
  created: string;
  lastModified: string;
  cardCount: number;
  // The '_backup'  storage entry could be deleted manually, making this potentially invalid.
  // hasBackup: boolean;
}

export interface AtlasStorageData {
  cards: DFACard[];
  metadata: AtlasMetadata;
}

export interface AtlasInfo {
  name: string;
  cardCount: number;
  created: string;
  lastModified: string;
  // This 'hasBackup' can be derived.
  hasBackup: boolean;
  isActive: boolean;
}
