
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Animal, AnimalCategory, LogType, LogEntry } from '../types';
import { Map, Plane, Thermometer, Wind, CloudSun, Download, Eye, X, Activity, Maximize2, AlertOctagon } from 'lucide-react';

// Declare Leaflet globally as it is loaded via CDN
declare global {
  interface Window {
    L: any;
  }
}

interface FlightRecordsProps {
  animals: Animal[];
}

interface GPSStats {
  maxSpeedKph: number;
  maxAltMeters: number;
  totalDistanceKm: number;
  durationSec: number;
  path: [number, number][]; // Lat, Lon
}

// Simple GPX Parser Helper
const parseGPX = (gpxContent: string): GPSStats | null => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxContent, "text/xml");
    const trkpts = xmlDoc.getElementsByTagName("trkpt");
    
    if (trkpts.length === 0) return null;

    const path: [number, number][] = [];
    let maxSpeed = 0;
    let maxAlt = 0;
    let totalDist = 0;
    let startTime = 0;
    let endTime = 0;

    for (let i = 0; i < trkpts.length; i++) {
        const pt = trkpts[i];
        const lat = parseFloat(pt.getAttribute("lat") || "0");
        const lon = parseFloat(pt.getAttribute("lon") || "0");
        const ele = parseFloat(pt.getElementsByTagName("ele")[0]?.textContent || "0");
        const timeStr = pt.getElementsByTagName("time")[0]?.textContent;
        const time = timeStr ? new Date(timeStr).getTime() : 0;

        path.push([lat, lon]);
        
        if (ele > maxAlt) maxAlt = ele;
        
        if (i === 0) startTime = time;
        if (i === trkpts.length - 1) endTime = time;

        if (i > 0) {
            const prevPt = trkpts[i-1];
            const prevLat = parseFloat(prevPt.getAttribute("lat") || "0");
            const prevLon = parseFloat(prevPt.getAttribute("lon") || "0");
            const prevTimeStr = prevPt.getElementsByTagName("time")[0]?.textContent;
            const prevTime = prevTimeStr ? new Date(prevTimeStr).getTime() : 0;

            // Haversine formula for distance
            const R = 6371e3; // metres
            const φ1 = prevLat * Math.PI/180;
            const φ2 = lat * Math.PI/180;
            const Δφ = (lat-prevLat) * Math.PI/180;
            const Δλ = (lon-prevLon) * Math.PI/180;

            const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                      Math.cos(φ1) * Math.cos(φ2) *
                      Math.sin(Δλ/2) * Math.sin(Δλ/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const d = R * c;

            totalDist += d;

            // Speed
            const timeDiff = (time - prevTime) / 1000; // seconds
            if (timeDiff > 0) {
                const speedMps = d / timeDiff;
                const speedKph = speedMps * 3.6;
                if (speedKph > maxSpeed && speedKph < 200) maxSpeed = speedKph; // Filter outliers
            }
        }
    }

    return {
        maxSpeedKph: parseFloat(maxSpeed.toFixed(1)),
        maxAltMeters: parseFloat(maxAlt.toFixed(1)),
        totalDistanceKm: parseFloat((totalDist / 1000).toFixed(2)),
        durationSec: (endTime - startTime) / 1000,
        path
    };
  } catch (e) {
    console.error("GPX Parsing Error", e);
    return null;
  }
};

