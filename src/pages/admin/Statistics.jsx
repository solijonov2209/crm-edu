import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { playersAPI, teamsAPI } from '../../utils/api';
import { Card, Loading, Select, Avatar, Badge } from '../../components/common';
import { Trophy, Target, Users, CreditCard, Star, TrendingUp } from 'lucide-react';
import { getPositionColor } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

const Statistics = () => {
  const { t } = useTranslation();
  const { user, isCoach } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState(() => {
    if (isCoach) {
      const coachTeams = user?.teams?.length > 0 ? user.teams : (user?.team ? [user.team] : []);
      return coachTeams[0]?._id || '';
    }
    return '';
  });

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsAPI.getAll({ limit: 100 }),
    select: (res) => res.data.teams,
  });

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['playerStatistics', selectedTeam],
    queryFn: () => playersAPI.getStatistics({ team: selectedTeam || undefined }),
    select: (res) => res.data,
  });

  const teamOptions = isCoach
    ? (() => {
        const coachTeams = user?.teams?.length > 0 ? user.teams : (user?.team ? [user.team] : []);
        return coachTeams.map(team => ({
          value: team._id,
          label: `${team.name}${team.ageCategory ? ` (${team.ageCategory})` : ''}`
        }));
      })()
    : [
        { value: '', label: t('common.all') },
        ...(teamsData || []).map(team => ({
          value: team._id,
          label: team.name
        }))
      ];

  // Get top scorers, assisters, etc.
  const topScorers = statsData?.players?.filter(p => p.matchStats.goals > 0).slice(0, 5) || [];
  const topAssisters = statsData?.players?.filter(p => p.matchStats.assists > 0)
    .sort((a, b) => b.matchStats.assists - a.matchStats.assists).slice(0, 5) || [];
  const topRated = statsData?.players?.filter(p => p.matchStats.averageRating)
    .sort((a, b) => parseFloat(b.matchStats.averageRating) - parseFloat(a.matchStats.averageRating)).slice(0, 5) || [];

  const getRatingColor = (rating) => {
    if (!rating) return 'bg-gray-400';
    const r = parseFloat(rating);
    if (r >= 8) return 'bg-green-500';
    if (r >= 7) return 'bg-green-400';
    if (r >= 6) return 'bg-yellow-500';
    if (r >= 5) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('statistics.title')}</h1>
          <p className="text-gray-500">{t('statistics.description')}</p>
        </div>
        <Select
          options={teamOptions}
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="w-full sm:w-64"
        />
      </div>

      {isLoading ? (
        <Loading />
      ) : (
        <>
          {/* Top Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Top Scorers */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('statistics.topScorers')}</h3>
                  <p className="text-sm text-gray-500">{t('players.goals')}</p>
                </div>
              </div>
              <div className="space-y-3">
                {topScorers.length > 0 ? (
                  topScorers.map((player, index) => (
                    <div key={player._id} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                        index === 1 ? 'bg-gray-300 text-gray-700' :
                        index === 2 ? 'bg-orange-300 text-orange-900' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {index + 1}
                      </span>
                      <Avatar
                        src={player.photo}
                        firstName={player.firstName}
                        lastName={player.lastName}
                        size="small"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {player.firstName} {player.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{player.team?.name}</p>
                      </div>
                      <span className="text-lg font-bold text-green-600">{player.matchStats.goals}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">{t('common.noData')}</p>
                )}
              </div>
            </Card>

            {/* Top Assisters */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('statistics.topAssisters')}</h3>
                  <p className="text-sm text-gray-500">{t('players.assists')}</p>
                </div>
              </div>
              <div className="space-y-3">
                {topAssisters.length > 0 ? (
                  topAssisters.map((player, index) => (
                    <div key={player._id} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                        index === 1 ? 'bg-gray-300 text-gray-700' :
                        index === 2 ? 'bg-orange-300 text-orange-900' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {index + 1}
                      </span>
                      <Avatar
                        src={player.photo}
                        firstName={player.firstName}
                        lastName={player.lastName}
                        size="small"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {player.firstName} {player.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{player.team?.name}</p>
                      </div>
                      <span className="text-lg font-bold text-blue-600">{player.matchStats.assists}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">{t('common.noData')}</p>
                )}
              </div>
            </Card>

            {/* Top Rated */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Star className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('statistics.topRated')}</h3>
                  <p className="text-sm text-gray-500">{t('statistics.averageRating')}</p>
                </div>
              </div>
              <div className="space-y-3">
                {topRated.length > 0 ? (
                  topRated.map((player, index) => (
                    <div key={player._id} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                        index === 1 ? 'bg-gray-300 text-gray-700' :
                        index === 2 ? 'bg-orange-300 text-orange-900' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {index + 1}
                      </span>
                      <Avatar
                        src={player.photo}
                        firstName={player.firstName}
                        lastName={player.lastName}
                        size="small"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {player.firstName} {player.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{player.team?.name}</p>
                      </div>
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${getRatingColor(player.matchStats.averageRating)}`}>
                        {player.matchStats.averageRating}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">{t('common.noData')}</p>
                )}
              </div>
            </Card>
          </div>

          {/* Full Statistics Table */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-600" />
                {t('statistics.allPlayers')}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">{t('players.title')}</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">{t('players.position')}</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">{t('players.matchesPlayed')}</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">{t('players.goals')}</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">{t('players.assists')}</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">{t('players.yellowCards')}</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">{t('players.redCards')}</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">{t('statistics.avgRating')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {statsData?.players?.map((player) => (
                    <tr key={player._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={player.photo}
                            firstName={player.firstName}
                            lastName={player.lastName}
                            size="small"
                          />
                          <div>
                            <p className="font-medium text-gray-900">
                              {player.jerseyNumber && <span className="text-gray-400 mr-1">#{player.jerseyNumber}</span>}
                              {player.firstName} {player.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{player.team?.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getPositionColor(player.position)}`}>
                          {t(`players.positions.${player.position}`)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-gray-900">
                        {player.matchStats.matchesPlayed}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-green-600">{player.matchStats.goals}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-blue-600">{player.matchStats.assists}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {player.matchStats.yellowCards > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="w-3 h-4 bg-yellow-400 rounded-sm" />
                            <span className="font-medium">{player.matchStats.yellowCards}</span>
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {player.matchStats.redCards > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="w-3 h-4 bg-red-500 rounded-sm" />
                            <span className="font-medium">{player.matchStats.redCards}</span>
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {player.matchStats.averageRating ? (
                          <span className={`inline-flex w-8 h-8 rounded-lg items-center justify-center text-white font-bold text-sm ${getRatingColor(player.matchStats.averageRating)}`}>
                            {player.matchStats.averageRating}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {statsData?.players?.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  {t('common.noData')}
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default Statistics;
