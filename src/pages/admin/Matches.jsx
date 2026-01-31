import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { matchesAPI, teamsAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Card, Loading, Button, Input, Select, Modal, Badge, EmptyState, ConfirmDialog } from '../../components/common';
import { Plus, Trophy, Edit, Trash2, Calendar, MapPin } from 'lucide-react';
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

const Matches = () => {
  const { t } = useTranslation();
  const { user, isAdmin, isCoach } = useAuth();
  const queryClient = useQueryClient();
  // For coaches, auto-set to their team
  const [selectedTeam, setSelectedTeam] = useState(isCoach && user?.team?._id ? user.team._id : '');
  const [showModal, setShowModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [deletingMatch, setDeletingMatch] = useState(null);

  const { data: matchesData, isLoading } = useQuery({
    queryKey: ['matches', selectedTeam],
    queryFn: () => matchesAPI.getAll({
      team: selectedTeam,
      limit: 50
    }),
    select: (res) => res.data,
  });

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

  // For coaches, only show their team; for admins, show all teams
  const teamOptions = isCoach
    ? (user?.team ? [{ value: user.team._id, label: user.team.name }] : [])
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
            <Card key={match._id} className="overflow-hidden hover:shadow-md transition-shadow">
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
                <div className="flex md:flex-col items-center justify-center gap-2 p-4 bg-gray-50 border-t md:border-t-0 md:border-l border-gray-100">
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
