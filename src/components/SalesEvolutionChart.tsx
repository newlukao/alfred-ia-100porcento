import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface SalesEvolutionChartProps {
  data: { data: string; total: number }[];
}

const SalesEvolutionChart: React.FC<SalesEvolutionChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-muted-foreground text-center">Nenhum dado de evolução de vendas.</div>;
  }

  const chartData = {
    labels: data.map(item => item.data),
    datasets: [
      {
        label: 'Vendas',
        data: data.map(item => item.total),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.1)',
        tension: 0.3,
        pointRadius: 3,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: '#eee' } },
    },
  };

  return <Line data={chartData} options={options} height={220} />;
};

export default SalesEvolutionChart; 