import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { matchesAPI, playersAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Card, Loading, Button, Badge } from '../../components/common';
import { ArrowLeft, Users, Trophy, Target, CreditCard, ArrowLeftRight, BarChart3, Star, Save, Plus } from 'lucide-react';
import { formatDate, getStatusColor, formations } from '../../utils/helpers';
import toast from 'react-hot-toast';

const MatchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const isReadOnly = isAdmin;

  const [activeTab, setActiveTab] = useState('lineup');
  const [saving, setSaving] = useState(false);

  // Fetch match data
  const { data: match, isLoading } = useQuery({
    queryKey: ['match', id],
    queryFn: () => matchesAPI.getById(id),
    select: (res) => res.data,
    enabled: !!id,
  });

  // Local state for match data
  const [score, setScore] = useState({ home: 0, away: 0 });
  const [statistics, setStatistics] = useState({
    possession: 50, shots: 0, shotsOnTarget: 0, corners: 0, fouls: 0
  });
  const [coachNotes, setCoachNotes] = useState('');
  const [manOfTheMatch, setManOfTheMatch] = useState('');
  const [formation, setFormation] = useState('4-3-3');
  const [playerRatings, setPlayerRatings] = useState({});

  // Initialize state when match loads
  useEffect(() => {
    if (match) {
      setScore({ home: match.score?.home || 0, away: match.score?.away || 0 });
      setStatistics(match.statistics || { possession: 50, shots: 0, shotsOnTarget: 0, corners: 0, fouls: 0 });
      setCoachNotes(match.coachNotes || '');
      setManOfTheMatch(match.manOfTheMatch?._id || '');
      setFormation(match.formation || '4-3-3');

      const ratings = {};
      match.playerRatings?.forEach(r => {
        const playerId = r.player?._id || r.player;
        if (playerId) ratings[playerId] = r.rating;
      });
      setPlayerRatings(ratings);
    }
  }, [match]);

  // For adding new items
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showSubForm, setShowSubForm] = useState(false);
  const [newGoal, setNewGoal] = useState({ player: '', minute: '', type: 'regular', assist: '' });
  const [newCard, setNewCard] = useState({ player: '', minute: '', type: 'yellow', reason: '' });
  const [newSub, setNewSub] = useState({ playerOut: '', playerIn: '', minute: '', reason: 'tactical' });

  // Fetch team players
  const { data: playersData, isLoading: playersLoading } = useQuery({
    queryKey: ['players', match?.team?._id],
    queryFn: () => playersAPI.getByTeam(match?.team?._id),
    enabled: !!match?.team?._id,
    select: (res) => res.data.players,
  });

  // Mutations
  const addGoalMutation = useMutation({
    mutationFn: (data) => matchesAPI.addGoal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['match', id]);
      setShowGoalForm(false);
      setNewGoal({ player: '', minute: '', type: 'regular', assist: '' });
      toast.success(t('common.success'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('common.error'))
  });

  const addCardMutation = useMutation({
    mutationFn: (data) => matchesAPI.addCard(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['match', id]);
      setShowCardForm(false);
      setNewCard({ player: '', minute: '', type: 'yellow', reason: '' });
      toast.success(t('common.success'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('common.error'))
  });

  const addSubMutation = useMutation({
    mutationFn: (data) => matchesAPI.addSubstitution(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['match', id]);
      setShowSubForm(false);
      setNewSub({ playerOut: '', playerIn: '', minute: '', reason: 'tactical' });
      toast.success(t('common.success'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('common.error'))
  });

  const updateMatchMutation = useMutation({
    mutationFn: (data) => matchesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['match', id]);
      queryClient.invalidateQueries(['matches']);
      toast.success(t('common.success'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('common.error'))
  });

  const handleSaveMatch = async () => {
    setSaving(true);
    try {
      const ratingsArray = Object.entries(playerRatings)
        .filter(([_, rating]) => rating > 0)
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
      navigate(-1);
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
  const effectiveStartingIds = startingPlayerIds.length > 0
    ? startingPlayerIds
    : (playersData?.slice(0, 11).map(p => p._id) || []);

  const playersIn = match?.substitutions?.map(s => s.playerIn?._id || s.playerIn) || [];
  const playersOut = match?.substitutions?.map(s => s.playerOut?._id || s.playerOut) || [];

  const currentFieldPlayerIds = [
    ...effectiveStartingIds.filter(id => !playersOut.includes(id)),
    ...playersIn
  ];

  const benchPlayerIds = playersData?.filter(p =>
    !effectiveStartingIds.includes(p._id) && !playersIn.includes(p._id)
  ).map(p => p._id) || [];

  const fieldPlayerOptions = playersData?.filter(p =>
    currentFieldPlayerIds.includes(p._id)
  ).map(p => ({
    value: p._id,
    label: `${p.firstName} ${p.lastName} (#${p.jerseyNumber})`
  })) || [];

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

  const getPlayerName = (playerId) => {
    if (!playerId) return '-';
    if (typeof playerId === 'object') {
      return `${playerId.firstName} ${playerId.lastName}`;
    }
    const player = playersData?.find(p => p._id === playerId);
    return player ? `${player.firstName} ${player.lastName}` : '-';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('common.noData')}</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate(-1)}>
          {t('common.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(-1)}>
          {t('common.back')}
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{t('matches.matchDetails')}</h1>
        </div>
      </div>

      {/* Match Score Card */}
      <Card className="p-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Badge className={getStatusColor(match.status)}>
              {t(`matches.statuses.${match.status}`)}
            </Badge>
            <span className="text-sm text-gray-500">{match.competition}</span>
          </div>
          <div className="flex items-center justify-center gap-8 md:gap-16">
            <div className="text-center flex-1">
              <p className="font-bold text-xl md:text-2xl text-gray-900">{match.team?.name}</p>
              <p className="text-sm text-gray-500">{match.isHome ? t('matches.home') : t('matches.away')}</p>
            </div>
            <div className="px-8 py-4 bg-gray-100 rounded-xl">
              <p className="text-4xl md:text-5xl font-bold text-gray-900">
                {score.home} - {score.away}
              </p>
            </div>
            <div className="text-center flex-1">
              <p className="font-bold text-xl md:text-2xl text-gray-900">{match.opponent?.name}</p>
              <p className="text-sm text-gray-500">{match.isHome ? t('matches.away') : t('matches.home')}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            {formatDate(match.matchDate)} - {match.kickoffTime} | {match.venue}
          </p>
        </div>
      </Card>

      {/* Tabs */}
      <Card className="p-2">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Tab Content */}
      <Card className="p-6">
        {/* Lineup Tab */}
        {activeTab === 'lineup' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-900">{match.team?.name}</span>
                <Badge variant="primary">{formation}</Badge>
              </div>
            </div>

            {/* Football Pitch */}
            <div className="relative w-full max-w-2xl mx-auto aspect-[3/4] bg-gradient-to-b from-green-600 to-green-700 rounded-xl overflow-hidden shadow-lg">
              {/* Pitch Lines */}
              <div className="absolute inset-0">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/40" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/40 rounded-full" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 border-2 border-t-0 border-white/40" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-10 border-2 border-t-0 border-white/40" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-20 border-2 border-b-0 border-white/40" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-10 border-2 border-b-0 border-white/40" />
              </div>

              {/* Players on Pitch */}
              {(() => {
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
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-white border-2 border-white shadow-lg overflow-hidden">
                          {player.photo ? (
                            <img src={player.photo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold">
                              {player.jerseyNumber}
                            </div>
                          )}
                        </div>

                        {rating && (
                          <div className={`absolute -bottom-1 -right-1 w-6 h-6 ${getRatingColor(rating)} rounded text-white text-xs font-bold flex items-center justify-center shadow`}>
                            {rating}
                          </div>
                        )}

                        {card && (
                          <div className={`absolute -top-1 -right-1 w-4 h-5 rounded-sm shadow ${
                            card.type === 'yellow' ? 'bg-yellow-400' :
                            card.type === 'red' ? 'bg-red-500' : 'bg-gradient-to-b from-yellow-400 to-red-500'
                          }`} />
                        )}

                        {goals > 0 && (
                          <div className="absolute -top-1 -left-1 min-w-[20px] h-[20px] bg-white rounded-full shadow flex items-center justify-center px-0.5">
                            <span className="text-sm">⚽</span>
                            {goals > 1 && <span className="text-xs font-bold text-gray-700">{goals}</span>}
                          </div>
                        )}

                        {assists > 0 && (
                          <div className="absolute -top-1 left-6 min-w-[20px] h-[20px] bg-white rounded-full shadow flex items-center justify-center px-0.5">
                            <span className="text-sm">👟</span>
                            {assists > 1 && <span className="text-xs font-bold text-gray-700">{assists}</span>}
                          </div>
                        )}

                        {sub && (
                          <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-red-500 rounded-full shadow flex items-center justify-center">
                            <span className="text-white text-xs">↓</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-1 px-2 py-0.5 bg-black/60 rounded text-white text-xs font-medium whitespace-nowrap">
                        {player.jerseyNumber}. {player.lastName?.substring(0, 8) || player.firstName?.substring(0, 8)}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Substitutes Section */}
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-4">{t('matches.substitutes')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(() => {
                  const startingIds = match.lineup?.filter(l => !l.isSubstitute).map(l => l.player?._id || l.player) || [];
                  const effectiveStarting = startingIds.length > 0 ? startingIds : (playersData?.slice(0, 11).map(p => p._id) || []);

                  const allBenchPlayers = playersData?.filter(p => !effectiveStarting.includes(p._id)) || [];

                  if (allBenchPlayers.length === 0) {
                    return <p className="text-gray-500 text-sm col-span-full">{t('matches.noSubstitutions')}</p>;
                  }

                  const getRatingColor = (r) => {
                    if (!r) return 'bg-gray-400';
                    if (r >= 8) return 'bg-green-500';
                    if (r >= 7) return 'bg-green-400';
                    if (r >= 6) return 'bg-yellow-500';
                    return 'bg-orange-500';
                  };

                  return allBenchPlayers.map((player, index) => {
                    const subInfo = match.substitutions?.find(s =>
                      (s.playerIn?._id || s.playerIn) === player._id
                    );
                    const playerOut = subInfo ? playersData?.find(p =>
                      p._id === (subInfo.playerOut?._id || subInfo.playerOut)
                    ) : null;

                    const rating = match.playerRatings?.find(r =>
                      (r.player?._id || r.player) === player._id
                    )?.rating;

                    return (
                      <div key={player._id || index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
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
                          <span className="font-medium text-gray-900 truncate block">
                            {player.jerseyNumber} {player.firstName} {player.lastName}
                          </span>
                          {subInfo ? (
                            <div className="flex items-center gap-1 text-sm text-green-600">
                              <span>↑</span>
                              <span>{subInfo.minute}'</span>
                              <span className="text-gray-400 mx-1">|</span>
                              <span className="text-gray-500">{playerOut?.lastName || playerOut?.firstName}</span>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">{t('matches.benchPlayers')}</div>
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
          <div className="space-y-6 max-w-2xl">
            {!isReadOnly && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {match.team?.name} {t('matches.score')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={score.home}
                    onChange={(e) => setScore({ ...score, home: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 text-xl font-bold text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {match.opponent?.name} {t('matches.score')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={score.away}
                    onChange={(e) => setScore({ ...score, away: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 text-xl font-bold text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('matches.formation')}
              </label>
              {isReadOnly ? (
                <p className="text-lg text-gray-900">{formation}</p>
              ) : (
                <select
                  value={formation}
                  onChange={(e) => setFormation(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {formations.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('matches.manOfTheMatch')}
              </label>
              {isReadOnly ? (
                <p className="text-lg text-gray-900">{match.manOfTheMatch ? getPlayerName(match.manOfTheMatch) : '-'}</p>
              ) : (
                <select
                  value={manOfTheMatch}
                  onChange={(e) => setManOfTheMatch(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- {t('common.none')} --</option>
                  {playerOptions.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('matches.coachNotes')}
              </label>
              {isReadOnly ? (
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg min-h-[120px]">{match.coachNotes || '-'}</p>
              ) : (
                <textarea
                  rows={5}
                  value={coachNotes}
                  onChange={(e) => setCoachNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                  icon={Plus}
                  onClick={() => setShowGoalForm(!showGoalForm)}
                >
                  {t('matches.addGoal')}
                </Button>
              </div>
            )}

            {showGoalForm && (
              <div className="p-6 bg-green-50 rounded-xl border border-green-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">{t('players.title')}</label>
                    <select
                      value={newGoal.player}
                      onChange={(e) => setNewGoal({ ...newGoal, player: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">--</option>
                      {playerOptions.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">{t('matches.minute')}</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={newGoal.minute}
                      onChange={(e) => setNewGoal({ ...newGoal, minute: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">{t('matches.type')}</label>
                    <select
                      value={newGoal.type}
                      onChange={(e) => setNewGoal({ ...newGoal, type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      {goalTypes.map(gt => (
                        <option key={gt.value} value={gt.value}>{gt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">{t('matches.assist')}</label>
                    <select
                      value={newGoal.assist}
                      onChange={(e) => setNewGoal({ ...newGoal, assist: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">--</option>
                      {playerOptions.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleAddGoal} loading={addGoalMutation.isPending}>
                    {t('common.add')}
                  </Button>
                  <Button variant="secondary" onClick={() => setShowGoalForm(false)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {match.goals?.length > 0 ? (
                match.goals.map((goal, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <Target className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{getPlayerName(goal.player)}</p>
                      <p className="text-sm text-gray-500">
                        {goal.assist && `${t('matches.assist')}: ${getPlayerName(goal.assist)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">{goal.minute}'</p>
                      <p className="text-sm text-gray-500">{t(`matches.goalTypes.${goal.type}`)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
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
                  icon={Plus}
                  onClick={() => setShowCardForm(!showCardForm)}
                >
                  {t('matches.addCard')}
                </Button>
              </div>
            )}

            {showCardForm && (
              <div className="p-6 bg-yellow-50 rounded-xl border border-yellow-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">{t('players.title')}</label>
                    <select
                      value={newCard.player}
                      onChange={(e) => setNewCard({ ...newCard, player: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">--</option>
                      {playerOptions.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">{t('matches.minute')}</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={newCard.minute}
                      onChange={(e) => setNewCard({ ...newCard, minute: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">{t('matches.cardType')}</label>
                    <select
                      value={newCard.type}
                      onChange={(e) => setNewCard({ ...newCard, type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      {cardTypes.map(ct => (
                        <option key={ct.value} value={ct.value}>{ct.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">{t('matches.reason')}</label>
                    <input
                      type="text"
                      value={newCard.reason}
                      onChange={(e) => setNewCard({ ...newCard, reason: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleAddCard} loading={addCardMutation.isPending}>
                    {t('common.add')}
                  </Button>
                  <Button variant="secondary" onClick={() => setShowCardForm(false)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {match.cards?.length > 0 ? (
                match.cards.map((card, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className={`w-8 h-10 rounded ${
                      card.type === 'yellow' ? 'bg-yellow-400' :
                      card.type === 'red' ? 'bg-red-500' : 'bg-gradient-to-b from-yellow-400 to-red-500'
                    }`} />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{getPlayerName(card.player)}</p>
                      {card.reason && <p className="text-sm text-gray-500">{card.reason}</p>}
                    </div>
                    <p className="text-xl font-bold text-gray-900">{card.minute}'</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
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
                  icon={Plus}
                  onClick={() => setShowSubForm(!showSubForm)}
                >
                  {t('matches.addSubstitution')}
                </Button>
              </div>
            )}

            {showSubForm && (
              <div className="p-6 bg-blue-50 rounded-xl border border-blue-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">{t('matches.playerOut')}</label>
                    <select
                      value={newSub.playerOut}
                      onChange={(e) => setNewSub({ ...newSub, playerOut: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">--</option>
                      {fieldPlayerOptions.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">{t('matches.playerIn')}</label>
                    <select
                      value={newSub.playerIn}
                      onChange={(e) => setNewSub({ ...newSub, playerIn: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">--</option>
                      {benchPlayerOptions.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">{t('matches.minute')}</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={newSub.minute}
                      onChange={(e) => setNewSub({ ...newSub, minute: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">{t('matches.reason')}</label>
                    <select
                      value={newSub.reason}
                      onChange={(e) => setNewSub({ ...newSub, reason: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      {subReasons.map(sr => (
                        <option key={sr.value} value={sr.value}>{sr.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleAddSubstitution} loading={addSubMutation.isPending}>
                    {t('common.add')}
                  </Button>
                  <Button variant="secondary" onClick={() => setShowSubForm(false)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {match.substitutions?.length > 0 ? (
                match.substitutions.map((sub, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <ArrowLeftRight className="w-6 h-6 text-blue-500" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-red-500 font-bold">↓</span>
                        <span className="font-medium">{getPlayerName(sub.playerOut)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-500 font-bold">↑</span>
                        <span className="font-medium">{getPlayerName(sub.playerIn)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">{sub.minute}'</p>
                      <p className="text-sm text-gray-500">{t(`matches.subReasons.${sub.reason}`)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  {t('matches.noSubstitutions')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ratings Tab */}
        {activeTab === 'ratings' && (
          <div className="space-y-4">
            <p className="text-gray-500 mb-6">{t('matches.ratingsDescription')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {playersData?.map((player) => {
                const currentRating = playerRatings[player._id] || 0;
                return (
                  <div key={player._id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
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
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg ${
                        currentRating >= 8 ? 'bg-green-500' :
                        currentRating >= 7 ? 'bg-green-400' :
                        currentRating >= 6 ? 'bg-yellow-500' :
                        currentRating >= 5 ? 'bg-orange-500' :
                        currentRating > 0 ? 'bg-red-500' : 'bg-gray-300'
                      }`}>
                        {currentRating > 0 ? currentRating : '-'}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
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
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg ${
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
          <div className="space-y-6 max-w-xl">
            {[
              { key: 'possession', label: t('matches.possession'), suffix: '%', max: 100 },
              { key: 'shots', label: t('matches.shots'), max: 50 },
              { key: 'shotsOnTarget', label: t('matches.shotsOnTarget'), max: 30 },
              { key: 'corners', label: t('matches.corners'), max: 20 },
              { key: 'fouls', label: t('matches.fouls'), max: 30 },
            ].map((stat) => (
              <div key={stat.key}>
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-gray-700">{stat.label}</span>
                  <span className="font-bold text-gray-900 text-lg">
                    {statistics[stat.key]}{stat.suffix || ''}
                  </span>
                </div>
                {isReadOnly ? (
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
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
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex justify-end gap-4">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            {t('common.cancel')}
          </Button>
          <Button icon={Save} onClick={handleSaveMatch} loading={saving}>
            {t('matches.saveAndComplete')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default MatchDetail;
