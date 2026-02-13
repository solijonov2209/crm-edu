import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { teamsAPI, usersAPI, trainingsAPI, matchesAPI, playersAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Card, Loading, Button, Input, Select, Modal, Badge, EmptyState, ConfirmDialog, Avatar } from '../../components/common';
import { Plus, Edit, Trash2, Users, Trophy, Shield, Calendar, Eye, CheckCircle, XCircle, Clock, Star, ChevronRight, ArrowLeft, Gamepad2, AlertTriangle, MapPin, Target, CreditCard, ArrowLeftRight } from 'lucide-react';
import { formatDate, getStatusColor, getResultColor, formations } from '../../utils/helpers';
import toast from 'react-hot-toast';

const TeamForm = ({ team, coaches, onSubmit, onClose, loading }) => {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: team || {
      name: '',
      ageCategory: '',
      birthYear: new Date().getFullYear() - 12,
      coach: '',
      description: '',
      primaryColor: '#1e40af',
      secondaryColor: '#ffffff',
      homeVenue: '',
    }
  });

  const coachOptions = coaches.map(coach => ({
    value: coach._id,
    label: `${coach.firstName} ${coach.lastName}`
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label={t('teams.teamName')}
          error={errors.name?.message}
          {...register('name', { required: 'Team name is required' })}
        />
        <Input
          label={t('teams.ageCategory')}
          placeholder="e.g., U-12, U-14"
          error={errors.ageCategory?.message}
          {...register('ageCategory', { required: 'Age category is required' })}
        />
        <Input
          label={t('teams.birthYear')}
          type="number"
          min="2000"
          max={new Date().getFullYear()}
          error={errors.birthYear?.message}
          {...register('birthYear', {
            required: 'Birth year is required',
            valueAsNumber: true
          })}
        />
        <Select
          label={t('teams.coach')}
          options={coachOptions}
          placeholder={`-- ${t('teams.coach')} --`}
          {...register('coach')}
        />
        <Input
          label={t('teams.homeVenue')}
          {...register('homeVenue')}
        />
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="label">{t('teams.primaryColor')}</label>
            <input
              type="color"
              className="w-full h-10 rounded-lg cursor-pointer"
              {...register('primaryColor')}
            />
          </div>
          <div className="flex-1">
            <label className="label">{t('teams.secondaryColor')}</label>
            <input
              type="color"
              className="w-full h-10 rounded-lg cursor-pointer"
              {...register('secondaryColor')}
            />
          </div>
        </div>
      </div>

      <Input
        label={t('teams.description')}
        {...register('description')}
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={loading}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
};

// Match Detail View (read-only for viewing from team detail)
const MatchDetailView = ({ match, onBack, t }) => {
  // Fetch team players
  const { data: playersData, isLoading } = useQuery({
    queryKey: ['players', match?.team?._id],
    queryFn: () => playersAPI.getByTeam(match?.team?._id),
    enabled: !!match?.team?._id,
    select: (res) => res.data.players,
  });

  if (!match) return null;

  const getPlayerName = (playerId) => {
    if (!playerId) return '-';
    if (typeof playerId === 'object') {
      return `${playerId.firstName} ${playerId.lastName}`;
    }
    const player = playersData?.find(p => p._id === playerId);
    return player ? `${player.firstName} ${player.lastName}` : '-';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 sm:gap-4 pb-4 border-b border-gray-100">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{match.team?.name}</h2>
          <p className="text-sm text-gray-500">
            {formatDate(match.date || match.matchDate)} | {match.kickoffTime}
          </p>
        </div>
        <Badge className={getStatusColor(match.status)}>
          {t(`matches.statuses.${match.status}`)}
        </Badge>
      </div>

      {/* Match Score */}
      <div className="text-center py-4 sm:py-6 bg-gray-50 rounded-xl">
        <div className="flex items-center justify-center gap-4 sm:gap-8 mb-3">
          <div className="text-center">
            <p className="font-bold text-base sm:text-lg text-gray-900">{match.team?.name}</p>
            <p className="text-xs sm:text-sm text-gray-500">{match.isHome ? t('matches.home') : t('matches.away')}</p>
          </div>
          <div className="px-4 sm:px-6 py-2 sm:py-3 bg-white rounded-lg shadow-sm">
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              {match.score?.home || 0} - {match.score?.away || 0}
            </p>
          </div>
          <div className="text-center">
            <p className="font-bold text-base sm:text-lg text-gray-900">{match.opponent?.name}</p>
            <p className="text-xs sm:text-sm text-gray-500">{match.isHome ? t('matches.away') : t('matches.home')}</p>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-gray-500">
          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
          {match.venue || '-'} | {match.competition || 'Friendly'}
        </p>
      </div>

      {/* Match Events */}
      {isLoading ? (
        <Loading />
      ) : (
        <div className="max-h-[300px] sm:max-h-[350px] overflow-y-auto space-y-4">
          {/* Goals */}
          {match.goals?.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2 text-sm sm:text-base">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                {t('matches.goals')}
              </h4>
              <div className="space-y-2">
                {match.goals.map((goal, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 sm:p-3 bg-green-50 rounded-lg">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Target className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{getPlayerName(goal.player)}</p>
                      {goal.assist && (
                        <p className="text-xs sm:text-sm text-gray-500 truncate">
                          {t('matches.assist')}: {getPlayerName(goal.assist)}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-900 text-sm sm:text-base">{goal.minute}'</p>
                      <p className="text-xs text-gray-500">{t(`matches.goalTypes.${goal.type}`)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cards */}
          {match.cards?.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2 text-sm sm:text-base">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                {t('matches.cards')}
              </h4>
              <div className="space-y-2">
                {match.cards.map((card, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 sm:p-3 bg-yellow-50 rounded-lg">
                    <div className={`w-5 h-7 sm:w-6 sm:h-8 rounded ${
                      card.type === 'yellow' ? 'bg-yellow-400' :
                      card.type === 'red' ? 'bg-red-500' : 'bg-gradient-to-b from-yellow-400 to-red-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{getPlayerName(card.player)}</p>
                      {card.reason && <p className="text-xs sm:text-sm text-gray-500 truncate">{card.reason}</p>}
                    </div>
                    <p className="font-bold text-gray-900 text-sm sm:text-base flex-shrink-0">{card.minute}'</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Substitutions */}
          {match.substitutions?.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2 text-sm sm:text-base">
                <ArrowLeftRight className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                {t('matches.substitutions')}
              </h4>
              <div className="space-y-2">
                {match.substitutions.map((sub, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 sm:p-3 bg-blue-50 rounded-lg">
                    <ArrowLeftRight className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-red-500">↓</span>
                        <span className="font-medium text-sm truncate">{getPlayerName(sub.playerOut)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-500">↑</span>
                        <span className="font-medium text-sm truncate">{getPlayerName(sub.playerIn)}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-900 text-sm sm:text-base">{sub.minute}'</p>
                      <p className="text-xs text-gray-500">{t(`matches.subReasons.${sub.reason}`)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Events */}
          {!match.goals?.length && !match.cards?.length && !match.substitutions?.length && (
            <div className="text-center py-8 text-gray-500 text-sm sm:text-base">
              {t('common.noData')}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end pt-4 border-t border-gray-100">
        <Button variant="secondary" onClick={onBack}>
          {t('common.back')}
        </Button>
      </div>
    </div>
  );
};

// Team Detail Modal with Tabs (Trainings, Matches, Players)
const TeamDetailModal = ({ team, onClose, onViewTraining, onViewMatch, t }) => {
  useAuth();
  const [activeTab, setActiveTab] = useState('trainings');

  // Fetch trainings for this team
  const { data: trainingsData, isLoading: trainingsLoading } = useQuery({
    queryKey: ['trainings', team?._id],
    queryFn: () => trainingsAPI.getAll({ team: team?._id, limit: 50 }),
    enabled: !!team?._id,
    select: (res) => res.data?.trainings,
  });

  // Fetch matches for this team
  const { data: matchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ['matches', team?._id],
    queryFn: () => matchesAPI.getAll({ team: team?._id, limit: 50 }),
    enabled: !!team?._id,
    select: (res) => res.data?.matches,
  });

  // Fetch players for this team
  const { data: playersData, isLoading: playersLoading } = useQuery({
    queryKey: ['players', team?._id],
    queryFn: () => playersAPI.getByTeam(team?._id),
    enabled: !!team?._id,
    select: (res) => res.data?.players,
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Calendar className="w-4 h-4 text-primary-500" />;
    }
  };

  const getMatchResultBadge = (match) => {
    if (match.status !== 'completed') return null;
    const ourScore = match.score?.home || 0;
    const theirScore = match.score?.away || 0;
    if (ourScore > theirScore) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">G</span>;
    if (ourScore < theirScore) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">M</span>;
    return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-700">D</span>;
  };

  // Calculate attendance rate
  const avgAttendance = trainingsData?.length > 0
    ? Math.round(trainingsData.reduce((sum, t) => sum + (t.attendanceStats?.percentage || 0), 0) / trainingsData.length)
    : 0;

  // Get recent form (last 5 matches)
  const recentForm = matchesData
    ?.filter(m => m.status === 'completed')
    ?.slice(0, 5)
    ?.map(m => {
      const ourScore = m.score?.home || 0;
      const theirScore = m.score?.away || 0;
      if (ourScore > theirScore) return 'W';
      if (ourScore < theirScore) return 'L';
      return 'D';
    }) || [];

  // Get injured players
  const injuredPlayers = playersData?.filter(p => p.injuryStatus === 'injured') || [];

  const tabs = [
    { id: 'trainings', label: t('teams.tabs.trainings'), icon: Calendar },
    { id: 'matches', label: t('teams.tabs.matches'), icon: Gamepad2 },
    { id: 'players', label: t('teams.tabs.players'), icon: Users },
  ];

  if (!team) return null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Team Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: team.primaryColor }}
          >
            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white opacity-80" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{team.name}</h2>
            <p className="text-sm sm:text-base text-gray-500">{team.ageCategory} ({team.birthYear})</p>
            {team.coach && (
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                {t('teams.coach')}: {team.coach.firstName} {team.coach.lastName}
              </p>
            )}
          </div>
        </div>
        <div className="sm:ml-auto text-left sm:text-right mt-2 sm:mt-0">
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
            <span className="text-green-600 font-semibold">{team.statistics?.wins || 0} {t('dashboard.wins')}</span>
            <span className="text-yellow-600 font-semibold">{team.statistics?.draws || 0} {t('dashboard.draws')}</span>
            <span className="text-red-600 font-semibold">{team.statistics?.losses || 0} {t('dashboard.losses')}</span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            <Users className="w-3 h-3 inline mr-1" />
            {team.playerCount || 0} {t('players.title').toLowerCase()}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-blue-50 rounded-lg p-2 sm:p-3 text-center">
          <p className="text-lg sm:text-2xl font-bold text-blue-600">{avgAttendance}%</p>
          <p className="text-[10px] sm:text-xs text-blue-500">{t('teams.attendanceRate')}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-2 sm:p-3 text-center">
          <div className="flex items-center justify-center gap-0.5 sm:gap-1 mb-1">
            {recentForm.length > 0 ? recentForm.map((r, i) => (
              <span
                key={i}
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded text-[10px] sm:text-xs font-bold flex items-center justify-center ${
                  r === 'W' ? 'bg-green-500 text-white' :
                  r === 'L' ? 'bg-red-500 text-white' :
                  'bg-yellow-500 text-white'
                }`}
              >
                {r}
              </span>
            )) : <span className="text-gray-400">-</span>}
          </div>
          <p className="text-[10px] sm:text-xs text-green-500">{t('teams.recentForm')}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-2 sm:p-3 text-center">
          <p className="text-lg sm:text-2xl font-bold text-orange-600">{injuredPlayers.length}</p>
          <p className="text-[10px] sm:text-xs text-orange-500">{t('teams.injuredPlayers')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[250px] sm:min-h-[300px]">
        {/* Trainings Tab */}
        {activeTab === 'trainings' && (
          trainingsLoading ? (
            <Loading />
          ) : !trainingsData || trainingsData.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm sm:text-base">
              {t('common.noData')}
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3 max-h-[300px] sm:max-h-[350px] overflow-y-auto">
              {trainingsData.map((training) => (
                <div
                  key={training._id}
                  onClick={() => onViewTraining(training)}
                  className="flex items-center justify-between p-2 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                      {getStatusIcon(training.status)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                        {formatDate(training.date)}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">
                        {training.startTime} - {training.endTime} | {t(`trainings.types.${training.type}`)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <div className="text-center hidden sm:block">
                      <p className="text-base sm:text-lg font-bold text-gray-900">
                        {training.attendanceStats?.percentage || 0}%
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500">{t('trainings.attendance')}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 sm:hidden">
                      {training.attendanceStats?.percentage || 0}%
                    </p>

                    {training.overallRating && (
                      <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-yellow-100 rounded-lg">
                        <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold text-yellow-700 text-xs sm:text-sm">{training.overallRating}</span>
                      </div>
                    )}

                    <Badge className={`${getStatusColor(training.status)} text-[10px] sm:text-xs hidden sm:inline-flex`}>
                      {t(`trainings.statuses.${training.status}`)}
                    </Badge>

                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Matches Tab */}
        {activeTab === 'matches' && (
          matchesLoading ? (
            <Loading />
          ) : !matchesData || matchesData.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm sm:text-base">
              {t('common.noData')}
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3 max-h-[300px] sm:max-h-[350px] overflow-y-auto">
              {matchesData.map((match) => (
                <div
                  key={match._id}
                  onClick={() => onViewMatch && onViewMatch(match)}
                  className="flex items-center justify-between p-2 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                      <Gamepad2 className={`w-4 h-4 sm:w-5 sm:h-5 ${match.status === 'completed' ? 'text-green-500' : 'text-primary-500'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                        vs {match.opponent?.name || match.opponent}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">
                        {formatDate(match.date || match.matchDate)} | {match.kickoffTime} | {match.isHome ? t('matches.home') : t('matches.away')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    {match.status === 'completed' && (
                      <div className="text-center">
                        <p className="text-base sm:text-xl font-bold text-gray-900">
                          {match.score?.home || 0} - {match.score?.away || 0}
                        </p>
                      </div>
                    )}

                    {getMatchResultBadge(match)}

                    <Badge className={`${getStatusColor(match.status)} text-[10px] sm:text-xs hidden sm:inline-flex`}>
                      {t(`matches.statuses.${match.status}`)}
                    </Badge>

                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Players Tab */}
        {activeTab === 'players' && (
          playersLoading ? (
            <Loading />
          ) : !playersData || playersData.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm sm:text-base">
              {t('common.noData')}
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3 max-h-[300px] sm:max-h-[350px] overflow-y-auto">
              {playersData.map((player) => (
                <div
                  key={player._id}
                  className="flex items-center justify-between p-2 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <Avatar
                      src={player.photo}
                      firstName={player.firstName}
                      lastName={player.lastName}
                      size="small"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                        {player.firstName} {player.lastName}
                        {player.injuryStatus === 'injured' && (
                          <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 inline ml-1 sm:ml-2" />
                        )}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">
                        #{player.jerseyNumber} | {t(`players.positions.${player.position}`)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <div className="text-center hidden sm:block">
                      <p className="text-xs sm:text-sm font-semibold text-gray-900">
                        {player.statistics?.goals || 0} {t('players.goals')}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500">
                        {player.statistics?.assists || 0} {t('players.assists')}
                      </p>
                    </div>
                    <div className="text-center sm:hidden">
                      <p className="text-xs font-semibold text-gray-900">
                        {player.statistics?.goals || 0}G / {player.statistics?.assists || 0}A
                      </p>
                    </div>

                    {player.overallRating && (
                      <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-primary-100 rounded-lg">
                        <span className="font-bold text-primary-700 text-xs sm:text-sm">{player.overallRating}</span>
                      </div>
                    )}

                    {player.injuryStatus === 'injured' ? (
                      <Badge className="bg-orange-100 text-orange-700 text-[10px] sm:text-xs">{t('players.injured')}</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700 text-[10px] sm:text-xs hidden sm:inline-flex">{t('players.available')}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end pt-4 border-t border-gray-100">
        <Button variant="secondary" onClick={onClose}>
          {t('common.close')}
        </Button>
      </div>
    </div>
  );
};

// Training Result View (read-only for both admin and coach viewing from team detail)
const TrainingResultView = ({ training, onBack, t }) => {
  const { data: playersData, isLoading } = useQuery({
    queryKey: ['players', training?.team?._id],
    queryFn: () => import('../../utils/api').then(api => api.playersAPI.getByTeam(training?.team?._id)),
    enabled: !!training?.team?._id,
    select: (res) => res.data.players,
  });

  const getPlayerAttendance = (playerId) => {
    return training.attendance?.find(a =>
      a.player === playerId || a.player?._id === playerId
    ) || { status: 'present', rating: 5, performance: {} };
  };

  const attendanceStatuses = [
    { value: 'present', label: t('trainings.attendanceStatus.present'), color: 'bg-green-500' },
    { value: 'absent', label: t('trainings.attendanceStatus.absent'), color: 'bg-red-500' },
    { value: 'late', label: t('trainings.attendanceStatus.late'), color: 'bg-yellow-500' },
    { value: 'excused', label: t('trainings.attendanceStatus.excused'), color: 'bg-gray-500' },
    { value: 'injured', label: t('trainings.attendanceStatus.injured'), color: 'bg-orange-500' },
  ];

  if (!training) return null;

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">{training.team?.name}</h2>
          <p className="text-gray-500">
            {formatDate(training.date)} | {training.startTime} - {training.endTime}
          </p>
        </div>
        <div className="text-right">
          {training.overallRating && (
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <span className="text-2xl font-bold text-gray-900">{training.overallRating}/10</span>
            </div>
          )}
          <Badge className={getStatusColor(training.status)}>
            {t(`trainings.statuses.${training.status}`)}
          </Badge>
        </div>
      </div>

      {/* Player Results */}
      <div className="max-h-[450px] overflow-y-auto space-y-3">
        {isLoading ? (
          <Loading />
        ) : (
          playersData?.map((player) => {
            const att = getPlayerAttendance(player._id);
            return (
              <div key={player._id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={player.photo}
                      firstName={player.firstName}
                      lastName={player.lastName}
                      size="small"
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {player.firstName} {player.lastName}
                      </p>
                      <p className="text-xs text-gray-500">#{player.jerseyNumber} - {player.position}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full text-white ${
                      attendanceStatuses.find(s => s.value === att.status)?.color || 'bg-gray-500'
                    }`}>
                      {attendanceStatuses.find(s => s.value === att.status)?.label || att.status}
                    </span>
                    {att.rating && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 rounded">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-bold text-yellow-700">{att.rating}</span>
                      </div>
                    )}
                  </div>
                </div>

                {att.status !== 'absent' && att.performance && (
                  <div className="grid grid-cols-4 gap-3 mt-3">
                    {['effort', 'technique', 'attitude', 'teamwork'].map((metric) => (
                      <div key={metric}>
                        <p className="text-xs text-gray-500 mb-1">{t(`trainings.${metric}`)}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-lg overflow-hidden">
                            <div
                              className="h-full bg-primary-500 rounded-lg"
                              style={{ width: `${((att.performance[metric] || 5) / 10) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-primary-600">
                            {att.performance[metric] || 5}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {att.notes && (
                  <p className="mt-2 text-sm text-gray-600 italic bg-white px-3 py-2 rounded border border-gray-100">
                    {att.notes}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Coach Notes */}
      {training.coachNotes && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h4 className="font-medium text-blue-800 mb-2">{t('trainings.coachNotes')}</h4>
          <p className="text-blue-700 whitespace-pre-wrap">{training.coachNotes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end pt-4 border-t border-gray-100">
        <Button variant="secondary" onClick={onBack}>
          {t('common.back')}
        </Button>
      </div>
    </div>
  );
};

const Teams = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [deletingTeam, setDeletingTeam] = useState(null);
  const [viewingTeam, setViewingTeam] = useState(null);
  const [viewingTraining, setViewingTraining] = useState(null);
  const [viewingMatch, setViewingMatch] = useState(null);

  const { data: teamsData, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsAPI.getAll({ limit: 100 }),
    select: (res) => res.data,
  });

  const { data: coachesData } = useQuery({
    queryKey: ['coaches'],
    queryFn: () => usersAPI.getAll({ role: 'coach', limit: 100 }),
    select: (res) => res.data.users,
  });

  const createMutation = useMutation({
    mutationFn: teamsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
      setShowModal(false);
      toast.success(t('common.success'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => teamsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
      setShowModal(false);
      setEditingTeam(null);
      toast.success(t('common.success'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: teamsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
      setDeletingTeam(null);
      toast.success(t('common.success'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const handleSubmit = (data) => {
    if (editingTeam) {
      updateMutation.mutate({ id: editingTeam._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditModal = (team) => {
    setEditingTeam({
      ...team,
      coach: team.coach?._id || ''
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('teams.title')}</h1>
          <p className="text-gray-500">{teamsData?.total || 0} {t('teams.title').toLowerCase()}</p>
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>
          {t('teams.addTeam')}
        </Button>
      </div>

      {/* Teams Grid */}
      {isLoading ? (
        <Loading />
      ) : teamsData?.teams?.length === 0 ? (
        <EmptyState
          icon={Shield}
          title={t('common.noData')}
          action={() => setShowModal(true)}
          actionLabel={t('teams.addTeam')}
          actionIcon={Plus}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamsData?.teams?.map((team) => (
            <Card
              key={team._id}
              className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setViewingTeam(team)}
            >
              <div
                className="h-24 flex items-center justify-center"
                style={{ backgroundColor: team.primaryColor }}
              >
                <Shield className="w-12 h-12 text-white opacity-50" />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{team.name}</h3>
                    <p className="text-sm text-gray-500">{team.ageCategory} ({team.birthYear})</p>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEditModal(team)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingTeam(team)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {team.coach && (
                  <p className="text-sm text-gray-600 mb-4">
                    <span className="text-gray-400">{t('teams.coach')}:</span>{' '}
                    {team.coach.firstName} {team.coach.lastName}
                  </p>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">{team.playerCount || 0} {t('players.title').toLowerCase()}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-green-600">{team.statistics?.wins || 0}W</span>
                    <span className="text-yellow-600">{team.statistics?.draws || 0}D</span>
                    <span className="text-red-600">{team.statistics?.losses || 0}L</span>
                  </div>
                </div>

                {/* View Details Hint */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-primary-600">
                    <Calendar className="w-4 h-4" />
                    {t('teams.tabs.trainings')}
                  </span>
                  <span className="flex items-center gap-1 text-green-600">
                    <Gamepad2 className="w-4 h-4" />
                    {t('teams.tabs.matches')}
                  </span>
                  <span className="flex items-center gap-1 text-blue-600">
                    <Users className="w-4 h-4" />
                    {t('teams.tabs.players')}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingTeam(null);
        }}
        title={editingTeam ? t('teams.editTeam') : t('teams.addTeam')}
        size="large"
      >
        <TeamForm
          team={editingTeam}
          coaches={coachesData || []}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowModal(false);
            setEditingTeam(null);
          }}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingTeam}
        onClose={() => setDeletingTeam(null)}
        onConfirm={() => deleteMutation.mutate(deletingTeam._id)}
        title={t('common.delete')}
        message={t('teams.deleteConfirm')}
        loading={deleteMutation.isPending}
      />

      {/* Team Detail Modal */}
      <Modal
        isOpen={!!viewingTeam && !viewingTraining && !viewingMatch}
        onClose={() => setViewingTeam(null)}
        title={t('teams.teamDetails')}
        size="xlarge"
      >
        <TeamDetailModal
          team={viewingTeam}
          onClose={() => setViewingTeam(null)}
          onViewTraining={(training) => setViewingTraining(training)}
          onViewMatch={(match) => setViewingMatch(match)}
          t={t}
        />
      </Modal>

      {/* Training Result Modal */}
      <Modal
        isOpen={!!viewingTraining}
        onClose={() => setViewingTraining(null)}
        title={t('trainings.trainingDetails')}
        size="xlarge"
      >
        <TrainingResultView
          training={viewingTraining}
          onBack={() => setViewingTraining(null)}
          t={t}
        />
      </Modal>

      {/* Match Detail Modal */}
      <Modal
        isOpen={!!viewingMatch}
        onClose={() => setViewingMatch(null)}
        title={t('matches.matchDetails')}
        size="xlarge"
      >
        <MatchDetailView
          match={viewingMatch}
          onBack={() => setViewingMatch(null)}
          t={t}
        />
      </Modal>
    </div>
  );
};

export default Teams;
