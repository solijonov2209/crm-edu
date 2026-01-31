import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { usersAPI, teamsAPI } from '../../utils/api';
import { Card, Loading, Button, Input, Select, Modal, Avatar, Badge, EmptyState, ConfirmDialog } from '../../components/common';
import { Plus, Edit, Trash2, UserCircle, Key, Shield } from 'lucide-react';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CoachForm = ({ coach, teams, onSubmit, onClose, loading }) => {
  const { t } = useTranslation();
  const [selectedTeams, setSelectedTeams] = useState(coach?.teams || []);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: coach || {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
    }
  });

  const toggleTeam = (teamId) => {
    setSelectedTeams(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const onFormSubmit = (data) => {
    onSubmit({ ...data, teams: selectedTeams });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
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
          label={t('common.email')}
          type="email"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email'
            }
          })}
        />
        {!coach && (
          <Input
            label={t('common.password')}
            type="password"
            error={errors.password?.message}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 6, message: 'Min 6 characters' }
            })}
          />
        )}
        <Input
          label={t('common.phone')}
          {...register('phone')}
        />
      </div>

      {/* Multi-select teams */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('coaches.assignTeam')}
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">
          {teams.map(team => (
            <label
              key={team._id}
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                selectedTeams.includes(team._id)
                  ? 'bg-primary-50 border border-primary-200'
                  : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedTeams.includes(team._id)}
                onChange={() => toggleTeam(team._id)}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <span className="text-sm text-gray-700">
                {team.name} <span className="text-gray-400">({team.ageCategory})</span>
              </span>
            </label>
          ))}
        </div>
        {selectedTeams.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {selectedTeams.length} {selectedTeams.length === 1 ? 'team' : 'teams'} selected
          </p>
        )}
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

const Coaches = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingCoach, setEditingCoach] = useState(null);
  const [deletingCoach, setDeletingCoach] = useState(null);
  const [resetPasswordCoach, setResetPasswordCoach] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const { data: coachesData, isLoading } = useQuery({
    queryKey: ['coaches'],
    queryFn: () => usersAPI.getAll({ role: 'coach', limit: 100 }),
    select: (res) => res.data,
  });

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsAPI.getAll({ limit: 100 }),
    select: (res) => res.data.teams,
  });

  const createMutation = useMutation({
    mutationFn: usersAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['coaches']);
      setShowModal(false);
      toast.success(t('common.success'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => usersAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['coaches']);
      setShowModal(false);
      setEditingCoach(null);
      toast.success(t('common.success'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: usersAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['coaches']);
      setDeletingCoach(null);
      toast.success(t('common.success'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }) => usersAPI.resetPassword(id, { newPassword }),
    onSuccess: () => {
      setResetPasswordCoach(null);
      setNewPassword('');
      toast.success(t('common.success'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const handleSubmit = (data) => {
    if (editingCoach) {
      updateMutation.mutate({ id: editingCoach._id, data });
    } else {
      createMutation.mutate({ ...data, role: 'coach' });
    }
  };

  const openEditModal = (coach) => {
    // Support both teams array and single team for backward compatibility
    const coachTeams = coach.teams?.length > 0
      ? coach.teams.map(t => t._id || t)
      : (coach.team ? [coach.team._id || coach.team] : []);
    setEditingCoach({
      ...coach,
      teams: coachTeams
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('coaches.title')}</h1>
          <p className="text-gray-500">{coachesData?.total || 0} {t('coaches.title').toLowerCase()}</p>
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>
          {t('coaches.addCoach')}
        </Button>
      </div>

      {/* Coaches Grid */}
      {isLoading ? (
        <Loading />
      ) : coachesData?.users?.length === 0 ? (
        <EmptyState
          icon={UserCircle}
          title={t('common.noData')}
          action={() => setShowModal(true)}
          actionLabel={t('coaches.addCoach')}
          actionIcon={Plus}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coachesData?.users?.map((coach) => (
            <Card key={coach._id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <Avatar
                    src={coach.photo}
                    firstName={coach.firstName}
                    lastName={coach.lastName}
                    size="large"
                  />
                  <Badge variant={coach.isActive ? 'success' : 'danger'}>
                    {coach.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="mb-4">
                  <h3 className="font-bold text-lg text-gray-900">
                    {coach.firstName} {coach.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">{coach.email}</p>
                  {coach.phone && (
                    <p className="text-sm text-gray-500">{coach.phone}</p>
                  )}
                </div>

                {/* Display assigned teams - support both teams array and single team */}
                {(coach.teams?.length > 0 || coach.team) ? (
                  <div className="flex flex-wrap items-center gap-2 p-3 bg-primary-50 rounded-lg mb-4">
                    <Shield className="w-5 h-5 text-primary-600" />
                    {coach.teams?.length > 0 ? (
                      coach.teams.map(team => (
                        <Badge key={team._id} variant="primary" className="text-xs">
                          {team.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm font-medium text-primary-700">
                        {coach.team.name}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg mb-4">
                    <Shield className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      No team assigned
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    Last login: {coach.lastLogin ? formatDate(coach.lastLogin) : 'Never'}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setResetPasswordCoach(coach)}
                      className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg"
                      title={t('coaches.resetPassword')}
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(coach)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingCoach(coach)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
          setEditingCoach(null);
        }}
        title={editingCoach ? t('coaches.editCoach') : t('coaches.addCoach')}
        size="large"
      >
        <CoachForm
          coach={editingCoach}
          teams={teamsData || []}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowModal(false);
            setEditingCoach(null);
          }}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetPasswordCoach}
        onClose={() => {
          setResetPasswordCoach(null);
          setNewPassword('');
        }}
        title={t('coaches.resetPassword')}
        size="small"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Reset password for {resetPasswordCoach?.firstName} {resetPasswordCoach?.lastName}
          </p>
          <Input
            label={t('settings.newPassword')}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setResetPasswordCoach(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => resetPasswordMutation.mutate({
                id: resetPasswordCoach._id,
                newPassword
              })}
              loading={resetPasswordMutation.isPending}
              disabled={newPassword.length < 6}
            >
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingCoach}
        onClose={() => setDeletingCoach(null)}
        onConfirm={() => deleteMutation.mutate(deletingCoach._id)}
        title={t('common.delete')}
        message={t('common.confirm')}
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default Coaches;
