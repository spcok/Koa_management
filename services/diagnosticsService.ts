
import { Animal, Task, User } from '../types';

export interface DiagnosticIssue {
  id: string;
  timestamp: number;
  severity: 'Critical' | 'Warning' | 'Info';
  category: 'Database' | 'Network' | 'System' | 'Security' | 'Logic' | 'Performance';
  message: string;
  remediation?: string;
}

export const diagnosticsService = {
  /**
   * Runs a comprehensive health check on the database data structures.
   * Validates schema integrity, referential integrity, and logical consistency.
   */
  runDatabaseHealthCheck: (animals: Animal[], tasks: Task[], users: User[]): DiagnosticIssue[] => {
    const issues: DiagnosticIssue[] = [];
    const timestamp = Date.now();

    // 1. ANIMAL SCHEMA VALIDATION
    animals.forEach(a => {
      // Critical: Primary Key Integrity
      if (!a.id) {
          issues.push({
              id: `schema_missing_id_${Math.random().toString(36).substr(2, 9)}`,
              timestamp,
              severity: 'Critical',
              category: 'Database',
              message: `Animal record detected with missing 'id' field.`,
              remediation: 'Database corruption likely. Manual row deletion required via Supabase dashboard.'
          });
      }

      // Critical: Name Field (Required for UI)
      if (!a.name || a.name.trim() === '') {
          issues.push({
              id: `schema_missing_name_${a.id}`,
              timestamp,
              severity: 'Critical',
              category: 'Database',
              message: `Animal record (ID: ${a.id}) is missing required field 'name'.`,
              remediation: 'Edit animal profile to assign a valid call name.'
          });
      }

      // Critical: Species Field (Required for AI & Statutory Reporting)
      if (!a.species || a.species === 'Unknown' || a.species.trim() === '') {
        issues.push({
          id: `integrity_species_${a.id}`,
          timestamp,
          severity: 'Critical',
          category: 'Database',
          message: `Animal "${a.name || 'ID ' + a.id}" has undefined or invalid 'species'.`,
          remediation: 'Update animal record with correct species taxonomy.'
        });
      }
      
      // Warning: Future Dating in Logs
      const futureLogs = (a.logs || []).filter(l => new Date(l.date).getTime() > Date.now() + 86400000); // +24h buffer
      if (futureLogs.length > 0) {
         issues.push({
          id: `logic_future_logs_${a.id}`,
          timestamp,
          severity: 'Warning',
          category: 'Logic',
          message: `Animal "${a.name}" has ${futureLogs.length} logs with future dates.`,
          remediation: 'Verify server time and check log entry timestamps.'
        });
      }
    });

    // 2. REFERENTIAL INTEGRITY (Orphaned Tasks)
    const animalIds = new Set(animals.map(a => a.id));
    tasks.forEach(t => {
      if (t.animalId && !animalIds.has(t.animalId)) {
        issues.push({
          id: `orphan_task_${t.id}`,
          timestamp,
          severity: 'Warning',
          category: 'Database',
          message: `Task "${t.title}" references non-existent Animal ID: ${t.animalId}`,
          remediation: 'Delete task or reassign to valid animal.'
        });
      }
    });

    // 3. SECURITY INTEGRITY (Admin Existence)
    const admins = users.filter(u => u.role === 'Admin');
    if (admins.length === 0 && users.length > 0) {
       issues.push({
          id: `security_no_admin`,
          timestamp,
          severity: 'Critical',
          category: 'Security',
          message: `No active Administrators found in User Registry.`,
          remediation: 'Elevate a user to Admin immediately to prevent system lockout.'
       });
    }

    return issues;
  }
};
