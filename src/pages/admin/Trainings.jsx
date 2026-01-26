import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { trainingsAPI, teamsAPI } from '../../utils/api';
import { Card, Loading, Button, Input, Select, Modal, Badge, EmptyState, ConfirmDialog } from '../../components/common';
import { Plus, Calendar, Edit, Trash2, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatDate, getStatusColor, trainingTypes } from '../../utils/helpers';
import toast from 'react-hot-toast';

const TrainingForm = ({ training, teams, onSubmit, onClose, loading }) => {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: training || {
      team: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '16:00',
      endTime: '18:00',
      location: 'Main Training Ground',
      type: 'regular',
      description: '',
    }
  });

  const typeOptions = trainingTypes.map(type => ({
    value: type,
    label: t(`trainings.types.${type}`)
  }));

  const teamOptions = teams.map(team => ({
    value: team._id,
    label: `${team.name} (${team.ageCategory})`
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label={t('teams.title')}
          options={teamOptions}
          placeholder={`-- ${t('teams.title')} --`}
          error={errors.team?.message}
          {...register('team', { required: 'Team is required' })}
        />
        <Input
          label={t('trainings.date')}
          type="date"
          error={errors.date?.message}
          {...register('date', { required: 'Date is required' })}
        />
        <Input
          label={t('trainings.startTime')}
          type="time"
          error={errors.startTime?.message}
          {...register('startTime', { required: 'Start time is required' })}
        />
        <Input
          label={t('trainings.endTime')}
          type="time"
          error={errors.endTime?.message}
          {...register('endTime', { required: 'End time is required' })}
        />
        <Input
          label={t('trainings.location')}
          {...register('location')}
        />
        <Select
          label={t('trainings.type')}
          options={typeOptions}
          {...register('type')}
        />
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

const Trainings = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTraining, setEditingTraining] = useState(null);
  const [deletingTraining, setDeletingTraining] = useState(null);

  const { data: trainingsData, isLoading } = useQuery({
    queryKey: ['trainings', selectedTeam],
    queryFn: () => trainingsAPI.getAll({
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
    mutationFn: trainingsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['trainings']);
      setShowModal(false);
      toast.success(t('common.success'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => trainingsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['trainings']);
      setShowModal(false);
      setEditingTraining(null);
      toast.success(t('common.success'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: trainingsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['trainings']);
      setDeletingTraining(null);
      toast.success(t('common.success'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const handleSubmit = (data) => {
    if (editingTraining) {
      updateMutation.mutate({ id: editingTraining._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditModal = (training) => {
    setEditingTraining({
      ...training,
      date: training.date?.split('T')[0],
      team: training.team?._id || training.team
    });
    setShowModal(true);
  };

  const teamOptions = [
    { value: '', label: t('common.all') },
    ...(teamsData || []).map(team => ({
      value: team._id,
      label: team.name
    }))
  ];

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('trainings.title')}</h1>
          <p className="text-gray-500">{trainingsData?.total || 0} {t('trainings.title').toLowerCase()}</p>
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>
          {t('trainings.addTraining')}
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

      {/* Trainings List */}
      {isLoading ? (
        <Loading />
      ) : trainingsData?.trainings?.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={t('common.noData')}
          action={() => setShowModal(true)}
          actionLabel={t('trainings.addTraining')}
          actionIcon={Plus}
        />
      ) : (
        <div className="space-y-4">
          {trainingsData?.trainings?.map((training) => (
            <Card key={training._id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                    {getStatusIcon(training.status)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{training.team?.name}</h3>
                      <Badge className={getStatusColor(training.status)}>
                        {t(`trainings.statuses.${training.status}`)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDate(training.date)} | {training.startTime} - {training.endTime}
                    </p>
                    <p className="text-sm text-gray-400">{training.location}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">
                      {training.attendanceStats?.percentage || 0}%
                    </p>
                    <p className="text-xs text-gray-500">{t('trainings.attendance')}</p>
                  </div>

                  <Badge variant="primary">
                    {t(`trainings.types.${training.type}`)}
                  </Badge>

                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(training)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingTraining(training)}
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
          setEditingTraining(null);
        }}
        title={editingTraining ? t('trainings.editTraining') : t('trainings.addTraining')}
        size="large"
      >
        <TrainingForm
          training={editingTraining}
          teams={teamsData || []}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowModal(false);
            setEditingTraining(null);
          }}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingTraining}
        onClose={() => setDeletingTraining(null)}
        onConfirm={() => deleteMutation.mutate(deletingTraining._id)}
        title={t('common.delete')}
        message={t('common.confirm')}
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default Trainings;
