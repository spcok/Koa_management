
import React, { useState } from 'react';
import { 
  HelpCircle, FileText, Wifi, AlertTriangle, Database, Smartphone, Printer, 
  ChevronDown, ChevronUp, Wrench, ShieldCheck, User as UserIcon, Activity, 
  Settings, Clock, Scale, Utensils 
} from 'lucide-react';
import { User, UserRole } from '../types';

interface HelpCenterProps {
  currentUser: User | null;
}

const HelpCenter: React.FC<HelpCenterProps> = ({ currentUser }) => {
  const [openSection, setOpenSection] = useState<string | null>('general');

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isVolunteer = currentUser?.role === UserRole.VOLUNTEER;

  const toggle = (id: string) => setOpenSection(openSection === id ? null : id);

  const Section = ({ id, title, icon: Icon, color = "bg-slate-100 text-slate-500", children }: any) => (
    <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all duration-300">
      <button 
        onClick={() => toggle(id)}
        className={`w-full flex items-center justify-between p-5 text-left transition-colors ${openSection === id ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${openSection === id ? 'bg-emerald-100 text-emerald-700' : color}`}>
            <Icon size={24} />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
        </div>
        {openSection === id ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
      </button>
      {openSection === id && (
        <div className="p-6 border-t-2 border-slate-100 animate-in slide-in-from-top-2">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
        <div className="p-4 bg-emerald-600 rounded-2xl shadow-lg text-white">
          <HelpCircle size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Help & Support</h1>
          <p className="text-slate-500 font-medium">
            Welcome, {currentUser?.name}. 
            {isAdmin ? ' Accessing Administrator Knowledge Base.' : ' Accessing Volunteer Guide.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        
        {/* --- SECTION 1: ESSENTIALS (EVERYONE) --- */}
        <Section id="general" title="System Essentials" icon={Smartphone} color="bg-blue-50 text-blue-600">
          <div className="space-y-6 prose prose-slate max-w-none text-sm text-slate-600">
            <div>
                <h4 className="font-bold text-slate-800 text-base mb-2">Navigation Overview</h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <li className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="font-black text-slate-700 block mb-1">Dashboard</span>
                        Your home screen. Shows today's tasks, feeding stats, and quick links.
                    </li>
                    <li className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="font-black text-slate-700 block mb-1">Daily Log</span>
                        The main area for recording weights, feeds, and routine checks.
                    </li>
                    <li className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="font-black text-slate-700 block mb-1">Tasks</span>
                        Your specific To-Do list. Items assigned to you appear here.
                    </li>
                    <li className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="font-black text-slate-700 block mb-1">Medical</span>
                        View health records. <em>Note: Only Admins can edit historical medical logs.</em>
                    </li>
                </ul>
            </div>
            <div>
                <h4 className="font-bold text-slate-800 text-base mb-2 flex items-center gap-2"><Clock size={16}/> Clocking In & Out</h4>
                <p>Use the buttons at the bottom of the sidebar (desktop) or menu (mobile) to log your hours. This is mandatory for insurance and fire safety purposes.</p>
            </div>
          </div>
        </Section>

        {/* --- SECTION 2: VOLUNTEER SPECIFIC --- */}
        <Section id="husbandry" title="Husbandry Protocols" icon={Scale} color="bg-emerald-50 text-emerald-600">
          <div className="space-y-6 text-sm text-slate-600">
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                <h4 className="font-bold text-emerald-800 text-base mb-2">Logging Daily Weights</h4>
                <ol className="list-decimal list-inside space-y-2 ml-1">
                    <li>Navigate to <strong>Daily Log</strong>.</li>
                    <li>Ensure the correct <strong>Category</strong> (e.g., Owls, Raptors) is selected.</li>
                    <li>Tap the <strong>Weight</strong> cell next to the animal's name.</li>
                    <li>Enter the weight. The system accepts Grams (g), Ounces (oz), or Lbs/Oz depending on the bird settings.</li>
                    <li>Click <strong>Save Entry</strong>.</li>
                </ol>
            </div>

            <div>
                <h4 className="font-bold text-slate-800 text-base mb-2">Feeding Logs</h4>
                <p className="mb-2">Always record food <strong>after</strong> the animal has eaten or when food is put in the enclosure (for overnight feeds).</p>
                <ul className="list-disc list-inside space-y-1 ml-1">
                    <li><strong>Raptors:</strong> Record quantity and type (e.g., "1 Chick"). Note if casting has occurred.</li>
                    <li><strong>Mammals:</strong> You can add multiple items (e.g., "Bowl of Veg" + "2 Eggs").</li>
                    <li><strong>Exotics:</strong> Record misting and water changes using the quick-tap icons in the Daily Log.</li>
                </ul>
            </div>
          </div>
        </Section>

        <Section id="safety" title="Health & Safety" icon={ShieldCheck} color="bg-rose-50 text-rose-600">
             <div className="space-y-4 text-sm text-slate-600">
                <p className="font-medium">All staff must adhere to site safety protocols.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border-l-4 border-rose-500 pl-4 py-1">
                        <h5 className="font-bold text-slate-900">Incident Reporting</h5>
                        <p className="text-xs mt-1">If you witness an accident, escape, or near-miss, immediately inform a Duty Manager. You can log it in the <strong>Incidents</strong> tab if authorized.</p>
                    </div>
                    <div className="border-l-4 border-amber-500 pl-4 py-1">
                        <h5 className="font-bold text-slate-900">Hazardous Animals</h5>
                        <p className="text-xs mt-1">Animals marked with <span className="font-black text-rose-600">HIGH RISK</span> or <span className="font-black text-rose-600">VENOMOUS</span> badges require senior staff supervision.</p>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
                    <h5 className="font-bold text-slate-800 mb-2">First Aid</h5>
                    <p>First aid kits are located in the Prep Room and Office. All injuries, however minor, must be recorded in the <strong>Health & Safety Log</strong>.</p>
                </div>
             </div>
        </Section>

        {/* --- SECTION 3: ADMIN ONLY --- */}
        {isAdmin && (
            <>
                <Section id="admin_compliance" title="Administrator: Compliance" icon={FileText} color="bg-purple-50 text-purple-600">
                    <div className="space-y-6 text-sm text-slate-600">
                        <p className="font-medium text-purple-800 bg-purple-50 p-3 rounded-lg border border-purple-100 inline-block">
                            Guides for Zoo Licensing Act 1981 (Section 9) Compliance.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-bold text-slate-900 mb-2">Stock Movements</h4>
                                <p className="mb-2">Use the <strong>Stock Movements</strong> tab for all acquisitions, dispositions, and transfers.</p>
                                <ul className="list-disc list-inside text-xs space-y-1">
                                    <li><strong>Acquisition:</strong> Animals entering the collection. Requires Origin.</li>
                                    <li><strong>Disposition:</strong> Animals leaving (Death, Sale, Transfer out).</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 mb-2">Annual Audits</h4>
                                <p className="mb-2">Go to <strong>Reports</strong> and select "Annual Audit".</p>
                                <p className="text-xs">This auto-calculates opening/closing stock based on movement logs. Ensure all movement logs are up to date before generating.</p>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4">
                            <h4 className="font-bold text-slate-900 mb-2">Medical Records & Deceased Protocols</h4>
                            <p>To mark an animal as deceased:</p>
                            <ol className="list-decimal list-inside ml-2 mt-1 space-y-1">
                                <li>Go to <strong>Medical Centre</strong>.</li>
                                <li>Click <strong>New Record</strong> (or use the modal in Animal Profile).</li>
                                <li>Select Condition: <strong>Deceased</strong>.</li>
                                <li>You MUST provide <strong>Cause of Death</strong> and <strong>Disposal Method</strong>.</li>
                                <li>This will automatically Archive the animal and update the stock ledger.</li>
                            </ol>
                        </div>
                    </div>
                </Section>

                <Section id="admin_system" title="Administrator: System Config" icon={Settings} color="bg-slate-800 text-white">
                    <div className="space-y-6 text-sm text-slate-600">
                        <div>
                            <h4 className="font-bold text-slate-900 mb-2">Managing Users</h4>
                            <p>Go to <strong>Settings {'>'} Access Control</strong>.</p>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li><strong>Add User:</strong> Create new logins. Set a 4-digit PIN.</li>
                                <li><strong>Permissions:</strong> Use presets (Volunteer, Keeper, Curator) to quickly assign rights.</li>
                                <li><strong>Suspension:</strong> Toggle "Active" to false to prevent login without deleting history.</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-900 mb-2">Data Integrity & Backup</h4>
                            <p>Go to <strong>Settings {'>'} Data Integrity</strong>.</p>
                            <div className="flex gap-4 mt-2">
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex-1">
                                    <span className="font-black block mb-1">Export Database</span>
                                    Downloads a JSON file. Do this weekly and store off-site.
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex-1">
                                    <span className="font-black block mb-1">Sync Engine</span>
                                    Forces an AI refresh of IUCN statuses and Latin names.
                                </div>
                            </div>
                        </div>
                    </div>
                </Section>
            </>
        )}

        {/* --- SECTION 4: TROUBLESHOOTING (EVERYONE) --- */}
        <Section id="troubleshoot" title="Troubleshooting" icon={Wrench} color="bg-orange-50 text-orange-600">
          <div className="space-y-6 text-sm text-slate-600">
            <div>
              <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><Wifi size={16} className="text-slate-400"/> Offline Mode</h4>
              <p>The app is designed to work offline (PWA). If you lose internet connection:</p>
              <ul className="list-disc list-inside ml-2 mt-1">
                  <li>Continue logging as normal.</li>
                  <li>Do not clear your browser cache while offline.</li>
                  <li>Data will sync to the database automatically when connection is restored.</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><Activity size={16} className="text-slate-400"/> Performance Issues</h4>
              <p>If the app feels slow or charts aren't loading:</p>
              <ol className="list-decimal list-inside ml-2 mt-1">
                  <li>Ensure you are using <strong>Chrome</strong> (Android/PC) or <strong>Safari</strong> (iOS).</li>
                  <li>Refresh the page (Pull down or click Refresh).</li>
                  <li>If on mobile, close the app completely and reopen it.</li>
              </ol>
            </div>
            <div>
                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><Database size={16} className="text-slate-400"/> Missing Data?</h4>
                <p>If you cannot see an animal or log:</p>
                <ul className="list-disc list-inside ml-2 mt-1">
                    <li>Check if the animal has been <strong>Archived</strong> (Settings/Admin only).</li>
                    <li>Check the <strong>Date Picker</strong> on the Dashboard/Daily Log to ensure you are viewing the correct day.</li>
                </ul>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
};

export default HelpCenter;
