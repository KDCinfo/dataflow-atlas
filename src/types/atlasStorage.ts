/**
 * Atlas Storage Data Structure Types
 */

import { DFACard } from './dfa';

export interface AtlasMetadata {
  created: string;
  lastModified: string;
  cardCount: number;
  hasBackup: boolean;
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
  hasBackup: boolean;
  isActive: boolean;
}
