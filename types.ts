
export type SortOption = 'custom' | 'alpha-asc' | 'alpha-desc';

export enum AnimalCategory {
  OWLS = 'Owls',
  RAPTORS = 'Raptors',
  MAMMALS = 'Mammals',
  EXOTICS = 'Exotics',
}

export enum ConservationStatus {
  LC = 'Least Concern',
  NT = 'Near Threatened',
  VU = 'Vulnerable',
  EN = 'Endangered',
  CR = 'Critically Endangered',
  EW = 'Extinct in the Wild',
  EX = 'Extinct',
  DD = 'Data Deficient',
  NE = 'Not Evaluated',
  NC = 'Not Checked'
}

export enum HazardRating {
  HIGH = 'HIGH RISK',
  MEDIUM = 'MEDIUM RISK',
  LOW = 'LOW RISK',
  NONE = 'NO RISK'
}

export enum LogType {
  WEIGHT = 'Weight',
  FEED = 'Feed',
  TRAINING = 'Training',
  EVENT = 'Event',
  HEALTH = 'Health',
  FLIGHT = 'Flight',
  TEMPERATURE = 'Temperature',
  MAINTENANCE = 'Maintenance',
  MISTING = 'Misting',
  WATER = 'Water Check',
  ADMIN = 'Admin',
  GENERAL = 'General',
  INCIDENT = 'Incident',
  MOVEMENT = 'Movement',
  ENRICHMENT = 'Enrichment',
  DRILL = 'Safety Drill',
  WEATHERING = 'Weathering'
}

export interface UserPermissions {
  dashboard: boolean;
  dailyLog: boolean;
  tasks: boolean;
  medical: boolean;
  movements: boolean;
  safety: boolean; 
  maintenance: boolean;
  reports: boolean;
  settings: boolean;
  flightRecords: boolean;
  feedingSchedule: boolean;
  attendance: boolean;
  attendanceManager: boolean;
  missingRecords: boolean;
}

export enum HealthRecordType {
  OBSERVATION = 'Observation',
  EXAMINATION = 'Examination',
  VET_VISIT = 'Vet Visit',
  MEDICATION = 'Medication',
  INCOMING = 'Incoming Animal',
  QUARANTINE = 'Quarantine Check',
  RELEASE = 'Release Check',
  BEHAVIOUR = 'Behavioural',
  PARASITOLOGY = 'Parasitology',
  PATHOLOGY = 'Pathology',
  OTHER = 'Other'
}

export enum HealthCondition {
  HEALTHY = 'Healthy',
  MONITORING = 'Monitoring',
  UNDER_TREATMENT = 'Under Treatment',
  CRITICAL = 'Critical',
  DECEASED = 'Deceased',
}

export enum IncidentType {
  MISSING = 'Missing Animal',
  DECEASED = 'Deceased',
  INJURY = 'Injury',
  SECURITY = 'Security Breach',
  EQUIPMENT = 'Equipment Failure',
  OTHER = 'Other'
}

