import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { teamsAPI, usersAPI, trainingsAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Card, Loading, Button, Input, Select, Modal, Badge, EmptyState, ConfirmDialog, Avatar } from '../../components/common';
import { Plus, Edit, Trash2, Users, Trophy, Shield, Calendar, Eye, CheckCircle, XCircle, Clock, Star, ChevronRight, ArrowLeft } from 'lucide-react';
import { formatDate, getStatusColor } from '../../utils/helpers';
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

// Team Detail Modal with Trainings List
const TeamDetailModal = ({ team, onClose, onViewTraining, t }) => {
  useAuth();

  // Fetch trainings for this team
  const { data: trainingsData, isLoading } = useQuery({
    queryKey: ['trainings', team?._id],
    queryFn: () => trainingsAPI.getAll({ team: team?._id, limit: 50 }),
    enabled: !!team?._id,
    select: (res) => res.data?.trainings,
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

  if (!team) return null;

  return (
    <div className="space-y-6">
      {/* Team Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: team.primaryColor }}
        >
          <Shield className="w-8 h-8 text-white opacity-80" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{team.name}</h2>
          <p className="text-gray-500">{team.ageCategory} ({team.birthYear})</p>
          {team.coach && (
            <p className="text-sm text-gray-600">
              {t('teams.coach')}: {team.coach.firstName} {team.coach.lastName}
            </p>
          )}
        </div>
        <div className="ml-auto text-right">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-green-600 font-semibold">{team.statistics?.wins || 0} {t('dashboard.wins')}</span>
            <span className="text-yellow-600 font-semibold">{team.statistics?.draws || 0} {t('dashboard.draws')}</span>
            <span className="text-red-600 font-semibold">{team.statistics?.losses || 0} {t('dashboard.losses')}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            <Users className="w-3 h-3 inline mr-1" />
            {team.playerCount || 0} {t('players.title').toLowerCase()}
          </p>
        </div>
      </div>

      {/* Trainings List */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-500" />
          {t('trainings.title')}
        </h3>

        {isLoading ? (
          <Loading />
        ) : !trainingsData || trainingsData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('common.noData')}
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {trainingsData.map((training) => (
              <div
                key={training._id}
                onClick={() => onViewTraining(training)}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                    {getStatusIcon(training.status)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatDate(training.date)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {training.startTime} - {training.endTime} | {t(`trainings.types.${training.type}`)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Attendance Stats */}
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">
                      {training.attendanceStats?.percentage || 0}%
                    </p>
                    <p className="text-xs text-gray-500">{t('trainings.attendance')}</p>
                  </div>

                  {/* Overall Rating */}
                  {training.overallRating && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 rounded-lg">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-bold text-yellow-700">{training.overallRating}</span>
                    </div>
                  )}

                  <Badge className={getStatusColor(training.status)}>
                    {t(`trainings.statuses.${training.status}`)}
                  </Badge>

                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
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

                {/* View Trainings Hint */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-center text-primary-600 text-sm">
                  <Eye className="w-4 h-4 mr-2" />
                  {t('teams.viewTrainings')}
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
        isOpen={!!viewingTeam && !viewingTraining}
        onClose={() => setViewingTeam(null)}
        title={t('teams.teamDetails')}
        size="xlarge"
      >
        <TeamDetailModal
          team={viewingTeam}
          onClose={() => setViewingTeam(null)}
          onViewTraining={(training) => setViewingTraining(training)}
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
    </div>
  );
};

export default Teams;
