
import React, { useEffect, useState } from 'react';
import { getFullWeather, FullWeatherData } from '../services/weatherService';
import { CloudSun, Wind, Droplets, MapPin, CloudRain, Sun, Cloud, CloudLightning, Snowflake, Navigation, RefreshCw, ExternalLink } from 'lucide-react';

const WeatherView: React.FC = () => {
  const [data, setData] = useState<FullWeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  // Default Location (Kent, UK)
  const LAT = 51.2787;
  const LON = 0.5217;

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      // 1. Fetch Weather Data (Open-Meteo is reliable for numbers)
      const weather = await getFullWeather();
      setData(weather);
      if (weather && weather.daily.length > 0) {
          setSelectedDate(weather.daily[0].date);
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  const getWindDirection = (degrees: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  const WeatherIcon = ({ code, size = 24, className = "" }: { code: number, size?: number, className?: string }) => {
     if (code === 0) return <Sun size={size} className={`text-yellow-400 ${className}`} fill="currentColor" />;
     if (code <= 3) return <CloudSun size={size} className={`text-stone-400 ${className}`} />;
     if (code <= 48) return <Cloud size={size} className={`text-stone-400 ${className}`} fill="currentColor" />;
     if (code <= 67) return <CloudRain size={size} className={`text-blue-300 ${className}`} />;
     if (code <= 77) return <Snowflake size={size} className={`text-cyan-200 ${className}`} />;
     if (code <= 82) return <CloudRain size={size} className={`text-blue-400 ${className}`} fill="currentColor" />;
     if (code <= 99) return <CloudLightning size={size} className={`text-purple-400 ${className}`} />;
     return <Cloud size={size} className={`text-stone-400 ${className}`} />;
  };

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-96 text-stone-400 gap-3">
            <RefreshCw size={48} className="animate-spin opacity-50" />
            <p className="font-medium animate-pulse">Calibrating instruments...</p>
        </div>
    );
  }

  if (!data) return <div className="p-12 text-center text-slate-500">Weather service unavailable. Check connection.</div>;

  const { current, daily, hourly } = data;
  const selectedHourly = hourly.filter(h => h.time.startsWith(selectedDate));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 border-b border-stone-200 pb-4">
        <div>
           <h1 className="text-2xl md:text-3xl font-bold text-stone-800 flex items-center gap-3">
             <CloudSun className="text-emerald-600" /> Weather & Telemetry
           </h1>
           <p className="text-stone-500 text-sm mt-1 border-l-2 border-emerald-500 pl-3">Microclimate monitoring & flight planning.</p>
        </div>
        <div className="text-right">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Station ID: KOA-01</p>
            <p className="text-stone-700 font-mono text-sm">{new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 1. CURRENT CONDITIONS (Compact) */}
          <div className="lg:col-span-1 bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[350px]">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-[80px] -mr-12 -mt-12 rounded-full"></div>
              
              <div>
                  <div className="flex items-center gap-2 mb-4 opacity-70">
                      <MapPin size={12} className="text-emerald-400"/> 
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Conditions</span>
                  </div>
                  
                  <div className="flex items-start justify-between">
                      <div>
                          <h1 className="text-7xl font-black tracking-tighter tabular-nums">{Math.round(current.temperature)}°</h1>
                          <p className="text-lg font-bold text-emerald-400 uppercase tracking-tight">{current.description}</p>
                      </div>
                      <WeatherIcon code={current.weatherCode} size={64} className="filter drop-shadow-lg" />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-8">
                  <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                      <div className="flex items-center gap-2 text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">
                          <Wind size={12} className="text-blue-400"/> Wind
                      </div>
                      <p className="text-2xl font-black">{current.windSpeed} <span className="text-[10px] font-bold opacity-50">mph</span></p>
                      <p className="text-[10px] font-bold text-slate-300">{getWindDirection(current.windDirection)}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                      <div className="flex items-center gap-2 text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">
                          <Droplets size={12} className="text-cyan-400"/> Humidity
                      </div>
                      <p className="text-2xl font-black">{current.humidity}<span className="text-[10px] font-bold opacity-50">%</span></p>
                      <p className="text-[10px] font-bold text-slate-300">Dew Pt: {Math.round(current.temperature - ((100 - current.humidity)/5))}°</p>
                  </div>
              </div>
          </div>

          {/* 2. VENTUSKY MAP EMBED */}
          <div className="lg:col-span-2 bg-slate-900 rounded-[2rem] overflow-hidden relative shadow-xl border border-slate-800 min-h-[350px] flex flex-col">
              <div className="flex-1 relative w-full h-full bg-slate-800">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.ventusky.com/?p=${LAT};${LON};9&l=radar`}
                    title="Ventusky Weather Map"
                    className="w-full h-full absolute inset-0"
                    loading="lazy"
                  ></iframe>
                  
                  {/* Overlay Badges */}
                  <div className="absolute top-4 left-4 pointer-events-none flex gap-2">
                      <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 flex items-center gap-2 shadow-lg">
                          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">Live Radar</span>
                      </div>
                  </div>

                  <div className="absolute bottom-4 right-4 pointer-events-auto">
                      <a href="https://www.ventusky.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full text-[9px] font-bold text-white/90 hover:bg-black/80 transition-colors">
                          <ExternalLink size={10}/> Ventusky
                      </a>
                  </div>
              </div>
          </div>
      </div>

      {/* 3. HOURLY FORECAST - WIND & FLIGHT FOCUS */}
      <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm overflow-hidden p-6">
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Wind size={16} className="text-emerald-600"/> Hourly Flight Forecast
              </h2>
              
              {/* Day Selector */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {daily.slice(0, 5).map(day => (
                      <button 
                        key={day.date}
                        onClick={() => setSelectedDate(day.date)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                            day.date === selectedDate 
                            ? 'bg-slate-900 text-white border-slate-900' 
                            : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-400'
                        }`}
                      >
                          {new Date(day.date).toLocaleDateString('en-GB', {weekday: 'short'})}
                      </button>
                  ))}
              </div>
          </div>

          <div className="overflow-x-auto pb-4 scrollbar-thin">
              <div className="min-w-max">
                  {/* Grid Header */}
                  <div className="grid grid-cols-[80px_repeat(24,minmax(60px,1fr))] gap-2 mb-2">
                      <div className="sticky left-0 bg-white z-10 flex flex-col justify-end pb-2 pr-4 border-r border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase text-right block mb-3">Time</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase text-right block mb-3">Cond</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase text-right block mb-3">Temp</span>
                          <span className="text-[9px] font-black text-blue-500 uppercase text-right block mb-3">Wind</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase text-right block">Gusts</span>
                      </div>
                      
                      {/* Hourly Columns */}
                      {selectedHourly.map((hour, idx) => (
                          <div key={hour.time} className="flex flex-col items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group">
                              {/* Time */}
                              <span className="text-[10px] font-black text-slate-600">
                                  {new Date(hour.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                              
                              {/* Icon */}
                              <WeatherIcon code={hour.weatherCode} size={20} />
                              
                              {/* Temp */}
                              <span className="text-xs font-bold text-slate-800">{Math.round(hour.temp)}°</span>
                              
                              {/* Wind (Speed + Direction) */}
                              <div className="flex flex-col items-center gap-1">
                                  <div 
                                    className="bg-blue-50 w-8 h-8 rounded-full flex items-center justify-center border border-blue-100 group-hover:border-blue-300 group-hover:bg-white transition-all"
                                    title={`${getWindDirection(hour.windDirection)}`}
                                  >
                                      <Navigation 
                                        size={14} 
                                        style={{transform: `rotate(${hour.windDirection}deg)`}} 
                                        className="text-blue-500"
                                      />
                                  </div>
                                  <span className="text-[10px] font-black text-blue-600">{Math.round(hour.windSpeed)}</span>
                              </div>

                              {/* Gusts (Estimated) */}
                              <span className="text-[9px] font-bold text-slate-400">
                                  {Math.round(hour.windSpeed * 1.3)}
                              </span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>

      {/* 4. 7-DAY OUTLOOK SUMMARY */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {daily.map((day, idx) => (
              <div key={day.date} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center gap-2 hover:border-emerald-400 transition-all group">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-emerald-600">
                      {new Date(day.date).toLocaleDateString('en-GB', {weekday: 'short'})}
                  </span>
                  <WeatherIcon code={day.weatherCode} size={24} />
                  <div className="flex gap-2 text-xs font-bold text-slate-700">
                      <span>{Math.round(day.maxTemp)}°</span>
                      <span className="opacity-40">{Math.round(day.minTemp)}°</span>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};

export default WeatherView;
