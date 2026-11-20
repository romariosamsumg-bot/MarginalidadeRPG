import { ACT1_SCENES } from './act1';
import { BARKS } from './barks';
import type { Scene } from '../types';

export const SCENES: Scene[] = [...ACT1_SCENES, ...BARKS];
export { CAMPAIGN, ALL_MISSIONS, missionById, currentObjective } from './campaign';
