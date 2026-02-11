import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Card, Loading, Badge, Avatar } from '../../components/common';
import {
  Users,
  Calendar,
  Trophy,
  AlertTriangle,
  TrendingUp,
  Target,
  Clock,
  ChevronRight,
  BarChart3,
  Activity
} from 'lucide-react';
import { formatDate, getFormBadge, getPositionColor } from '../../utils/helpers';

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

const CoachDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['coachDashboard'],
    queryFn: () => dashboardAPI.getCoachDashboard(),
    select: (res) => res.data.data,
  });

  if (isLoading) return <Loading />;

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {error.response?.data?.message || 'Error loading dashboard'}
        </h2>
        <p className="text-gray-500">
          {user?.team ? 'Please try again later.' : 'You are not assigned to any team yet.'}
        </p>
      </div>
    );
  }

  const { team, counts, players, trainingStats, recentTrainings, upcomingMatches, recentMatches, topScorers, recentForm } = data;

  return (
    <div className="space-y-6">
      {/* Team Header */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: team?.primaryColor || '#1e40af' }}
            >
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{team?.name}</h1>
              <p className="text-gray-500">{team?.ageCategory} ({team?.birthYear})</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{t('dashboard.recentForm')}:</span>
            {recentForm.map((result, i) => {
              const badge = getFormBadge(result);
              return (
                <span
                  key={i}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${badge.bg} ${badge.text}`}
                >
                  {result}
                </span>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label={t('dashboard.totalPlayers')}
          value={counts.totalPlayers}
          color="bg-primary-500"
          subValue={`${counts.availablePlayers} ${t('players.available').toLowerCase()}`}
          to="/coach/players"
        />
        <StatCard
          icon={AlertTriangle}
          label={t('dashboard.injuredPlayers')}
          value={counts.injuredPlayers}
          color="bg-red-500"
          to="/coach/players?isInjured=true"
        />
        <StatCard
          icon={TrendingUp}
          label={t('dashboard.averageAttendance')}
          value={`${trainingStats.averageAttendance}%`}
          color="bg-green-500"
          subValue={`${trainingStats.totalLast30Days} ${t('trainings.title').toLowerCase()}`}
          to="/coach/trainings"
        />
        <StatCard
          icon={BarChart3}
          label={t('nav.statistics')}
          value={topScorers?.[0]?.statistics?.goals || 0}
          color="bg-yellow-500"
          subValue={t('dashboard.topScorer')}
          to="/coach/statistics"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Matches */}
        <Card>
          <Card.Header className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500" />
              {t('dashboard.upcomingMatches')}
            </h3>
            <Link to="/coach/matches" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              {t('common.viewAll')} <ChevronRight className="w-4 h-4" />
            </Link>
          </Card.Header>
          <Card.Body className="p-0">
            {upcomingMatches.length === 0 ? (
              <p className="text-center text-gray-500 py-8">{t('common.noData')}</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {upcomingMatches.map((match) => (
                  <Link
                    key={match._id}
                    to="/coach/matches"
                    className="block p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          vs {match.opponent?.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(match.matchDate)} - {match.kickoffTime}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{match.venue}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={match.isHome ? 'success' : 'secondary'}>
                          {match.isHome ? t('matches.home') : t('matches.away')}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">{match.competition}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Recent Trainings */}
        <Card>
          <Card.Header className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-500" />
              {t('dashboard.recentTrainings')}
            </h3>
            <Link to="/coach/trainings" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              {t('common.viewAll')} <ChevronRight className="w-4 h-4" />
            </Link>
          </Card.Header>
          <Card.Body className="p-0">
            {recentTrainings.length === 0 ? (
              <p className="text-center text-gray-500 py-8">{t('common.noData')}</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentTrainings.map((training) => (
                  <Link
                    key={training._id}
                    to="/coach/trainings"
                    className="block p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">
                          {t(`trainings.types.${training.type}`)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(training.date)} | {training.startTime}-{training.endTime}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          (training.attendanceStats?.percentage || 0) >= 80 ? 'text-green-600' :
                          (training.attendanceStats?.percentage || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {training.attendanceStats?.percentage || 0}%
                        </p>
                        <p className="text-xs text-gray-500">{t('trainings.attendance')}</p>
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
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-yellow-500" />
              {t('dashboard.topScorers')}
            </h3>
            <Link to="/coach/statistics" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              {t('common.viewAll')} <ChevronRight className="w-4 h-4" />
            </Link>
          </Card.Header>
          <Card.Body className="p-0">
            {topScorers.length === 0 ? (
              <p className="text-center text-gray-500 py-8">{t('common.noData')}</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {topScorers.map((player, index) => (
                  <Link
                    key={player._id}
                    to="/coach/players"
                    className="p-4 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                  >
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-400 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {index + 1}
                    </span>
                    <Avatar
                      src={player.photo}
                      firstName={player.firstName}
                      lastName={player.lastName}
                      size="small"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {player.firstName} {player.lastName}
                      </p>
                      <p className="text-xs text-gray-500">#{player.jerseyNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {player.statistics?.goals || 0}
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

      {/* Recent Match Results */}
      {recentMatches?.length > 0 && (
        <Card>
          <Card.Header className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-500" />
              {t('dashboard.recentResults')}
            </h3>
            <Link to="/coach/matches" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              {t('common.viewAll')} <ChevronRight className="w-4 h-4" />
            </Link>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="divide-y divide-gray-100">
              {recentMatches.slice(0, 5).map((match) => {
                const ourScore = match.isHome ? (match.score?.home || 0) : (match.score?.away || 0);
                const theirScore = match.isHome ? (match.score?.away || 0) : (match.score?.home || 0);
                const result = ourScore > theirScore ? 'W' : ourScore < theirScore ? 'L' : 'D';
                const resultColor = result === 'W' ? 'bg-green-500' : result === 'L' ? 'bg-red-500' : 'bg-yellow-500';

                return (
                  <Link
                    key={match._id}
                    to="/coach/matches"
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${resultColor}`}>
                      {result}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        vs {match.opponent?.name}
                      </p>
                      <p className="text-sm text-gray-500">{formatDate(match.matchDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">
                        {ourScore} - {theirScore}
                      </p>
                      <p className="text-xs text-gray-500">{match.competition}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Players Grid */}
      <Card>
        <Card.Header className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            {t('players.title')}
          </h3>
          <Link to="/coach/players" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            {t('common.viewAll')} <ChevronRight className="w-4 h-4" />
          </Link>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {players.slice(0, 12).map((player) => (
              <Link
                key={player._id}
                to="/coach/players"
                className={`text-center p-4 rounded-lg border transition-all hover:shadow-md ${
                  player.isInjured ? 'border-red-200 bg-red-50' : 'border-gray-100 hover:bg-gray-50'
                }`}
              >
                <Avatar
                  src={player.photo}
                  firstName={player.firstName}
                  lastName={player.lastName}
                  size="large"
                  className="mx-auto mb-2"
                />
                <p className="font-medium text-sm text-gray-900 truncate">
                  {player.firstName}
                </p>
                <p className="text-xs text-gray-500 truncate">{player.lastName}</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <span className="text-xs font-bold text-gray-500">#{player.jerseyNumber}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${getPositionColor(player.position)}`}>
                    {player.position}
                  </span>
                </div>
                {player.isInjured && (
                  <p className="text-xs text-red-600 mt-1 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {t('players.injured')}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default CoachDashboard;
