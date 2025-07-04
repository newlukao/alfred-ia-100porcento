import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface SalesByPlanChartProps {
  data: { plano: string; total: number }[];
}

const SalesByPlanChart: React.FC<SalesByPlanChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-muted-foreground text-center">Nenhum dado de venda por plano.</div>;
  }

  const chartData = {
    labels: data.map(item => item.plano),
    datasets: [
      {
        label: 'Vendas',
        data: data.map(item => item.total),
        backgroundColor: [
          '#FFD700', // ouro
          '#CD7F32', // bronze
          '#A9A9A9', // trial
          '#888',    // outros
        ],
        borderRadius: 6,
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

  return <Bar data={chartData} options={options} height={220} />;
};

export default SalesByPlanChart; 