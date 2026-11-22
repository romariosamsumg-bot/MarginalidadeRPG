import { ACT1_SCENES } from './act1';
import { ACT1B_SCENES } from './act1b';
import { ACT2_SCENES } from './act2';
import { BARKS } from './barks';
import type { Scene } from '../types';

export const SCENES: Scene[] = [...ACT1_SCENES, ...ACT1B_SCENES, ...ACT2_SCENES, ...BARKS];
export { CAMPAIGN, ALL_MISSIONS, missionById, currentObjective } from './campaign';
