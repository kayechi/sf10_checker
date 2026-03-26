import { useEffect, useState } from "react";
import { usePersistentState } from "../hooks/usePersistentState";
import { api, DashboardStats } from "../lib/api";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface EnrollmentBreakdown {
  enrolledWithSF10: number;
  enrolledWithoutSF10: number;
  notEnrolledWithSF10: number;
  notEnrolledWithoutSF10: number;
}

const COLORS = {
  enrolledWithSF10: "#10b981",
  enrolledWithoutSF10: "#3b82f6",
  notEnrolledWithSF10: "#f59e0b",
  notEnrolledWithoutSF10: "#ef4444",
};

const COLORS_ARRAY = [
  COLORS.enrolledWithSF10,
  COLORS.enrolledWithoutSF10,
  COLORS.notEnrolledWithSF10,
  COLORS.notEnrolledWithoutSF10,
];

export default function Dashboard() {
  const [overallStats, setOverallStats] = useState<DashboardStats | null>(null);
  const [breakdown, setBreakdown] = useState<EnrollmentBreakdown | null>(null);
  const [year, setYear] = usePersistentState<number | undefined>(
    "dashboardYear",
    undefined,
  );
  const [years, setYears] = useState<number[]>([]);

  useEffect(() => {
    api
      .getFilterOptions()
      .then((res) => setYears(res.years))
      .catch(console.error);
  }, []);

  useEffect(() => {
    Promise.all([
      api.getDashboardStats(year, undefined),
      api.getDashboardStats(year, true),
      api.getDashboardStats(year, false),
    ])
      .then(([overall, enrolled, notEnrolled]) => {
        setOverallStats(overall);

        const breakdown: EnrollmentBreakdown = {
          enrolledWithSF10: enrolled.passed,
          enrolledWithoutSF10: enrolled.failed,
          notEnrolledWithSF10: notEnrolled.passed,
          notEnrolledWithoutSF10: notEnrolled.failed,
        };
        setBreakdown(breakdown);
      })
      .catch(console.error);
  }, [year]);

  if (!overallStats || !breakdown)
    return (
      <div className="p-8 flex items-center justify-center text-neutral-500 h-full w-full">
        Loading dashboard...
      </div>
    );

  const programData = overallStats.programs.map((p) => ({
    name: p.program,
    "Passed SF10": p.passed,
    "Not Passed SF10": p.failed,
  }));

  const enrollmentData = [
    { name: "Enrolled with SF10", value: breakdown.enrolledWithSF10 },
    { name: "Enrolled without SF10", value: breakdown.enrolledWithoutSF10 },
    { name: "Not Enrolled with SF10", value: breakdown.notEnrolledWithSF10 },
    {
      name: "Not Enrolled without SF10",
      value: breakdown.notEnrolledWithoutSF10,
    },
  ];

  const totalStudents = Object.values(breakdown).reduce(
    (sum, val) => sum + val,
    0,
  );

  const renderEnrollmentLabel = ({ value }: { value: number }) => {
    if (value === 0) return "";
    const percent = ((value / totalStudents) * 100).toFixed(0);
    return `${percent}%`;
  };

  const renderSF10Label = (value: number | undefined, totalSF10: number) => {
    if (!value || value === 0) return "";
    const percent = ((value / totalSF10) * 100).toFixed(0);
    return `${percent}%`;
  };

  const totalSF10 = overallStats.passed + overallStats.failed;

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          Dashboard Overview
        </h2>
        <select
          className="px-4 py-2 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow w-48 font-medium"
          value={year || ""}
          onChange={(e) =>
            setYear(e.target.value ? Number(e.target.value) : undefined)
          }
        >
          <option value="">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 bg-white dark:bg-neutral-950 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800">
          <h3 className="font-medium text-sm text-neutral-500 mb-2">
            Total Students
          </h3>
          <p className="text-3xl font-bold">{totalStudents}</p>
        </div>
        <div className="p-5 bg-white dark:bg-neutral-950 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800">
          <h3 className="font-medium text-sm text-neutral-500 mb-2">
            Enrolled + SF10
          </h3>
          <p
            className="text-3xl font-bold"
            style={{ color: COLORS.enrolledWithSF10 }}
          >
            {breakdown.enrolledWithSF10}
          </p>
        </div>
        <div className="p-5 bg-white dark:bg-neutral-950 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800">
          <h3 className="font-medium text-sm text-neutral-500 mb-2">
            Enrolled - SF10
          </h3>
          <p
            className="text-3xl font-bold"
            style={{ color: COLORS.enrolledWithoutSF10 }}
          >
            {breakdown.enrolledWithoutSF10}
          </p>
        </div>
        <div className="p-5 bg-white dark:bg-neutral-950 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800">
          <h3 className="font-medium text-sm text-neutral-500 mb-2">
            Not Enrolled + SF10
          </h3>
          <p
            className="text-3xl font-bold"
            style={{ color: COLORS.notEnrolledWithSF10 }}
          >
            {breakdown.notEnrolledWithSF10}
          </p>
        </div>
        <div className="p-5 bg-white dark:bg-neutral-950 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800">
          <h3 className="font-medium text-sm text-neutral-500 mb-2">
            Not Enrolled - SF10
          </h3>
          <p
            className="text-3xl font-bold"
            style={{ color: COLORS.notEnrolledWithoutSF10 }}
          >
            {breakdown.notEnrolledWithoutSF10}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        {/* Enrollment Distribution Pie Chart */}
        <div className="p-6 bg-white dark:bg-neutral-950 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 flex flex-col">
          <h3 className="font-semibold mb-6 text-lg">
            Enrollment Distribution
          </h3>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={enrollmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderEnrollmentLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {enrollmentData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS_ARRAY[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value) => `${value} students`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS.enrolledWithSF10 }}
                />
                <span>Enrolled with SF10</span>
              </div>
              <span className="font-semibold">
                {breakdown.enrolledWithSF10}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS.enrolledWithoutSF10 }}
                />
                <span>Enrolled without SF10</span>
              </div>
              <span className="font-semibold">
                {breakdown.enrolledWithoutSF10}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS.notEnrolledWithSF10 }}
                />
                <span>Not Enrolled with SF10</span>
              </div>
              <span className="font-semibold">
                {breakdown.notEnrolledWithSF10}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS.notEnrolledWithoutSF10 }}
                />
                <span>Not Enrolled without SF10</span>
              </div>
              <span className="font-semibold">
                {breakdown.notEnrolledWithoutSF10}
              </span>
            </div>
          </div>
        </div>

        {/* SF10 Status Distribution Pie Chart */}
        <div className="p-6 bg-white dark:bg-neutral-950 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 flex flex-col">
          <h3 className="font-semibold mb-6 text-lg">
            SF10 Status Distribution
          </h3>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Passed SF10", value: overallStats.passed },
                    { name: "Not Passed SF10", value: overallStats.failed },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ value }) => renderSF10Label(value, totalSF10)}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill={COLORS.enrolledWithSF10} />
                  <Cell fill={COLORS.notEnrolledWithoutSF10} />
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value) => `${value} students`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS.enrolledWithSF10 }}
                />
                <span>Passed SF10</span>
              </div>
              <span className="font-semibold">{overallStats.passed}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS.notEnrolledWithoutSF10 }}
                />
                <span>Not Passed SF10</span>
              </div>
              <span className="font-semibold">{overallStats.failed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* By Program Chart */}
      <div className="p-6 bg-white dark:bg-neutral-950 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 flex flex-col flex-1">
        <h3 className="font-semibold mb-6 text-lg">By Program/Course</h3>
        <div className="flex-1 w-full min-h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={programData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e5e5e5"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.02)" }}
                contentStyle={{
                  borderRadius: "16px",
                  border: "none",
                  boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)",
                }}
              />
              <Legend iconType="circle" />
              <Bar
                dataKey="Passed SF10"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="Not Passed SF10"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
