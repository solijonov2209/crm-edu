import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { matchesAPI, teamsAPI, playersAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Card, Loading, Button, Input, Select, Modal, Badge, EmptyState, ConfirmDialog, Avatar } from '../../components/common';
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
  const [activeTab, setActiveTab] = useState('info');
  const [saving, setSaving] = useState(false);

  // Local state for match data
  const [score, setScore] = useState({ home: match?.score?.home || 0, away: match?.score?.away || 0 });
  const [statistics, setStatistics] = useState(match?.statistics || {
    possession: 50, shots: 0, shotsOnTarget: 0, corners: 0, fouls: 0
  });
  const [coachNotes, setCoachNotes] = useState(match?.coachNotes || '');
  const [manOfTheMatch, setManOfTheMatch] = useState(match?.manOfTheMatch?._id || '');

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
      await updateMatchMutation.mutateAsync({
        score,
        statistics,
        coachNotes,
        manOfTheMatch: manOfTheMatch || undefined,
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
    { id: 'info', label: t('matches.matchInfo'), icon: Trophy },
    { id: 'goals', label: t('matches.goals'), icon: Target },
    { id: 'cards', label: t('matches.cards'), icon: CreditCard },
    { id: 'substitutions', label: t('matches.substitutions'), icon: ArrowLeftRight },
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
                      {playerOptions.map(p => (
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
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [deletingMatch, setDeletingMatch] = useState(null);
  const [viewingMatchId, setViewingMatchId] = useState(null);

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

  const { data: matchesData, isLoading } = useQuery({
    queryKey: ['matches', selectedTeam],
    queryFn: () => matchesAPI.getAll({
      team: selectedTeam || undefined,
      limit: 50
    }),
    select: (res) => res.data,
  });

  // Get fresh match data from query (auto-updates when query is invalidated)
  const viewingMatch = viewingMatchId
    ? matchesData?.matches?.find(m => m._id === viewingMatchId)
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
        <Select
          options={teamOptions}
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="w-full sm:w-64"
        />
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
