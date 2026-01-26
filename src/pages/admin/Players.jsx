import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { playersAPI, teamsAPI } from '../../utils/api';
import { Card, Loading, Button, Input, Select, Modal, Avatar, Badge, EmptyState, ConfirmDialog } from '../../components/common';
import { Plus, Search, Edit, Trash2, Eye, Users, Download } from 'lucide-react';
import { formatDate, getPositionColor, calculateAge, getOverallRating, positions } from '../../utils/helpers';
import toast from 'react-hot-toast';

const PlayerForm = ({ player, teams, onSubmit, onClose, loading }) => {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: player || {
      firstName: '',
      lastName: '',
      fatherName: '',
      birthDate: '',
      position: 'CM',
      jerseyNumber: '',
      preferredFoot: 'right',
      height: '',
      weight: '',
      team: '',
      parentName: '',
      parentPhone: '',
    }
  });

  const positionOptions = positions.map(p => ({
    value: p,
    label: t(`players.positions.${p}`)
  }));

  const teamOptions = teams.map(team => ({
    value: team._id,
    label: `${team.name} (${team.ageCategory})`
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label={t('players.firstName')}
          error={errors.firstName?.message}
          {...register('firstName', { required: 'First name is required' })}
        />
        <Input
          label={t('players.lastName')}
          error={errors.lastName?.message}
          {...register('lastName', { required: 'Last name is required' })}
        />
        <Input
          label={t('players.fatherName')}
          {...register('fatherName')}
        />
        <Input
          label={t('players.birthDate')}
          type="date"
          error={errors.birthDate?.message}
          {...register('birthDate', { required: 'Birth date is required' })}
        />
        <Select
          label={t('players.position')}
          options={positionOptions}
          error={errors.position?.message}
          {...register('position', { required: 'Position is required' })}
        />
        <Input
          label={t('players.jerseyNumber')}
          type="number"
          min="1"
          max="99"
          {...register('jerseyNumber', { valueAsNumber: true })}
        />
        <Select
          label={t('players.preferredFoot')}
          options={[
            { value: 'right', label: 'Right' },
            { value: 'left', label: 'Left' },
            { value: 'both', label: 'Both' },
          ]}
          {...register('preferredFoot')}
        />
        <Select
          label={t('teams.title')}
          options={teamOptions}
          placeholder={`-- ${t('teams.title')} --`}
          error={errors.team?.message}
          {...register('team', { required: 'Team is required' })}
        />
        <Input
          label={t('players.height')}
          type="number"
          min="100"
          max="220"
          {...register('height', { valueAsNumber: true })}
        />
        <Input
          label={t('players.weight')}
          type="number"
          min="20"
          max="150"
          {...register('weight', { valueAsNumber: true })}
        />
        <Input
          label={t('players.parentName')}
          {...register('parentName')}
        />
        <Input
          label={t('players.parentPhone')}
          {...register('parentPhone')}
        />
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

const Players = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [deletingPlayer, setDeletingPlayer] = useState(null);

  const { data: playersData, isLoading } = useQuery({
    queryKey: ['players', searchTerm, selectedTeam, selectedPosition],
    queryFn: () => playersAPI.getAll({
      search: searchTerm,
      team: selectedTeam,
      position: selectedPosition,
      limit: 100
    }),
    select: (res) => res.data,
  });

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsAPI.getAll({ limit: 100 }),
    select: (res) => res.data.teams,
  });

  const createMutation = useMutation({
    mutationFn: playersAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['players']);
      setShowModal(false);
      toast.success(t('common.success'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => playersAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['players']);
      setShowModal(false);
      setEditingPlayer(null);
      toast.success(t('common.success'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: playersAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['players']);
      setDeletingPlayer(null);
      toast.success(t('common.success'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const handleSubmit = (data) => {
    if (editingPlayer) {
      updateMutation.mutate({ id: editingPlayer._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditModal = (player) => {
    setEditingPlayer({
      ...player,
      birthDate: player.birthDate?.split('T')[0],
      team: player.team?._id || player.team
    });
    setShowModal(true);
  };

  const positionOptions = [
    { value: '', label: t('common.all') },
    ...positions.map(p => ({ value: p, label: t(`players.positions.${p}`) }))
  ];

  const teamOptions = [
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
          <h1 className="text-2xl font-bold text-gray-900">{t('players.title')}</h1>
          <p className="text-gray-500">{playersData?.total || 0} {t('players.title').toLowerCase()}</p>
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>
          {t('players.addPlayer')}
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <Select
            options={teamOptions}
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="w-full sm:w-48"
          />
          <Select
            options={positionOptions}
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
      </Card>

      {/* Players Grid */}
      {isLoading ? (
        <Loading />
      ) : playersData?.players?.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('common.noData')}
          action={() => setShowModal(true)}
          actionLabel={t('players.addPlayer')}
          actionIcon={Plus}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {playersData?.players?.map((player) => (
            <Card key={player._id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <Avatar
                    src={player.photo}
                    firstName={player.firstName}
                    lastName={player.lastName}
                    size="large"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(player)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingPlayer(player)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    {player.jerseyNumber && (
                      <span className="text-lg font-bold text-gray-400">#{player.jerseyNumber}</span>
                    )}
                    <h3 className="font-semibold text-gray-900">
                      {player.firstName} {player.lastName}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500">{player.team?.name}</p>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getPositionColor(player.position)}`}>
                    {t(`players.positions.${player.position}`)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {player.age} {t('players.age').toLowerCase()}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100 text-center">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{player.statistics?.matchesPlayed || 0}</p>
                    <p className="text-xs text-gray-500">{t('matches.title')}</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">{player.statistics?.goals || 0}</p>
                    <p className="text-xs text-gray-500">{t('players.goals')}</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-600">{player.statistics?.assists || 0}</p>
                    <p className="text-xs text-gray-500">{t('players.assists')}</p>
                  </div>
                </div>

                {/* Rating */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{t('players.overallRating')}</span>
                    <span className="text-xl font-bold text-primary-600">{player.overallRating || 50}</span>
                  </div>
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
          setEditingPlayer(null);
        }}
        title={editingPlayer ? t('players.editPlayer') : t('players.addPlayer')}
        size="large"
      >
        <PlayerForm
          player={editingPlayer}
          teams={teamsData || []}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowModal(false);
            setEditingPlayer(null);
          }}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingPlayer}
        onClose={() => setDeletingPlayer(null)}
        onConfirm={() => deleteMutation.mutate(deletingPlayer._id)}
        title={t('common.delete')}
        message={`${t('common.confirm')} "${deletingPlayer?.firstName} ${deletingPlayer?.lastName}"?`}
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default Players;
