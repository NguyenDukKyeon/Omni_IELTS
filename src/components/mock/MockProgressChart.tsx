import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { MockResult } from '../../types';
import { TrendingUp, Award, Target, CheckCircle } from 'lucide-react';

interface MockProgressChartProps {
  mockResults: MockResult[];
  targetBand: number;
}

export const MockProgressChart: React.FC<MockProgressChartProps> = ({
  mockResults,
  targetBand = 7.5,
}) => {
  if (!mockResults || mockResults.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <TrendingUp className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
        <p className="text-sm font-medium">Chưa có dữ liệu thi thử để biểu diễn biểu đồ tiến độ.</p>
        <p className="text-xs text-slate-400 mt-1">Hoàn thành bài thi thử đầu tiên để xem phân tích chi tiết!</p>
      </div>
    );
  }

  // Format data sorted by date
  const chartData = [...mockResults]
    .sort((a, b) => new Date(a.completedDate).getTime() - new Date(b.completedDate).getTime())
    .map((res, index) => ({
      name: `Đề ${index + 1} (${res.completedDate.slice(5)})`,
      overall: res.overallBand,
      listening: res.listeningBand,
      reading: res.readingBand,
      writing: res.writingBand,
      speaking: res.speakingBand,
      title: res.testTitle,
    }));

  const latestResult = mockResults[mockResults.length - 1];

  const skillComparisonData = [
    { skill: 'Listening', band: latestResult.listeningBand, fill: '#0284c7' },
    { skill: 'Reading', band: latestResult.readingBand, fill: '#059669' },
    { skill: 'Writing', band: latestResult.writingBand, fill: '#d97706' },
    { skill: 'Speaking', band: latestResult.speakingBand, fill: '#9333ea' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Band Progression Time-Series Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Biểu đồ Tiến trình Điểm số IELTS theo Thời gian
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Theo dõi sự phát triển của cả 4 kỹ năng qua các đợt thi thử chính thức
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 px-3 py-1.5 rounded-lg text-blue-700 dark:text-blue-300 font-medium">
            <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Mục tiêu: Band {targetBand.toFixed(1)}</span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis domain={[4.0, 9.0]} ticks={[4, 5, 6, 7, 8, 9]} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <ReferenceLine
                y={targetBand}
                label={{ value: `Mục tiêu Band ${targetBand}`, fill: '#f59e0b', fontSize: 10, position: 'top' }}
                stroke="#f59e0b"
                strokeDasharray="4 4"
              />
              <Line
                type="monotone"
                dataKey="overall"
                name="Overall Band"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 5, fill: '#2563eb' }}
                activeDot={{ r: 7 }}
              />
              <Line
                type="monotone"
                dataKey="listening"
                name="Listening"
                stroke="#0284c7"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
              <Line
                type="monotone"
                dataKey="reading"
                name="Reading"
                stroke="#059669"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
              <Line
                type="monotone"
                dataKey="writing"
                name="Writing"
                stroke="#d97706"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
              <Line
                type="monotone"
                dataKey="speaking"
                name="Speaking"
                stroke="#9333ea"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Latest Test 4-Skill Balance Bar Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Cân bằng 4 Kỹ năng (Bài thi gần nhất: {latestResult.testTitle})
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Độ chênh lệch giữa các kỹ năng và khoảng cách tới mục tiêu
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
            Overall: {latestResult.overallBand.toFixed(1)}
          </span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={skillComparisonData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94a3b8" opacity={0.2} />
              <XAxis type="number" domain={[0, 9]} ticks={[0, 2, 4, 6, 7, 8, 9]} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis dataKey="skill" type="category" tick={{ fontSize: 12, fill: '#64748b' }} width={70} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <ReferenceLine x={targetBand} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Target', fill: '#f59e0b', fontSize: 10 }} />
              <Bar dataKey="band" name="Band Score" radius={[0, 8, 8, 0]} barSize={18}>
                {skillComparisonData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
