import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Card, Loading, Badge } from '../../components/common';
import {
  Users,
  Shield,
  UserCircle,
  AlertTriangle,
  Trophy,
  Calendar,
  TrendingUp,
  Target,
  ChevronRight,
  Clock,
  Activity
} from 'lucide-react';
import { formatDate } from '../../utils/helpers';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const StatCard = ({ icon: Icon, label, value, color, subValue, to }) => {
  const content = (
    <Card className={`p-6 ${to ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
      <div className="flex items-center gap-4">
        <div className={`stat-icon ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
          {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
        </div>
        {to && <ChevronRight className="w-5 h-5 text-gray-400" />}
      </div>
    </Card>
  );

  return to ? <Link to={to}>{content}</Link> : content;
};

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: () => dashboardAPI.getAdminDashboard(),
    select: (res) => res.data.data,
  });

  if (isLoading) return <Loading />;
  if (error) return <div className="text-red-500">Error loading dashboard</div>;

  const { counts, matchStats, upcomingMatches, recentMatches, topScorers, positionDistribution, monthlyTrainingData } = data;

  // Chart data for match results
  const matchResultsData = {
    labels: [t('dashboard.wins'), t('dashboard.draws'), t('dashboard.losses')],
    datasets: [{
      data: [matchStats.wins, matchStats.draws, matchStats.losses],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      borderWidth: 0,
    }]
  };

  // Chart data for position distribution
  const positionData = {
    labels: positionDistribution.map(p => p._id),
    datasets: [{
      label: t('players.title'),
      data: positionDistribution.map(p => p.count),
      backgroundColor: '#3b82f6',
      borderRadius: 4,
    }]
  };

  // Chart data for monthly trainings
  const monthlyData = {
    labels: monthlyTrainingData.map(m => m._id),
    datasets: [{
      label: t('trainings.title'),
      data: monthlyTrainingData.map(m => m.count),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
    }]
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('dashboard.welcomeBack')}, {user?.firstName}!
          </h1>
          <p className="text-gray-500">{t('dashboard.overview')}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Shield}
          label={t('dashboard.totalTeams')}
          value={counts.totalTeams}
          color="bg-primary-500"
          subValue={`${counts.activeTeams} ${t('dashboard.activeTeams').toLowerCase()}`}
          to="/admin/teams"
        />
        <StatCard
          icon={Users}
          label={t('dashboard.totalPlayers')}
          value={counts.totalPlayers}
          color="bg-green-500"
          subValue={`${counts.activePlayers} ${t('dashboard.activePlayers').toLowerCase()}`}
          to="/admin/players"
        />
        <StatCard
          icon={UserCircle}
          label={t('dashboard.totalCoaches')}
          value={counts.totalCoaches}
          color="bg-blue-500"
          subValue={`${counts.totalCoaches} ${t('dashboard.totalCoaches').toLowerCase()}`}
          to="/admin/coaches"
        />
        <StatCard
          icon={AlertTriangle}
          label={t('dashboard.injuredPlayers')}
          value={counts.injuredPlayers}
          color="bg-red-500"
          subValue={`${counts.injuredPlayers} ${t('dashboard.injuredPlayers').toLowerCase()}`}
          to="/admin/players?isInjured=true"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Match Results Pie Chart */}
        <Card>
          <Card.Header className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{t('dashboard.matchStats')}</h3>
            <Link to="/admin/matches" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              {t('common.viewAll')} <ChevronRight className="w-4 h-4" />
            </Link>
          </Card.Header>
          <Card.Body>
            <div className="h-48">
              <Doughnut
                data={matchResultsData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    }
                  }
                }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 text-center">
              <div>
                <p className="text-lg font-bold text-green-600">{matchStats.wins}</p>
                <p className="text-xs text-gray-500">{t('dashboard.wins')}</p>
              </div>
              <div>
                <p className="text-lg font-bold text-yellow-600">{matchStats.draws}</p>
                <p className="text-xs text-gray-500">{t('dashboard.draws')}</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-600">{matchStats.losses}</p>
                <p className="text-xs text-gray-500">{t('dashboard.losses')}</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Position Distribution */}
        <Card>
          <Card.Header className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{t('players.position')}</h3>
            <Link to="/admin/players" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              {t('common.viewAll')} <ChevronRight className="w-4 h-4" />
            </Link>
          </Card.Header>
          <Card.Body>
            <div className="h-64">
              <Bar
                data={positionData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false }
                  },
                  scales: {
                    y: { beginAtZero: true }
                  }
                }}
              />
            </div>
          </Card.Body>
        </Card>

        {/* Training Trend */}
        <Card>
          <Card.Header className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{t('dashboard.trainingStats')}</h3>
            <Link to="/admin/trainings" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              {t('common.viewAll')} <ChevronRight className="w-4 h-4" />
            </Link>
          </Card.Header>
          <Card.Body>
            <div className="h-64">
              <Line
                data={monthlyData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false }
                  },
                  scales: {
                    y: { beginAtZero: true }
                  }
                }}
              />
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Matches */}
        <Card>
          <Card.Header className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500" />
              {t('dashboard.upcomingMatches')}
            </h3>
            <Link to="/admin/matches" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              {t('common.viewAll')} <ChevronRight className="w-4 h-4" />
            </Link>
          </Card.Header>
          <Card.Body className="p-0">
            {upcomingMatches.length === 0 ? (
              <p className="text-center text-gray-500 py-8">{t('common.noData')}</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {upcomingMatches.map((match) => (
                  <Link key={match._id} to="/admin/matches" className="block p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {match.team?.name} vs {match.opponent.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(match.matchDate)} - {match.kickoffTime}
                        </p>
                      </div>
                      <Badge variant="primary">{match.competition}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Recent Matches */}
        <Card>
          <Card.Header className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              {t('dashboard.recentMatches')}
            </h3>
            <Link to="/admin/matches" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              {t('common.viewAll')} <ChevronRight className="w-4 h-4" />
            </Link>
          </Card.Header>
          <Card.Body className="p-0">
            {recentMatches.length === 0 ? (
              <p className="text-center text-gray-500 py-8">{t('common.noData')}</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentMatches.map((match) => (
                  <Link key={match._id} to="/admin/matches" className="block p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">
                          vs {match.opponent.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {match.team?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          {match.score.home} - {match.score.away}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(match.matchDate)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Top Scorers */}
        <Card>
          <Card.Header className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-green-500" />
              {t('dashboard.topScorers')}
            </h3>
            <Link to="/admin/statistics" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              {t('common.viewAll')} <ChevronRight className="w-4 h-4" />
            </Link>
          </Card.Header>
          <Card.Body className="p-0">
            {topScorers.length === 0 ? (
              <p className="text-center text-gray-500 py-8">{t('common.noData')}</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {topScorers.slice(0, 5).map((player, index) => (
                  <Link key={player._id} to="/admin/players" className="p-4 hover:bg-gray-50 flex items-center gap-4 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {player.firstName} {player.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{player.team?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary-600">
                        {player.statistics.goals}
                      </p>
                      <p className="text-xs text-gray-500">{t('players.goals')}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
