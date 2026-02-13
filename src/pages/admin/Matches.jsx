import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { matchesAPI, teamsAPI, playersAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Card, Loading, Button, Input, Select, Modal, Badge, EmptyState, ConfirmDialog, Avatar } from '../../components/common';
import { useLocation } from 'react-router-dom';
import { Plus, Trophy, Edit, Trash2, Calendar, MapPin, Eye, Users, Target, CreditCard, ArrowLeftRight, BarChart3, Star, Save, X, Check } from 'lucide-react';
import { formatDate, getStatusColor, getResultColor, formations } from '../../utils/helpers';
import toast from 'react-hot-toast';

const MatchForm = ({ match, teams, onSubmit, onClose, loading }) => {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      team: match?.team || '',
      opponentName: match?.opponentName || '',
      matchDate: match?.matchDate || new Date().toISOString().split('T')[0],
      kickoffTime: match?.kickoffTime || '15:00',
      venue: match?.venue || '',
      isHome: match?.isHome !== false,
      competition: match?.competition || 'Friendly',
      formation: match?.formation || '4-3-3',
    }
  });

  const teamOptions = teams.map(team => ({
    value: team._id,
    label: `${team.name} (${team.ageCategory})`
  }));

  const handleFormSubmit = (data) => {
    const matchData = {
      team: data.team,
      opponent: { name: data.opponentName },
      matchDate: data.matchDate,
      kickoffTime: data.kickoffTime,
      venue: data.venue || '',
      isHome: data.isHome,
      competition: data.competition || 'Friendly',
      formation: data.formation || '4-3-3',
    };
    onSubmit(matchData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label={t('teams.title')}
          options={teamOptions}
          placeholder={`-- ${t('teams.title')} --`}
          error={errors.team?.message}
          {...register('team', { required: 'Team is required' })}
        />
        <Input
          label={t('matches.opponent')}
          error={errors.opponentName?.message}
          {...register('opponentName', { required: 'Opponent is required' })}
        />
        <Input
          label={t('matches.matchDate')}
          type="date"
          error={errors.matchDate?.message}
          {...register('matchDate', { required: 'Date is required' })}
        />
        <Input
          label={t('matches.kickoffTime')}
          type="time"
          error={errors.kickoffTime?.message}
          {...register('kickoffTime', { required: 'Time is required' })}
        />
        <Input
          label={t('matches.venue')}
          {...register('venue')}
        />
        <Input
          label={t('matches.competition')}
          {...register('competition')}
        />
        <Select
          label={t('matches.formation')}
          options={formations}
          {...register('formation')}
        />
        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            id="isHome"
            className="w-4 h-4 text-primary-600 rounded"
            {...register('isHome')}
          />
          <label htmlFor="isHome" className="text-sm text-gray-700">
            {t('matches.isHome')}
          </label>
        </div>
      </div>

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

// Match Detail Modal with Goals, Cards, Substitutions, Statistics
const MatchDetailModal = ({ match, onClose, t, isReadOnly = false }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('lineup');
  const [saving, setSaving] = useState(false);

  // Local state for match data
  const [score, setScore] = useState({ home: match?.score?.home || 0, away: match?.score?.away || 0 });
  const [statistics, setStatistics] = useState(match?.statistics || {
    possession: 50, shots: 0, shotsOnTarget: 0, corners: 0, fouls: 0
  });
  const [coachNotes, setCoachNotes] = useState(match?.coachNotes || '');
  const [manOfTheMatch, setManOfTheMatch] = useState(match?.manOfTheMatch?._id || '');
  const [formation, setFormation] = useState(match?.formation || '4-3-3');
  const [playerRatings, setPlayerRatings] = useState(() => {
    // Initialize from existing ratings or empty object
    const ratings = {};
    match?.playerRatings?.forEach(r => {
      const playerId = r.player?._id || r.player;
      if (playerId) ratings[playerId] = r.rating;
    });
    return ratings;
  });

  // For adding new items
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showSubForm, setShowSubForm] = useState(false);
  const [newGoal, setNewGoal] = useState({ player: '', minute: '', type: 'regular', assist: '' });
  const [newCard, setNewCard] = useState({ player: '', minute: '', type: 'yellow', reason: '' });
  const [newSub, setNewSub] = useState({ playerOut: '', playerIn: '', minute: '', reason: 'tactical' });

  // Fetch team players
  const { data: playersData } = useQuery({
    queryKey: ['players', match?.team?._id],
    queryFn: () => playersAPI.getByTeam(match?.team?._id),
    enabled: !!match?.team?._id,
    select: (res) => res.data.players,
  });

  // Mutations
  const addGoalMutation = useMutation({
    mutationFn: (data) => matchesAPI.addGoal(match._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['matches']);
      setShowGoalForm(false);
      setNewGoal({ player: '', minute: '', type: 'regular', assist: '' });
      toast.success(t('common.success'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('common.error'))
  });

  const addCardMutation = useMutation({
    mutationFn: (data) => matchesAPI.addCard(match._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['matches']);
      setShowCardForm(false);
      setNewCard({ player: '', minute: '', type: 'yellow', reason: '' });
      toast.success(t('common.success'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('common.error'))
  });

  const addSubMutation = useMutation({
    mutationFn: (data) => matchesAPI.addSubstitution(match._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['matches']);
      setShowSubForm(false);
      setNewSub({ playerOut: '', playerIn: '', minute: '', reason: 'tactical' });
      toast.success(t('common.success'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('common.error'))
  });

  const updateMatchMutation = useMutation({
    mutationFn: (data) => matchesAPI.update(match._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['matches']);
      toast.success(t('common.success'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('common.error'))
  });

  const handleSaveMatch = async () => {
    setSaving(true);
    try {
      // Convert playerRatings object to array format
      const ratingsArray = Object.entries(playerRatings)
        .filter(([, rating]) => rating > 0)
        .map(([playerId, rating]) => ({ player: playerId, rating }));

      await updateMatchMutation.mutateAsync({
        score,
        statistics,
        coachNotes,
        manOfTheMatch: manOfTheMatch || undefined,
        playerRatings: ratingsArray,
        formation,
        status: 'completed'
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleAddGoal = () => {
    if (!newGoal.player || !newGoal.minute) {
      toast.error(t('common.error'));
      return;
    }
    addGoalMutation.mutate({
      player: newGoal.player,
      minute: parseInt(newGoal.minute),
      type: newGoal.type,
      assist: newGoal.assist || undefined
    });
  };

  const handleAddCard = () => {
    if (!newCard.player || !newCard.minute) {
      toast.error(t('common.error'));
      return;
    }
    addCardMutation.mutate({
      player: newCard.player,
      minute: parseInt(newCard.minute),
      type: newCard.type,
      reason: newCard.reason || undefined
    });
  };

  const handleAddSubstitution = () => {
    if (!newSub.playerOut || !newSub.playerIn || !newSub.minute) {
      toast.error(t('common.error'));
      return;
    }
    addSubMutation.mutate({
      playerOut: newSub.playerOut,
      playerIn: newSub.playerIn,
      minute: parseInt(newSub.minute),
      reason: newSub.reason
    });
  };

  const playerOptions = playersData?.map(p => ({
    value: p._id,
    label: `${p.firstName} ${p.lastName} (#${p.jerseyNumber})`
  })) || [];

  // Get starting lineup player IDs
  const startingPlayerIds = match?.lineup?.filter(l => !l.isSubstitute).map(l => l.player?._id || l.player) || [];

  // If no lineup set, use first 11 players
  const effectiveStartingIds = startingPlayerIds.length > 0
    ? startingPlayerIds
    : (playersData?.slice(0, 11).map(p => p._id) || []);

  // Players who came in as substitutes
  const playersIn = match?.substitutions?.map(s => s.playerIn?._id || s.playerIn) || [];

  // Players who went out
  const playersOut = match?.substitutions?.map(s => s.playerOut?._id || s.playerOut) || [];

  // Current field players = starting + came in - went out
  const currentFieldPlayerIds = [
    ...effectiveStartingIds.filter(id => !playersOut.includes(id)),
    ...playersIn
  ];

  // Bench players = all players - starting lineup - already used as sub in
  const benchPlayerIds = playersData?.filter(p =>
    !effectiveStartingIds.includes(p._id) && !playersIn.includes(p._id)
  ).map(p => p._id) || [];

  // Options for player going out (only field players)
  const fieldPlayerOptions = playersData?.filter(p =>
    currentFieldPlayerIds.includes(p._id)
  ).map(p => ({
    value: p._id,
    label: `${p.firstName} ${p.lastName} (#${p.jerseyNumber})`
  })) || [];

  // Options for player coming in (only bench players)
  const benchPlayerOptions = playersData?.filter(p =>
    benchPlayerIds.includes(p._id)
  ).map(p => ({
    value: p._id,
    label: `${p.firstName} ${p.lastName} (#${p.jerseyNumber})`
  })) || [];

  const goalTypes = [
    { value: 'regular', label: t('matches.goalTypes.regular') },
    { value: 'penalty', label: t('matches.goalTypes.penalty') },
    { value: 'free_kick', label: t('matches.goalTypes.freeKick') },
    { value: 'header', label: t('matches.goalTypes.header') },
    { value: 'own_goal', label: t('matches.goalTypes.ownGoal') },
  ];

  const cardTypes = [
    { value: 'yellow', label: t('matches.cardTypes.yellow') },
    { value: 'red', label: t('matches.cardTypes.red') },
    { value: 'second_yellow', label: t('matches.cardTypes.secondYellow') },
  ];

  const subReasons = [
    { value: 'tactical', label: t('matches.subReasons.tactical') },
    { value: 'injury', label: t('matches.subReasons.injury') },
    { value: 'fatigue', label: t('matches.subReasons.fatigue') },
    { value: 'performance', label: t('matches.subReasons.performance') },
  ];

  const tabs = [
    { id: 'lineup', label: t('matches.lineup'), icon: Users },
    { id: 'info', label: t('matches.matchInfo'), icon: Trophy },
    { id: 'goals', label: t('matches.goals'), icon: Target },
    { id: 'cards', label: t('matches.cards'), icon: CreditCard },
    { id: 'substitutions', label: t('matches.substitutions'), icon: ArrowLeftRight },
    { id: 'ratings', label: t('matches.ratings'), icon: Star },
    { id: 'statistics', label: t('matches.statistics'), icon: BarChart3 },
  ];

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
    <div className="space-y-6">
      {/* Match Header */}
      <div className="text-center pb-4 border-b border-gray-100">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Badge className={getStatusColor(match.status)}>
            {t(`matches.statuses.${match.status}`)}
          </Badge>
          <span className="text-sm text-gray-500">{match.competition}</span>
        </div>
        <div className="flex items-center justify-center gap-8">
          <div className="text-center">
            <p className="font-bold text-xl text-gray-900">{match.team?.name}</p>
            <p className="text-sm text-gray-500">{match.isHome ? t('matches.home') : t('matches.away')}</p>
          </div>
          <div className="px-6 py-3 bg-gray-100 rounded-lg">
            <p className="text-3xl font-bold text-gray-900">
              {score.home} - {score.away}
            </p>
          </div>
          <div className="text-center">
            <p className="font-bold text-xl text-gray-900">{match.opponent?.name}</p>
            <p className="text-sm text-gray-500">{match.isHome ? t('matches.away') : t('matches.home')}</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {formatDate(match.matchDate)} - {match.kickoffTime} | {match.venue}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[350px] max-h-[450px] overflow-y-auto">
        {/* Lineup Tab - Football Pitch Visualization */}
        {activeTab === 'lineup' && (
          <div className="space-y-4">
            {/* Formation Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-900">{match.team?.name}</span>
                <Badge variant="primary">{formation}</Badge>
              </div>
            </div>

            {/* Football Pitch */}
            <div className="relative w-full aspect-[3/4] max-h-[400px] bg-gradient-to-b from-green-600 to-green-700 rounded-xl overflow-hidden shadow-lg">
              {/* Pitch Lines */}
              <div className="absolute inset-0">
                {/* Center Line */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/40" />
                {/* Center Circle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white/40 rounded-full" />
                {/* Top Penalty Box */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-16 border-2 border-t-0 border-white/40" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-8 border-2 border-t-0 border-white/40" />
                {/* Bottom Penalty Box */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-16 border-2 border-b-0 border-white/40" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-8 border-2 border-b-0 border-white/40" />
              </div>

              {/* Players on Pitch */}
              {(() => {
                // Formation positions (percentage based)
                const formationPositions = {
                  '4-3-3': [
                    { pos: 'GK', x: 50, y: 92 },
                    { pos: 'LB', x: 15, y: 75 }, { pos: 'CB', x: 35, y: 78 }, { pos: 'CB', x: 65, y: 78 }, { pos: 'RB', x: 85, y: 75 },
                    { pos: 'CM', x: 30, y: 55 }, { pos: 'CM', x: 50, y: 50 }, { pos: 'CM', x: 70, y: 55 },
                    { pos: 'LW', x: 20, y: 25 }, { pos: 'ST', x: 50, y: 20 }, { pos: 'RW', x: 80, y: 25 },
                  ],
                  '4-4-2': [
                    { pos: 'GK', x: 50, y: 92 },
                    { pos: 'LB', x: 15, y: 75 }, { pos: 'CB', x: 35, y: 78 }, { pos: 'CB', x: 65, y: 78 }, { pos: 'RB', x: 85, y: 75 },
                    { pos: 'LM', x: 15, y: 50 }, { pos: 'CM', x: 38, y: 55 }, { pos: 'CM', x: 62, y: 55 }, { pos: 'RM', x: 85, y: 50 },
                    { pos: 'ST', x: 35, y: 22 }, { pos: 'ST', x: 65, y: 22 },
                  ],
                  '3-5-2': [
                    { pos: 'GK', x: 50, y: 92 },
                    { pos: 'CB', x: 25, y: 78 }, { pos: 'CB', x: 50, y: 80 }, { pos: 'CB', x: 75, y: 78 },
                    { pos: 'LM', x: 10, y: 50 }, { pos: 'CM', x: 30, y: 55 }, { pos: 'CM', x: 50, y: 50 }, { pos: 'CM', x: 70, y: 55 }, { pos: 'RM', x: 90, y: 50 },
                    { pos: 'ST', x: 35, y: 22 }, { pos: 'ST', x: 65, y: 22 },
                  ],
                  '4-2-3-1': [
                    { pos: 'GK', x: 50, y: 92 },
                    { pos: 'LB', x: 15, y: 75 }, { pos: 'CB', x: 35, y: 78 }, { pos: 'CB', x: 65, y: 78 }, { pos: 'RB', x: 85, y: 75 },
                    { pos: 'CDM', x: 35, y: 60 }, { pos: 'CDM', x: 65, y: 60 },
                    { pos: 'LW', x: 20, y: 38 }, { pos: 'CAM', x: 50, y: 40 }, { pos: 'RW', x: 80, y: 38 },
                    { pos: 'ST', x: 50, y: 18 },
                  ],
                };

                const positions = formationPositions[formation] || formationPositions['4-3-3'];

                // Get starting lineup from match.lineup or use team players
                const startingPlayers = match.lineup?.filter(l => !l.isSubstitute) || [];
                const displayPlayers = startingPlayers.length > 0
                  ? startingPlayers.map((l, i) => ({
                      ...l,
                      playerData: playersData?.find(p => p._id === (l.player?._id || l.player)),
                      position: positions[i] || positions[0]
                    }))
                  : (playersData?.slice(0, 11) || []).map((p, i) => ({
                      player: p._id,
                      playerData: p,
                      position: positions[i] || positions[0]
                    }));

                // Helper functions
                const getPlayerGoals = (playerId) => match.goals?.filter(g =>
                  (g.player?._id || g.player) === playerId
                ).length || 0;

                const getPlayerAssists = (playerId) => match.goals?.filter(g =>
                  (g.assist?._id || g.assist) === playerId
                ).length || 0;

                const getPlayerCard = (playerId) => match.cards?.find(c =>
                  (c.player?._id || c.player) === playerId
                );

                const getPlayerSub = (playerId) => match.substitutions?.find(s =>
                  (s.playerOut?._id || s.playerOut) === playerId
                );

                const getPlayerRating = (playerId) => {
                  const rating = match.playerRatings?.find(r =>
                    (r.player?._id || r.player) === playerId
                  );
                  return rating?.rating || null;
                };

                const getRatingColor = (rating) => {
                  if (!rating) return 'bg-gray-400';
                  if (rating >= 8) return 'bg-green-500';
                  if (rating >= 7) return 'bg-green-400';
                  if (rating >= 6) return 'bg-yellow-500';
                  if (rating >= 5) return 'bg-orange-500';
                  return 'bg-red-500';
                };

                return displayPlayers.map((item, index) => {
                  const player = item.playerData;
                  const pos = item.position || positions[index];
                  if (!player || !pos) return null;

                  const goals = getPlayerGoals(player._id);
                  const assists = getPlayerAssists(player._id);
                  const card = getPlayerCard(player._id);
                  const sub = getPlayerSub(player._id);
                  const rating = getPlayerRating(player._id);

                  return (
                    <div
                      key={player._id || index}
                      className="absolute flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    >
                      {/* Player Avatar */}
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-white border-2 border-white shadow-lg overflow-hidden">
                          {player.photo ? (
                            <img src={player.photo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-sm">
                              {player.jerseyNumber}
                            </div>
                          )}
                        </div>

                        {/* Rating Badge */}
                        {rating && (
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${getRatingColor(rating)} rounded text-white text-xs font-bold flex items-center justify-center shadow`}>
                            {rating}
                          </div>
                        )}

                        {/* Card Indicator */}
                        {card && (
                          <div className={`absolute -top-1 -right-1 w-3 h-4 rounded-sm shadow ${
                            card.type === 'yellow' ? 'bg-yellow-400' :
                            card.type === 'red' ? 'bg-red-500' : 'bg-gradient-to-b from-yellow-400 to-red-500'
                          }`} />
                        )}

                        {/* Goal Indicator */}
                        {goals > 0 && (
                          <div className="absolute -top-1 -left-1 min-w-[18px] h-[18px] bg-white rounded-full shadow flex items-center justify-center px-0.5">
                            <span className="text-xs">⚽</span>
                            {goals > 1 && <span className="text-[10px] font-bold text-gray-700">{goals}</span>}
                          </div>
                        )}

                        {/* Assist Indicator (boot icon) */}
                        {assists > 0 && (
                          <div className="absolute -top-1 left-5 min-w-[18px] h-[18px] bg-white rounded-full shadow flex items-center justify-center px-0.5">
                            <span className="text-xs">👟</span>
                            {assists > 1 && <span className="text-[10px] font-bold text-gray-700">{assists}</span>}
                          </div>
                        )}

                        {/* Substitution Indicator */}
                        {sub && (
                          <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-red-500 rounded-full shadow flex items-center justify-center">
                            <span className="text-white text-xs">↓</span>
                          </div>
                        )}
                      </div>

                      {/* Player Name */}
                      <div className="mt-1 px-1.5 py-0.5 bg-black/60 rounded text-white text-xs font-medium whitespace-nowrap max-w-[70px] truncate">
                        {player.jerseyNumber}. {player.lastName?.substring(0, 8) || player.firstName?.substring(0, 8)}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Substitutes Section */}
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 mb-3">{t('matches.substitutes')}</h4>
              <div className="space-y-2">
                {(() => {
                  // Get all bench players (not in starting 11)
                  const startingIds = match.lineup?.filter(l => !l.isSubstitute).map(l => l.player?._id || l.player) || [];
                  const effectiveStarting = startingIds.length > 0 ? startingIds : (playersData?.slice(0, 11).map(p => p._id) || []);

                  const allBenchPlayers = playersData?.filter(p => !effectiveStarting.includes(p._id)) || [];

                  if (allBenchPlayers.length === 0) {
                    return <p className="text-gray-500 text-sm">{t('matches.noSubstitutions')}</p>;
                  }

                  const getRatingColor = (r) => {
                    if (!r) return 'bg-gray-400';
                    if (r >= 8) return 'bg-green-500';
                    if (r >= 7) return 'bg-green-400';
                    if (r >= 6) return 'bg-yellow-500';
                    return 'bg-orange-500';
                  };

                  return allBenchPlayers.map((player, index) => {
                    // Check if this player came in as a substitute
                    const subInfo = match.substitutions?.find(s =>
                      (s.playerIn?._id || s.playerIn) === player._id
                    );
                    const playerOut = subInfo ? playersData?.find(p =>
                      p._id === (subInfo.playerOut?._id || subInfo.playerOut)
                    ) : null;

                    const rating = match.playerRatings?.find(r =>
                      (r.player?._id || r.player) === player._id
                    )?.rating;

                    const card = match.cards?.find(c =>
                      (c.player?._id || c.player) === player._id
                    );

                    const goals = match.goals?.filter(g =>
                      (g.player?._id || g.player) === player._id
                    ).length || 0;

                    const assists = match.goals?.filter(g =>
                      (g.assist?._id || g.assist) === player._id
                    ).length || 0;

                    return (
                      <div key={player._id || index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                          {player.photo ? (
                            <img src={player.photo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                              {player.jerseyNumber}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">
                              {player.jerseyNumber} {player.firstName} {player.lastName}
                            </span>
                            {/* Goal indicator */}
                            {goals > 0 && (
                              <span className="text-sm">⚽{goals > 1 && <span className="text-xs">{goals}</span>}</span>
                            )}
                            {/* Assist indicator */}
                            {assists > 0 && (
                              <span className="text-sm">👟{assists > 1 && <span className="text-xs">{assists}</span>}</span>
                            )}
                            {/* Card indicator */}
                            {card && (
                              <div className={`w-3 h-4 rounded-sm ${
                                card.type === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'
                              }`} />
                            )}
                          </div>
                          {subInfo ? (
                            <div className="flex items-center gap-1 text-sm text-green-600">
                              <span>↑</span>
                              <span>{subInfo.minute}'</span>
                              <span className="text-gray-400 mx-1">|</span>
                              <span className="text-gray-500">{t('matches.playerOut')}: {playerOut?.lastName || playerOut?.firstName}</span>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">
                              {t('matches.benchPlayers')}
                            </div>
                          )}
                        </div>
                        {rating && (
                          <div className={`w-8 h-8 ${getRatingColor(rating)} rounded text-white font-bold flex items-center justify-center text-sm`}>
                            {rating}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            {!isReadOnly && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {match.team?.name} {t('matches.score')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={score.home}
                    onChange={(e) => setScore({ ...score, home: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {match.opponent?.name} {t('matches.score')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={score.away}
                    onChange={(e) => setScore({ ...score, away: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('matches.formation')}
              </label>
              {isReadOnly ? (
                <p className="text-gray-900">{formation}</p>
              ) : (
                <select
                  value={formation}
                  onChange={(e) => setFormation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {formations.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('matches.manOfTheMatch')}
              </label>
              {isReadOnly ? (
                <p className="text-gray-900">{match.manOfTheMatch ? getPlayerName(match.manOfTheMatch) : '-'}</p>
              ) : (
                <select
                  value={manOfTheMatch}
                  onChange={(e) => setManOfTheMatch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- {t('common.none')} --</option>
                  {playerOptions.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('matches.coachNotes')}
              </label>
              {isReadOnly ? (
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{match.coachNotes || '-'}</p>
              ) : (
                <textarea
                  rows={4}
                  value={coachNotes}
                  onChange={(e) => setCoachNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder={t('matches.coachNotesPlaceholder')}
                />
              )}
            </div>
          </div>
        )}

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="space-y-4">
            {!isReadOnly && (
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  size="small"
                  icon={Plus}
                  onClick={() => setShowGoalForm(!showGoalForm)}
                >
                  {t('matches.addGoal')}
                </Button>
              </div>
            )}

            {showGoalForm && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('players.title')}</label>
                    <select
                      value={newGoal.player}
                      onChange={(e) => setNewGoal({ ...newGoal, player: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                    >
                      <option value="">--</option>
                      {playerOptions.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('matches.minute')}</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={newGoal.minute}
                      onChange={(e) => setNewGoal({ ...newGoal, minute: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('matches.type')}</label>
                    <select
                      value={newGoal.type}
                      onChange={(e) => setNewGoal({ ...newGoal, type: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                    >
                      {goalTypes.map(gt => (
                        <option key={gt.value} value={gt.value}>{gt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('matches.assist')}</label>
                    <select
                      value={newGoal.assist}
                      onChange={(e) => setNewGoal({ ...newGoal, assist: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                    >
                      <option value="">--</option>
                      {playerOptions.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="small" onClick={handleAddGoal} loading={addGoalMutation.isPending}>
                    {t('common.add')}
                  </Button>
                  <Button size="small" variant="secondary" onClick={() => setShowGoalForm(false)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            )}

            {/* Goals List */}
            <div className="space-y-2">
              {match.goals?.length > 0 ? (
                match.goals.map((goal, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Target className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{getPlayerName(goal.player)}</p>
                      <p className="text-sm text-gray-500">
                        {goal.assist && `${t('matches.assist')}: ${getPlayerName(goal.assist)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{goal.minute}'</p>
                      <p className="text-xs text-gray-500">{t(`matches.goalTypes.${goal.type}`)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {t('matches.noGoals')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cards Tab */}
        {activeTab === 'cards' && (
          <div className="space-y-4">
            {!isReadOnly && (
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  size="small"
                  icon={Plus}
                  onClick={() => setShowCardForm(!showCardForm)}
                >
                  {t('matches.addCard')}
                </Button>
              </div>
            )}

            {showCardForm && (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('players.title')}</label>
                    <select
                      value={newCard.player}
                      onChange={(e) => setNewCard({ ...newCard, player: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                    >
                      <option value="">--</option>
                      {playerOptions.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('matches.minute')}</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={newCard.minute}
                      onChange={(e) => setNewCard({ ...newCard, minute: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('matches.cardType')}</label>
                    <select
                      value={newCard.type}
                      onChange={(e) => setNewCard({ ...newCard, type: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                    >
                      {cardTypes.map(ct => (
                        <option key={ct.value} value={ct.value}>{ct.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('matches.reason')}</label>
                    <input
                      type="text"
                      value={newCard.reason}
                      onChange={(e) => setNewCard({ ...newCard, reason: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="small" onClick={handleAddCard} loading={addCardMutation.isPending}>
                    {t('common.add')}
                  </Button>
                  <Button size="small" variant="secondary" onClick={() => setShowCardForm(false)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            )}

            {/* Cards List */}
            <div className="space-y-2">
              {match.cards?.length > 0 ? (
                match.cards.map((card, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-6 h-8 rounded ${
                      card.type === 'yellow' ? 'bg-yellow-400' :
                      card.type === 'red' ? 'bg-red-500' : 'bg-gradient-to-b from-yellow-400 to-red-500'
                    }`} />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{getPlayerName(card.player)}</p>
                      {card.reason && <p className="text-sm text-gray-500">{card.reason}</p>}
                    </div>
                    <p className="font-bold text-gray-900">{card.minute}'</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {t('matches.noCards')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Substitutions Tab */}
        {activeTab === 'substitutions' && (
          <div className="space-y-4">
            {!isReadOnly && (
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  size="small"
                  icon={Plus}
                  onClick={() => setShowSubForm(!showSubForm)}
                >
                  {t('matches.addSubstitution')}
                </Button>
              </div>
            )}

            {showSubForm && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('matches.playerOut')}</label>
                    <select
                      value={newSub.playerOut}
                      onChange={(e) => setNewSub({ ...newSub, playerOut: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                    >
                      <option value="">--</option>
                      {fieldPlayerOptions.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('matches.playerIn')}</label>
                    <select
                      value={newSub.playerIn}
                      onChange={(e) => setNewSub({ ...newSub, playerIn: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                    >
                      <option value="">--</option>
                      {benchPlayerOptions.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('matches.minute')}</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={newSub.minute}
                      onChange={(e) => setNewSub({ ...newSub, minute: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('matches.reason')}</label>
                    <select
                      value={newSub.reason}
                      onChange={(e) => setNewSub({ ...newSub, reason: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                    >
                      {subReasons.map(sr => (
                        <option key={sr.value} value={sr.value}>{sr.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="small" onClick={handleAddSubstitution} loading={addSubMutation.isPending}>
                    {t('common.add')}
                  </Button>
                  <Button size="small" variant="secondary" onClick={() => setShowSubForm(false)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            )}

            {/* Substitutions List */}
            <div className="space-y-2">
              {match.substitutions?.length > 0 ? (
                match.substitutions.map((sub, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <ArrowLeftRight className="w-5 h-5 text-blue-500" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-red-500">↓</span>
                        <span className="font-medium">{getPlayerName(sub.playerOut)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-500">↑</span>
                        <span className="font-medium">{getPlayerName(sub.playerIn)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{sub.minute}'</p>
                      <p className="text-xs text-gray-500">{t(`matches.subReasons.${sub.reason}`)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {t('matches.noSubstitutions')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ratings Tab */}
        {activeTab === 'ratings' && (
          <div className="space-y-4">
            <div className="text-sm text-gray-500 mb-4">
              {t('matches.ratingsDescription')}
            </div>
            <div className="space-y-3">
              {playersData?.map((player) => {
                const currentRating = playerRatings[player._id] || 0;
                return (
                  <div key={player._id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                      {player.photo ? (
                        <img src={player.photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                          {player.jerseyNumber}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {player.jerseyNumber}. {player.firstName} {player.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{player.position}</p>
                    </div>
                    {isReadOnly ? (
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${
                        currentRating >= 8 ? 'bg-green-500' :
                        currentRating >= 7 ? 'bg-green-400' :
                        currentRating >= 6 ? 'bg-yellow-500' :
                        currentRating >= 5 ? 'bg-orange-500' :
                        currentRating > 0 ? 'bg-red-500' : 'bg-gray-300'
                      }`}>
                        {currentRating > 0 ? currentRating : '-'}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          value={currentRating}
                          onChange={(e) => setPlayerRatings({
                            ...playerRatings,
                            [player._id]: parseFloat(e.target.value)
                          })}
                          className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                          currentRating >= 8 ? 'bg-green-500' :
                          currentRating >= 7 ? 'bg-green-400' :
                          currentRating >= 6 ? 'bg-yellow-500' :
                          currentRating >= 5 ? 'bg-orange-500' :
                          currentRating > 0 ? 'bg-red-500' : 'bg-gray-300'
                        }`}>
                          {currentRating > 0 ? currentRating : '-'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'statistics' && (
          <div className="space-y-4">
            {[
              { key: 'possession', label: t('matches.possession'), suffix: '%', max: 100 },
              { key: 'shots', label: t('matches.shots'), max: 50 },
              { key: 'shotsOnTarget', label: t('matches.shotsOnTarget'), max: 30 },
              { key: 'corners', label: t('matches.corners'), max: 20 },
              { key: 'fouls', label: t('matches.fouls'), max: 30 },
            ].map((stat) => (
              <div key={stat.key}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{stat.label}</span>
                  <span className="text-sm font-bold text-gray-900">
                    {statistics[stat.key]}{stat.suffix || ''}
                  </span>
                </div>
                {isReadOnly ? (
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full"
                      style={{ width: `${(statistics[stat.key] / stat.max) * 100}%` }}
                    />
                  </div>
                ) : (
                  <input
                    type="range"
                    min="0"
                    max={stat.max}
                    value={statistics[stat.key]}
                    onChange={(e) => setStatistics({ ...statistics, [stat.key]: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button variant="secondary" onClick={onClose}>
          {t('common.close')}
        </Button>
        {!isReadOnly && (
          <Button icon={Save} onClick={handleSaveMatch} loading={saving}>
            {t('matches.saveAndComplete')}
          </Button>
        )}
      </div>
    </div>
  );
};

const Matches = () => {
  const { t } = useTranslation();
  const { user, isAdmin, isCoach } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [deletingMatch, setDeletingMatch] = useState(null);
  const [viewingMatchId, setViewingMatchId] = useState(null);

  // Handle navigation from calendar - open match detail
  useEffect(() => {
    if (location.state?.viewMatchId) {
      setViewingMatchId(location.state.viewMatchId);
      // Clear the state so it doesn't re-trigger on re-renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Generate year options (last 3 years to next year)
  const yearOptions = (() => {
    const options = [{ value: '', label: t('common.all') }];
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 3; year <= currentYear + 1; year++) {
      options.push({ value: String(year), label: String(year) });
    }
    return options;
  })();

  // Generate month options (1-12)
  const monthOptions = (() => {
    const options = [{ value: '', label: t('common.all') }];
    const monthNames = [
      t('months.january'), t('months.february'), t('months.march'),
      t('months.april'), t('months.may'), t('months.june'),
      t('months.july'), t('months.august'), t('months.september'),
      t('months.october'), t('months.november'), t('months.december')
    ];
    for (let i = 0; i < 12; i++) {
      options.push({ value: String(i + 1).padStart(2, '0'), label: monthNames[i] });
    }
    return options;
  })();

  // Calculate date range from selected year and month
  const getDateRange = (year, month) => {
    if (!year && !month) return { startDate: undefined, endDate: undefined };

    if (year && month) {
      const y = parseInt(year);
      const m = parseInt(month);
      const startDate = new Date(y, m - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(y, m, 0).toISOString().split('T')[0];
      return { startDate, endDate };
    } else if (year) {
      const y = parseInt(year);
      const startDate = new Date(y, 0, 1).toISOString().split('T')[0];
      const endDate = new Date(y, 11, 31).toISOString().split('T')[0];
      return { startDate, endDate };
    } else if (month) {
      const y = new Date().getFullYear();
      const m = parseInt(month);
      const startDate = new Date(y, m - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(y, m, 0).toISOString().split('T')[0];
      return { startDate, endDate };
    }
    return { startDate: undefined, endDate: undefined };
  };

  // Reset selectedTeam when user changes (coach vs admin)
  // Support multiple teams for coaches
  useEffect(() => {
    if (isCoach) {
      // Use teams array if available, fallback to single team
      const coachTeams = user?.teams?.length > 0 ? user.teams : (user?.team ? [user.team] : []);
      if (coachTeams.length > 0) {
        setSelectedTeam(coachTeams[0]._id);
      }
    } else {
      setSelectedTeam('');
    }
  }, [isCoach, user?.teams, user?.team]);

  const { startDate, endDate } = getDateRange(selectedYear, selectedMonth);

  const { data: matchesData, isLoading } = useQuery({
    queryKey: ['matches', selectedTeam, selectedYear, selectedMonth],
    queryFn: () => matchesAPI.getAll({
      team: selectedTeam || undefined,
      startDate,
      endDate,
      limit: 100
    }),
    select: (res) => res.data,
  });

  // Fetch single match by ID when navigating from calendar (may not be in filtered list)
  const { data: singleMatchData } = useQuery({
    queryKey: ['match', viewingMatchId],
    queryFn: () => matchesAPI.getById(viewingMatchId),
    enabled: !!viewingMatchId && !matchesData?.matches?.find(m => m._id === viewingMatchId),
    select: (res) => res.data.match || res.data,
  });

  // Get fresh match data from query or single fetch
  const viewingMatch = viewingMatchId
    ? matchesData?.matches?.find(m => m._id === viewingMatchId) || singleMatchData || null
    : null;

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsAPI.getAll({ limit: 100 }),
    select: (res) => res.data.teams,
  });

  const createMutation = useMutation({
    mutationFn: matchesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['matches']);
      setShowModal(false);
      toast.success(t('common.success'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => matchesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['matches']);
      setShowModal(false);
      setEditingMatch(null);
      toast.success(t('common.success'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: matchesAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['matches']);
      setDeletingMatch(null);
      toast.success(t('common.success'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const handleSubmit = (data) => {
    if (editingMatch) {
      updateMutation.mutate({ id: editingMatch._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditModal = (match) => {
    setEditingMatch({
      team: match.team?._id || match.team,
      opponentName: match.opponent?.name || '',
      matchDate: match.matchDate?.split('T')[0],
      kickoffTime: match.kickoffTime || '15:00',
      venue: match.venue || '',
      isHome: match.isHome !== false,
      competition: match.competition || 'Friendly',
      formation: match.formation || '4-3-3',
      _id: match._id,
    });
    setShowModal(true);
  };

  // For coaches, show their assigned teams; for admins, show all teams
  const teamOptions = isCoach
    ? (() => {
        // Use teams array if available, fallback to single team
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('matches.title')}</h1>
          <p className="text-gray-500">{matchesData?.total || 0} {t('matches.title').toLowerCase()}</p>
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>
          {t('matches.addMatch')}
        </Button>
      </div>

      {/* Filter */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('teams.title')}
            </label>
            <Select
              options={teamOptions}
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('matches.year')}
            </label>
            <Select
              options={yearOptions}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('matches.month')}
            </label>
            <Select
              options={monthOptions}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </Card>

      {/* Matches List */}
      {isLoading ? (
        <Loading />
      ) : matchesData?.matches?.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title={t('common.noData')}
          action={() => setShowModal(true)}
          actionLabel={t('matches.addMatch')}
          actionIcon={Plus}
        />
      ) : (
        <div className="space-y-4">
          {matchesData?.matches?.map((match) => (
            <Card
              key={match._id}
              className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setViewingMatchId(match._id)}
            >
              <div className="flex flex-col md:flex-row">
                {/* Match Info */}
                <div className="flex-1 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={getStatusColor(match.status)}>
                      {t(`matches.statuses.${match.status}`)}
                    </Badge>
                    <span className="text-sm text-gray-500">{match.competition}</span>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="text-center flex-1">
                      <p className="font-bold text-lg text-gray-900">{match.team?.name}</p>
                      <p className="text-sm text-gray-500">{match.isHome ? 'Home' : 'Away'}</p>
                    </div>

                    {match.status === 'completed' ? (
                      <div className={`px-6 py-3 rounded-lg text-center ${getResultColor(match.result)}`}>
                        <p className="text-3xl font-bold">
                          {match.score.home} - {match.score.away}
                        </p>
                        <p className="text-xs uppercase">{t(`matches.result.${match.result}`)}</p>
                      </div>
                    ) : (
                      <div className="px-6 py-3 text-center">
                        <p className="text-2xl font-bold text-gray-400">VS</p>
                      </div>
                    )}

                    <div className="text-center flex-1">
                      <p className="font-bold text-lg text-gray-900">{match.opponent.name}</p>
                      <p className="text-sm text-gray-500">{match.isHome ? 'Away' : 'Home'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(match.matchDate)} - {match.kickoffTime}</span>
                    </div>
                    {match.venue && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{match.venue}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex md:flex-col items-center justify-center gap-2 p-4 bg-gray-50 border-t md:border-t-0 md:border-l border-gray-100" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setViewingMatchId(match._id)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => openEditModal(match)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setDeletingMatch(match)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
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
          setEditingMatch(null);
        }}
        title={editingMatch ? t('matches.editMatch') : t('matches.addMatch')}
        size="large"
      >
        <MatchForm
          match={editingMatch}
          teams={teamsData || []}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowModal(false);
            setEditingMatch(null);
          }}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>

      {/* Match Detail Modal */}
      <Modal
        isOpen={!!viewingMatchId && !!viewingMatch}
        onClose={() => setViewingMatchId(null)}
        title={t('matches.matchDetails')}
        size="xlarge"
      >
        <MatchDetailModal
          match={viewingMatch}
          onClose={() => setViewingMatchId(null)}
          t={t}
          isReadOnly={isAdmin}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingMatch}
        onClose={() => setDeletingMatch(null)}
        onConfirm={() => deleteMutation.mutate(deletingMatch._id)}
        title={t('common.delete')}
        message={t('common.confirm')}
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default Matches;
