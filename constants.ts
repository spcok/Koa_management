
import { Animal, AnimalCategory, LogType } from './types';

export const DEFAULT_FOOD_OPTIONS = {
  [AnimalCategory.OWLS]: ['Day Old Chick', 'Mouse', 'Rat', 'Quail', 'Rabbit'],
  [AnimalCategory.RAPTORS]: ['Day Old Chick', 'Mouse', 'Rat', 'Quail', 'Rabbit', 'Beef'],
  [AnimalCategory.MAMMALS]: ['Fruit Mix', 'Vegetables', 'Insects', 'Meat', 'Pellets', 'Egg'],
  [AnimalCategory.EXOTICS]: ['Mouse (Pinky)', 'Mouse (Fuzzie)', 'Rat', 'Insects', 'Salad'],
};

export const DEFAULT_FEED_METHODS = {
  [AnimalCategory.OWLS]: ['Hand', 'Tongs', 'Bowl', 'Scatter', 'Training', 'Plate'],
  [AnimalCategory.RAPTORS]: ['Hand', 'Tongs', 'Tethered', 'Plate'],
  [AnimalCategory.MAMMALS]: ['Bowl', 'Scatter', 'Hand', 'Hidden', 'Puzzle'],
  [AnimalCategory.EXOTICS]: ['Tongs', 'Bowl', 'Drop Feed'],
};

export const DEFAULT_ENRICHMENT_TYPES = [
    'Food - Scatter',
    'Food - Puzzle Feeder',
    'Food - Hidden',
    'Sensory - Scent',
    'Sensory - Sound',
    'Physical - Climbing',
    'Physical - Digging',
    'Physical - New Item',
    'Cognitive - Training',
    'Social - Group Interaction'
];

export const MOCK_ANIMALS: Animal[] = [
  {
    id: '1',
    name: 'Ghost',
    species: 'Barn Owl',
    latinName: 'Tyto alba',
    category: AnimalCategory.OWLS,
    dob: '2018-05-12',
    location: 'Aviary 1',
    description: 'A gentle male Barn Owl used frequently for school visits.',
    specialRequirements: 'Needs quiet environment during molt.',
    imageUrl: 'https://picsum.photos/seed/ghost/400/400',
    summerWeight: 310,
    winterWeight: 340,
    flyingWeight: 320,
    ringNumber: 'BTO-12345',
    logs: [
      { id: 'l1', date: '2023-10-25T09:00:00Z', type: LogType.WEIGHT, value: '325', timestamp: 1698224400000 },
      { id: 'l2', date: '2023-10-25T17:00:00Z', type: LogType.FEED, value: '2 Mice', feedMethod: 'Bowl', timestamp: 1698253200000 },
      { id: 'l3', date: '2023-10-24T09:00:00Z', type: LogType.WEIGHT, value: '322', timestamp: 1698138000000 },
    ],
    documents: []
  },
  {
    id: '2',
    name: 'Zeus',
    species: 'Golden Eagle',
    latinName: 'Aquila chrysaetos',
    category: AnimalCategory.RAPTORS,
    dob: '2015-03-20',
    location: 'Main Weathering',
    description: 'Large male Golden Eagle. Very dominant.',
    specialRequirements: 'Double tethering required.',
    imageUrl: 'https://picsum.photos/seed/zeus/400/400',
    summerWeight: 3800,
    winterWeight: 4200,
    flyingWeight: 3950,
    ringNumber: 'GE-9988',
    logs: [
      { id: 'l4', date: '2023-10-26T08:30:00Z', type: LogType.WEIGHT, value: '4050', timestamp: 1698309000000 },
      { id: 'l5', date: '2023-10-25T16:00:00Z', type: LogType.FEED, value: '1 Rabbit', feedMethod: 'Tongs', timestamp: 1698249600000 },
    ],
    documents: []
  },
  {
    id: '3',
    name: 'Timon',
    species: 'Meerkat',
    latinName: 'Suricata suricatta',
    category: AnimalCategory.MAMMALS,
    dob: '2019-01-10',
    location: 'Mammal Enclosure B',
    description: 'Alpha male of the mob.',
    specialRequirements: 'Heat lamp check daily.',
    imageUrl: 'https://picsum.photos/seed/timon/400/400',
    summerWeight: 720,
    winterWeight: 750,
    flyingWeight: 0,
    logs: [
      { id: 'l6', date: '2023-10-26T09:15:00Z', type: LogType.WEIGHT, value: '735', timestamp: 1698311700000 },
      { id: 'l7', date: '2023-10-26T12:00:00Z', type: LogType.HEALTH, value: 'Routine Check', notes: 'Teeth look good.', timestamp: 1698321600000 },
    ],
    documents: []
  },
  {
    id: '4',
    name: 'Slinky',
    species: 'Corn Snake',
    latinName: 'Pantherophis guttatus',
    category: AnimalCategory.EXOTICS,
    dob: '2020-07-22',
    location: 'Reptile Room',
    description: 'Orange albino corn snake.',
    specialRequirements: 'Feed separately from tank.',
    imageUrl: 'https://picsum.photos/seed/slinky/400/400',
    summerWeight: 450,
    winterWeight: 450,
    flyingWeight: 0,
    targetDayTemp: 28,
    targetNightTemp: 22,
    logs: [
        { id: 'l8', date: '2023-10-20T10:00:00Z', type: LogType.FEED, value: '1 Mouse', feedMethod: 'Tongs', timestamp: 1697796000000 },
    ],
    documents: []
  }
];
