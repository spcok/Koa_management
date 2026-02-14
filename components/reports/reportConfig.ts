import { LogType, HealthRecordType, IncidentType } from '../../types';

export interface Column {
  label: string;
  width: string; // Percentage e.g. "15%"
  accessor: string;
}

export interface ReportSchema {
  id: string;
  title: string;
  columns: Column[];
}

export const REPORT_SCHEMAS: Record<string, ReportSchema> = {
  DAILY_LOG: {
    id: 'DAILY_LOG',
    title: 'Daily Husbandry Ledger',
    columns: [
      { label: 'Time', width: '15%', accessor: 'time' },
      { label: 'Subject', width: '20%', accessor: 'subject' },
      { label: 'Type', width: '15%', accessor: 'type' },
      { label: 'Entry / Value', width: '40%', accessor: 'value' },
      { label: 'Staff', width: '10%', accessor: 'initials' }
    ]
  },
  STOCK_LIST: {
    id: 'STOCK_LIST',
    title: 'Section 9 Stock Inventory',
    columns: [
      { label: 'ID / Ring', width: '15%', accessor: 'id' },
      { label: 'Common Name', width: '20%', accessor: 'name' },
      { label: 'Scientific', width: '20%', accessor: 'latin' },
      { label: 'Sex', width: '10%', accessor: 'sex' },
      { label: 'Age', width: '10%', accessor: 'age' },
      { label: 'Origin', width: '15%', accessor: 'origin' },
      { label: 'Arrival', width: '10%', accessor: 'arrival' }
    ]
  },
  CENSUS: {
    id: 'CENSUS',
    title: 'Collection Census Summary',
    columns: [
      { label: 'Species', width: '30%', accessor: 'species' },
      { label: 'Scientific', width: '30%', accessor: 'latin' },
      { label: 'Male', width: '10%', accessor: 'male' },
      { label: 'Female', width: '10%', accessor: 'female' },
      { label: 'Unknown', width: '10%', accessor: 'unknown' },
      { label: 'Total', width: '10%', accessor: 'total' }
    ]
  },
  WEIGHTS: {
    id: 'WEIGHTS',
    title: 'Biometric Weight Matrix',
    columns: [
      { label: 'Date', width: '15%', accessor: 'date' },
      { label: 'Subject', width: '25%', accessor: 'subject' },
      { label: 'Prev', width: '15%', accessor: 'prev' },
      { label: 'Curr', width: '15%', accessor: 'curr' },
      { label: 'Diff', width: '15%', accessor: 'diff' },
      { label: 'Staff', width: '15%', accessor: 'initials' }
    ]
  },
  CLINICAL: {
    id: 'CLINICAL',
    title: 'Clinical Patient File',
    columns: [
      { label: 'Date', width: '15%', accessor: 'date' },
      { label: 'Subject', width: '20%', accessor: 'subject' },
      { label: 'Symptom', width: '20%', accessor: 'symptom' },
      { label: 'Treatment', width: '25%', accessor: 'treatment' },
      { label: 'Vet', width: '10%', accessor: 'vet' },
      { label: 'Follow-up', width: '10%', accessor: 'follow' }
    ]
  },
  INCIDENTS: {
    id: 'INCIDENTS',
    title: 'Statutory Incident Registry',
    columns: [
      { label: 'Date', width: '15%', accessor: 'date' },
      { label: 'Location', width: '20%', accessor: 'location' },
      { label: 'Category', width: '15%', accessor: 'category' },
      { label: 'Narrative', width: '30%', accessor: 'description' },
      { label: 'Action', width: '10%', accessor: 'action' },
      { label: 'Officer', width: '10%', accessor: 'initials' }
    ]
  },
  SAFETY: {
    id: 'SAFETY',
    title: 'H&S Drill Audit',
    columns: [
      { label: 'Date', width: '15%', accessor: 'date' },
      { label: 'Area', width: '20%', accessor: 'area' },
      { label: 'Hazard', width: '25%', accessor: 'hazard' },
      { label: 'Risk', width: '10%', accessor: 'risk' },
      { label: 'Resolution', width: '20%', accessor: 'action' },
      { label: 'Status', width: '10%', accessor: 'status' }
    ]
  },
  MAINTENANCE: {
    id: 'MAINTENANCE',
    title: 'Infrastructure Maintenance Log',
    columns: [
      { label: 'Date', width: '15%', accessor: 'date' },
      { label: 'Asset', width: '20%', accessor: 'asset' },
      { label: 'Task', width: '25%', accessor: 'task' },
      { label: 'Materials', width: '20%', accessor: 'materials' },
      { label: 'Staff', width: '10%', accessor: 'staff' },
      { label: 'Status', width: '10%', accessor: 'status' }
    ]
  },
  MOVEMENTS: {
    id: 'MOVEMENTS',
    title: 'Stock Movement Ledger',
    columns: [
      { label: 'Date', width: '15%', accessor: 'date' },
      { label: 'Subject', width: '20%', accessor: 'subject' },
      { label: 'Type', width: '15%', accessor: 'type' },
      { label: 'From / To Vector', width: '30%', accessor: 'vector' },
      { label: 'Auth', width: '20%', accessor: 'auth' }
    ]
  },
  TODO: {
    id: 'TODO',
    title: 'Duty Rota Checksheet',
    columns: [
      { label: 'Prio', width: '10%', accessor: 'priority' },
      { label: 'Task Description', width: '40%', accessor: 'task' },
      { label: 'Assigned', width: '15%', accessor: 'assigned' },
      { label: 'Date', width: '15%', accessor: 'date' },
      { label: 'Due', width: '15%', accessor: 'due' },
      { label: 'Check', width: '5%', accessor: 'check' }
    ]
  }
};