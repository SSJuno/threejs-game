import { buildArena } from './arena.js';
import { buildFantasyCrystallineArena } from './maps/fantasyCrystallineArena.js';

// Easy to add more maps here in the future
export const availableMaps = [
  {
    name: 'Ruins',
    builder: buildArena,
  },
  {
    name: 'Fantasy',
    builder: buildFantasyCrystallineArena,
  },
];