export enum IncidentSeverity {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export enum UserRole {
  ADMIN = 'Admin',
  VOLUNTEER = 'Volunteer'
}

export enum DocumentType {
  LEGAL = 'Legal / CITES',
  MEDICAL = 'Medical / Vet Report',
  IDENTIFICATION = 'ID / Passport',
  OTHER = 'Other',
  INSTITUTIONAL = 'Institutional License'
}

/* Added GlobalDocument interface */
export interface GlobalDocument {
  id: string;
  name: string;
  url: string;
  expiryDate?: string;
  uploadDate: string;
  category: 'Licensing' | 'Insurance' | 'Protocol' | 'Safety';
  notes?: string;
}

/* Added AuditLogEntry interface */
export interface AuditLogEntry {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  severity: 'Info' | 'Warning' | 'Critical';
}

/* Added AnimalDocument interface */
export interface AnimalDocument {
  id: string;
  name: string;
  type: DocumentType;
  url: string;
  uploadDate: string;
  uploadedBy: string;
  notes?: string;
}

/* Added UserPreferences interface */
export interface UserPreferences {
  dashboardOrder?: string[];
  darkMode?: boolean;
}

export interface User {
  id: string;
  name: string;
  jobPosition: string;
  initials: string;
  role: UserRole;
  pin: string;
  active: boolean;
  signature?: string; 
  preferences?: UserPreferences;
  permissions: UserPermissions;
}

/* Added Contact interface */
export interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface OrganizationProfile {
  name: string;
  address: string;
  licenseNumber: string;
  licenseExpiryDate?: string;
  issuingAuthority?: string;
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl?: string;
  adoptionUrl?: string;
}

/* Added Task interface */
export interface Task {
  id: string;
  animalId?: string;
  type: LogType;
  subtype?: string;
  title: string;
  dueDate: string;
  completed: boolean;
  recurring: boolean;
  frequencyDays?: number;
  notes?: string;
  assignedTo?: string;
}

/* Added Incident interface */
export interface Incident {
  id: string;
  date: string;
  time: string;
  type: IncidentType;
  animalId?: string;
  description: string;
  location: string;
  severity: IncidentSeverity;
  status: 'Open' | 'Resolved' | 'Closed';
  reportedBy: string;
  actionsTaken?: string;
  timestamp: number;
}

/* Added FirstAidLogEntry interface */
export interface FirstAidLogEntry {
  id: string;
  date: string;
  time: string;
  personName: string;
  type: 'Injury' | 'Illness' | 'Near Miss';
  description: string;
  treatment: string;
  treatedBy: string;
  location: string;
  outcome: 'Returned to Work' | 'Sent Home' | 'Hospital' | 'Ambulance Called' | 'None';
  timestamp: number;
}

/* Added TimeLogEntry interface */
export interface TimeLogEntry {
  id: string;
  userId: string;
  userName: string;
  startTime: number;
  endTime?: number;
  durationMinutes?: number;
  date: string;
  status: 'Active' | 'Completed';
}

/* Updated LogEntry with missing properties identified from error reports */
export interface LogEntry {
  id: string;
  date: string;
  type: LogType;
  value: string;
  notes?: string;
  timestamp: number;
  userInitials?: string;
  attachmentUrl?: string;
  weightGrams?: number;
  feedMethod?: string;
  healthType?: HealthRecordType;
  condition?: HealthCondition;
  bcs?: number;
  featherCondition?: string;
  medicationName?: string;
  medicationBatch?: string;
  medicationDosage?: string;
  medicationRoute?: string;
  medicationFrequency?: string;
  medicationEndDate?: string;
  prescribedBy?: string;
  sampleType?: string;
  labResult?: string;
  causeOfDeath?: string;
  disposalMethod?: string;
  postMortemResults?: string;
  trainingGoal?: string;
  trainingSteps?: string;
  trainingFollowUp?: string;
  flightDuration?: number;
  flightQuality?: string;
  gpsUrl?: string;
  weatherDesc?: string;
  windSpeed?: number;
  eventName?: string;
  eventLocation?: string;
  eventPerformance?: string;
  temperature?: number;
  baskingTemp?: number;
  coolTemp?: number;
  movementType?: 'Acquisition' | 'Disposition' | 'Transfer';
  movementSource?: string;
  movementDestination?: string;
  enrichmentType?: string;
  enrichmentRating?: number;
  drillType?: 'Fire' | 'Escape' | 'Intruder' | 'Other';
  drillParticipants?: string;
  drillDuration?: number;
  weatheringStart?: string;
  weatheringEnd?: string;
  hasCast?: boolean;
  bodyPart?: string;
  bodyMapCoords?: {x: number, y: number};
}

/* Added SiteLogEntry interface */
export interface SiteLogEntry {
  id: string;
  date: string;
  title: string;
  description: string;
  location: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
  loggedBy: string;
  cost?: number;
  timestamp: number;
}

/* Updated Animal with missing properties identified from constants.ts and AnimalFormModal.tsx */
export interface Animal {
  id: string;
  name: string;
  species: string;
  latinName?: string;
  category: AnimalCategory;
  dob: string;
  location: string;
  description?: string;
  specialRequirements?: string;
  imageUrl: string;
  distributionMapUrl?: string;
  summerWeight?: number;
  winterWeight?: number;
  flyingWeight?: number;
  weightUnit?: 'g' | 'oz' | 'lbs_oz';
  ringNumber?: string;
  logs: LogEntry[];
  documents: AnimalDocument[];
  archived?: boolean;
  archiveReason?: string;
  order?: number;
  isQuarantine?: boolean;
  quarantineStartDate?: string;
  quarantineDuration?: number;
  quarantineReason?: string;
  microchip?: string;
  arrivalDate?: string;
  origin?: string;
  sire?: string;
  dam?: string;
  sex?: 'Male' | 'Female' | 'Unknown' | 'N/A';
  hazardRating?: HazardRating;
  isVenomous?: boolean;
  isHazardous?: boolean;
  isDobUnknown?: boolean;
  redListStatus?: ConservationStatus;
  targetDayTemp?: number;
  targetNightTemp?: number;
  targetBaskingTemp?: number;
  targetCoolTemp?: number;
  targetHumidity?: number;
  mistingFrequency?: string;
  waterType?: string;
  hasNoId?: boolean;
}

export interface SystemState {
  animals: Animal[];
}
