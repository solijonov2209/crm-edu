import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { teamsAPI, usersAPI } from '../../utils/api';
import { Card, Loading, Button, Input, Select, Modal, Badge, EmptyState, ConfirmDialog } from '../../components/common';
import { Plus, Edit, Trash2, Users, Trophy, Shield } from 'lucide-react';
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

const Teams = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [deletingTeam, setDeletingTeam] = useState(null);

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
            <Card key={team._id} className="overflow-hidden hover:shadow-md transition-shadow">
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
                  <div className="flex gap-1">
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
    </div>
  );
};

export default Teams;