const FlightRecords: React.FC<FlightRecordsProps> = ({ animals }) => {
  const [activeCategory, setActiveCategory] = useState<AnimalCategory>(AnimalCategory.OWLS);
  const [selectedLog, setSelectedLog] = useState<{log: LogEntry, animal: Animal, stats: GPSStats | null} | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);

  const filteredAnimals = useMemo(() => 
    animals.filter(a => a.category === activeCategory), 
  [animals, activeCategory]);

  const flightLogs = useMemo(() => {
      return filteredAnimals.flatMap(animal => 
          (animal.logs || [])
            .filter(l => l.type === LogType.FLIGHT)
            .map(log => ({ ...log, animal }))
      ).sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredAnimals]);

  const handleDownloadGps = (gpsData: string, filename: string) => {
      const blob = new Blob([gpsData], { type: 'text/xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleViewFlight = (log: LogEntry, animal: Animal) => {
      let stats = null;
      if (log.gpsUrl && log.gpsUrl.includes('data:')) {
          // Decode Data URL
          const base64 = log.gpsUrl.split(',')[1];
          if (base64) {
              try {
                  const decoded = atob(base64);
                  stats = parseGPX(decoded);
              } catch(e) {
                  console.error("Decode failed", e);
              }
          }
      } else if (log.gpsUrl) {
          // Assume raw string if not data url (fallback)
          stats = parseGPX(log.gpsUrl);
      }
      setSelectedLog({ log, animal, stats });
  };

  // Initialize Map when modal opens
  useEffect(() => {
      if (selectedLog && selectedLog.stats && mapRef.current && window.L) {
          if (leafletMap.current) {
              leafletMap.current.remove();
          }

          const map = window.L.map(mapRef.current);
          
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);

          if (selectedLog.stats.path.length > 0) {
              const polyline = window.L.polyline(selectedLog.stats.path, {color: '#059669', weight: 4}).addTo(map);
              map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
              
              // Start/End Markers
              window.L.circleMarker(selectedLog.stats.path[0], {color: 'green', radius: 6}).addTo(map).bindPopup("Start");
              window.L.circleMarker(selectedLog.stats.path[selectedLog.stats.path.length-1], {color: 'red', radius: 6}).addTo(map).bindPopup("End");
          }

          leafletMap.current = map;
      }
  }, [selectedLog]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
             <div>
                <h1 className="text-2xl md:text-3xl font-bold text-stone-800 flex items-center gap-3">
                    <Map className="text-emerald-600" /> Flight Records & GPS
                </h1>
                <p className="text-stone-500">Analyze flight performance and telemetry data.</p>
             </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {Object.values(AnimalCategory).map((cat) => (
                <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    activeCategory === cat
                    ? 'bg-stone-800 text-white'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
                >
                {cat}
                </button>
            ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
             <div className="overflow-x-auto">
                 <table className="w-full text-left">
                     <thead className="bg-stone-50 border-b border-stone-200">
                         <tr>
                             <th className="px-6 py-3 text-xs font-semibold text-stone-500 uppercase">Date</th>
                             <th className="px-6 py-3 text-xs font-semibold text-stone-500 uppercase">Animal</th>
                             <th className="px-6 py-3 text-xs font-semibold text-stone-500 uppercase">Duration & Quality</th>
                             <th className="px-6 py-3 text-xs font-semibold text-stone-500 uppercase">Conditions</th>
                             <th className="px-6 py-3 text-xs font-semibold text-stone-500 uppercase text-right">Actions</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-stone-100">
                         {flightLogs.map(log => (
                             <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                                 <td className="px-6 py-4 whitespace-nowrap">
                                     <div className="text-sm font-bold text-stone-800">{new Date(log.date).toLocaleDateString()}</div>
                                     <div className="text-xs text-stone-500">{new Date(log.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                 </td>
                                 <td className="px-6 py-4">
                                     <div className="flex items-center gap-3">
                                         <img src={log.animal.imageUrl} alt={log.animal.name} className="w-8 h-8 rounded-full object-cover border border-stone-200"/>
                                         <span className="font-medium text-stone-700">{log.animal.name}</span>
                                     </div>
                                 </td>
                                 <td className="px-6 py-4">
                                     <div className="text-sm text-stone-800">
                                         <span className="font-bold">{log.flightDuration}</span> mins
                                     </div>
                                     <div className={`text-xs inline-block px-1.5 rounded mt-1 font-medium ${
                                         log.flightQuality === 'Excellent' ? 'bg-emerald-100 text-emerald-700' :
                                         log.flightQuality === 'Poor' || log.flightQuality === 'Refusal' ? 'bg-red-100 text-red-700' :
                                         'bg-stone-100 text-stone-600'
                                     }`}>
                                         {log.flightQuality}
                                     </div>
                                 </td>
                                 <td className="px-6 py-4">
                                     <div className="flex flex-col gap-1 text-xs text-stone-600">
                                         {log.temperature && (
                                             <div className="flex items-center gap-1"><Thermometer size={12}/> {log.temperature}°C</div>
                                         )}
                                         {log.windSpeed && (
                                             <div className="flex items-center gap-1"><Wind size={12}/> {log.windSpeed} mph</div>
                                         )}
                                         {log.weatherDesc && (
                                             <div className="flex items-center gap-1"><CloudSun size={12}/> {log.weatherDesc}</div>
                                         )}
                                         {!log.temperature && !log.windSpeed && <span className="text-stone-400 italic">No Data</span>}
                                     </div>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                     <div className="flex justify-end gap-2">
                                        {log.gpsUrl && (
                                            <button 
                                                onClick={() => handleViewFlight(log, log.animal)}
                                                className="inline-flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-blue-200"
                                            >
                                                <Eye size={14} /> Analyze
                                            </button>
                                        )}
                                        {log.gpsUrl ? (
                                            <button 
                                                onClick={() => handleDownloadGps(log.gpsUrl!, `flight_${log.animal.name}_${log.date.split('T')[0]}.gpx`)}
                                                className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-emerald-200"
                                                title="Download GPX"
                                            >
                                                <Download size={14} />
                                            </button>
                                        ) : (
                                            <span className="text-xs text-stone-300 italic">No GPS</span>
                                        )}
                                     </div>
                                 </td>
                             </tr>
                         ))}
                         {flightLogs.length === 0 && (
                             <tr><td colSpan={5} className="py-12 text-center text-stone-400">No flight records found for this section.</td></tr>
                         )}
                     </tbody>
                 </table>
             </div>
        </div>

        {/* Flight Analysis Modal */}
        {selectedLog && (
            <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                                <Activity size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-stone-800">Flight Analysis</h2>
                                <p className="text-xs text-stone-500">{selectedLog.animal.name} • {new Date(selectedLog.log.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <button onClick={() => setSelectedLog(null)} className="text-stone-400 hover:text-stone-600 transition-colors p-2 hover:bg-stone-200 rounded-lg">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                        {/* Stats Panel */}
                        <div className="w-full md:w-1/3 bg-white border-r border-stone-200 p-6 overflow-y-auto">
                            <h3 className="font-bold text-stone-800 mb-4 text-sm uppercase tracking-wider">Telemetry Stats</h3>
                            
                            {selectedLog.stats ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                                            <p className="text-xs text-stone-500 uppercase font-bold mb-1">Max Speed</p>
                                            <p className="text-2xl font-black text-stone-800">{selectedLog.stats.maxSpeedKph} <span className="text-sm font-normal text-stone-500">km/h</span></p>
                                        </div>
                                        <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                                            <p className="text-xs text-stone-500 uppercase font-bold mb-1">Max Altitude</p>
                                            <p className="text-2xl font-black text-stone-800">{selectedLog.stats.maxAltMeters} <span className="text-sm font-normal text-stone-500">m</span></p>
                                        </div>
                                        <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                                            <p className="text-xs text-stone-500 uppercase font-bold mb-1">Distance</p>
                                            <p className="text-2xl font-black text-stone-800">{selectedLog.stats.totalDistanceKm} <span className="text-sm font-normal text-stone-500">km</span></p>
                                        </div>
                                        <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                                            <p className="text-xs text-stone-500 uppercase font-bold mb-1">Log Duration</p>
                                            <p className="text-2xl font-black text-stone-800">{Math.round(selectedLog.stats.durationSec / 60)} <span className="text-sm font-normal text-stone-500">min</span></p>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-stone-800 mb-2 text-xs uppercase">Flight Notes</h4>
                                        <p className="text-sm text-stone-600 bg-stone-50 p-3 rounded-lg border border-stone-100 italic">{selectedLog.log.notes || "No notes recorded."}</p>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-stone-800 mb-2 text-xs uppercase">Conditions</h4>
                                        <div className="flex gap-4 text-sm text-stone-600">
                                            <span className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full text-blue-700 border border-blue-100"><Wind size={14}/> {selectedLog.log.windSpeed || '-'} mph</span>
                                            <span className="flex items-center gap-1 bg-orange-50 px-3 py-1 rounded-full text-orange-700 border border-orange-100"><CloudSun size={14}/> {selectedLog.log.weatherDesc || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-stone-400">
                                    <AlertOctagon size={48} className="mx-auto mb-4 opacity-50"/>
                                    <p>Could not parse GPS data.</p>
                                    <p className="text-xs">Ensure the uploaded file is a valid GPX format.</p>
                                </div>
                            )}
                        </div>

                        {/* Map Panel */}
                        <div className="w-full md:w-2/3 bg-stone-100 relative">
                            {selectedLog.stats ? (
                                <div ref={mapRef} className="w-full h-full z-0" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-stone-400">
                                    Map Unavailable
                                </div>
                            )}
                            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded text-[10px] text-stone-500 border border-stone-200 z-10">
                                OpenStreetMap Data via Leaflet
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default FlightRecords;
