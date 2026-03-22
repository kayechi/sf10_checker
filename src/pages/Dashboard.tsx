import { useEffect, useState } from "react";
import { api, DashboardStats } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [year, setYear] = useState<number | undefined>(undefined);
  const [years, setYears] = useState<number[]>([]);

  useEffect(() => {
    api.getFilterOptions().then(res => setYears(res.years)).catch(console.error);
  }, []);

  useEffect(() => {
    api.getDashboardStats(year).then(setStats).catch(console.error);
  }, [year]);

  if (!stats) return <div className="p-8 flex items-center justify-center text-neutral-500 h-full w-full">Loading dashboard...</div>;

  const data = stats.programs.map(p => ({
    name: p.program,
    Passed: p.passed,
    "Not Passed": p.failed
  }));

  const overallData = [
    { name: "Overall", Passed: stats.passed, "Not Passed": stats.failed }
  ];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
        <select 
          className="px-4 py-2 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow w-48 font-medium"
          value={year || ""}
          onChange={(e) => setYear(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">All Years</option>
          {years.map(y => (
             <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-neutral-950 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 flex flex-col">
          <h3 className="font-semibold text-neutral-500 mb-2">Total Students</h3>
          <p className="text-4xl font-bold">{stats.passed + stats.failed}</p>
        </div>
        <div className="p-6 bg-white dark:bg-neutral-950 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 flex flex-col">
          <h3 className="font-semibold text-neutral-500 mb-2">Total Passed SF10</h3>
          <p className="text-4xl font-bold text-green-600 dark:text-green-500">{stats.passed}</p>
        </div>
        <div className="p-6 bg-white dark:bg-neutral-950 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 flex flex-col">
          <h3 className="font-semibold text-neutral-500 mb-2">Total Not Passed</h3>
          <p className="text-4xl font-bold text-red-600 dark:text-red-500">{stats.failed}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[300px]">
        <div className="p-6 bg-white dark:bg-neutral-950 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 flex flex-col items-center">
          <h3 className="font-semibold mb-6 w-full text-left">Overall Ratio</h3>
          <div className="flex-1 w-full min-h-[200px]">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overallData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)'}} />
                <Legend iconType="circle" />
                <Bar dataKey="Passed" fill="#10b981" radius={[6, 6, 0, 0]} barSize={60} />
                <Bar dataKey="Not Passed" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="lg:col-span-2 p-6 bg-white dark:bg-neutral-950 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 flex flex-col">
          <h3 className="font-semibold w-full text-left mb-6">By Program/Course</h3>
          <div className="flex-1 w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)'}} />
                <Legend iconType="circle" />
                <Bar dataKey="Passed" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Not Passed" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
