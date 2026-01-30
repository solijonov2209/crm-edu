import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { trainingsAPI, teamsAPI, playersAPI } from '../../utils/api';
import { Card, Loading, Button, Input, Select, Modal, Badge, EmptyState, ConfirmDialog, Avatar } from '../../components/common';
import { Plus, Calendar, Edit, Trash2, Users, CheckCircle, XCircle, Clock, Camera, Video, Star, MessageSquare, Save, Eye } from 'lucide-react';
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

// Training Detail Modal with Attendance, Evaluation, and Media
const TrainingDetailModal = ({ training, onClose, t }) => {
  const queryClient = useQueryClient();
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('attendance');
  const [attendance, setAttendance] = useState([]);
  const [coachNotes, setCoachNotes] = useState(training?.coachNotes || '');
  const [overallRating, setOverallRating] = useState(training?.overallRating || 5);
  const [saving, setSaving] = useState(false);

  // Fetch team players
  const { data: playersData, isLoading: playersLoading } = useQuery({
    queryKey: ['players', training?.team?._id],
    queryFn: () => playersAPI.getByTeam(training?.team?._id),
    enabled: !!training?.team?._id,
    select: (res) => res.data.players,
  });

  // Initialize attendance when players or training loads
  useEffect(() => {
    if (playersData && training) {
      const existingAttendance = training.attendance || [];
      const initialAttendance = playersData.map(player => {
        const existing = existingAttendance.find(a =>
          a.player === player._id || a.player?._id === player._id
        );
        if (existing) {
          return {
            ...existing,
            player: player._id
          };
        }
        return {
          player: player._id,
          status: 'present',
          rating: 5,
          performance: { effort: 5, technique: 5, attitude: 5, teamwork: 5 },
          notes: ''
        };
      });
      setAttendance(initialAttendance);
    }
  }, [playersData, training]);

  const updateAttendanceMutation = useMutation({
    mutationFn: (data) => trainingsAPI.updateAttendance(training._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['trainings']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const updateTrainingMutation = useMutation({
    mutationFn: (data) => trainingsAPI.update(training._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['trainings']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const getPlayerAttendance = (playerId) => {
    return attendance.find(a => a.player === playerId) || {
      player: playerId,
      status: 'present',
      rating: 5,
      performance: { effort: 5, technique: 5, attitude: 5, teamwork: 5 },
      notes: ''
    };
  };

  const updatePlayerAttendance = (playerId, field, value) => {
    setAttendance(prev => {
      return prev.map(a => {
        if (a.player === playerId) {
          if (field.includes('.')) {
            const [parent, child] = field.split('.');
            return { ...a, [parent]: { ...a[parent], [child]: value } };
          }
          return { ...a, [field]: value };
        }
        return a;
      });
    });
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      await updateAttendanceMutation.mutateAsync({ attendance });
      await updateTrainingMutation.mutateAsync({
        coachNotes,
        overallRating,
        status: 'completed'
      });
      toast.success(t('common.success'));
      onClose();
    } catch (error) {
      // Error handled by mutation
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = e.target.files;
    if (files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('photos', files[i]);
    }

    try {
      await trainingsAPI.uploadPhotos(training._id, formData);
      queryClient.invalidateQueries(['trainings']);
      toast.success(t('common.success'));
    } catch (error) {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('video', file);

    try {
      await trainingsAPI.uploadVideo(training._id, formData);
      queryClient.invalidateQueries(['trainings']);
      toast.success(t('common.success'));
    } catch (error) {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  };

  const attendanceStatuses = [
    { value: 'present', label: t('trainings.attendanceStatus.present'), color: 'bg-green-500' },
    { value: 'absent', label: t('trainings.attendanceStatus.absent'), color: 'bg-red-500' },
    { value: 'late', label: t('trainings.attendanceStatus.late'), color: 'bg-yellow-500' },
    { value: 'excused', label: t('trainings.attendanceStatus.excused'), color: 'bg-gray-500' },
    { value: 'injured', label: t('trainings.attendanceStatus.injured'), color: 'bg-orange-500' },
  ];

  const tabs = [
    { id: 'attendance', label: t('trainings.attendance'), icon: Users },
    { id: 'evaluation', label: t('trainings.evaluation'), icon: Star },
    { id: 'notes', label: t('trainings.coachNotes'), icon: MessageSquare },
    { id: 'media', label: t('trainings.media'), icon: Camera },
  ];

  if (!training) return null;

  return (
    <div className="space-y-6">
      {/* Training Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{training.team?.name}</h2>
          <p className="text-gray-500">
            {formatDate(training.date)} | {training.startTime} - {training.endTime}
          </p>
          <Badge className={getStatusColor(training.status)}>
            {t(`trainings.statuses.${training.status}`)}
          </Badge>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">{t('trainings.type')}</p>
          <Badge variant="primary">{t(`trainings.types.${training.type}`)}</Badge>
        </div>
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
      <div className="min-h-[400px] max-h-[500px] overflow-y-auto">
        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="space-y-3">
            {playersLoading ? (
              <Loading />
            ) : (
              playersData?.map((player) => {
                const playerAtt = getPlayerAttendance(player._id);
                return (
                  <div key={player._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
                    <div className="flex gap-1 flex-wrap justify-end">
                      {attendanceStatuses.map((status) => (
                        <button
                          key={status.value}
                          onClick={() => updatePlayerAttendance(player._id, 'status', status.value)}
                          className={`px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                            playerAtt.status === status.value
                              ? `${status.color} text-white`
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }`}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Evaluation Tab */}
        {activeTab === 'evaluation' && (
          <div className="space-y-4">
            {playersLoading ? (
              <Loading />
            ) : (
              playersData?.filter(player => {
                const att = getPlayerAttendance(player._id);
                return att.status !== 'absent';
              }).map((player) => {
                const playerAtt = getPlayerAttendance(player._id);
                return (
                  <div key={player._id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 mb-4">
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
                        <p className="text-xs text-gray-500">#{player.jerseyNumber}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                      {['effort', 'technique', 'attitude', 'teamwork'].map((metric) => (
                        <div key={metric}>
                          <label className="text-xs text-gray-500 block mb-1">
                            {t(`trainings.${metric}`)}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="1"
                              max="10"
                              value={playerAtt.performance?.[metric] || 5}
                              onChange={(e) => updatePlayerAttendance(player._id, `performance.${metric}`, parseInt(e.target.value))}
                              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-sm font-bold text-primary-600 w-6">
                              {playerAtt.performance?.[metric] || 5}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 block mb-1">
                          {t('trainings.playerRating')}
                        </label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <button
                              key={num}
                              onClick={() => updatePlayerAttendance(player._id, 'rating', num)}
                              className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                                num <= (playerAtt.rating || 5)
                                  ? 'bg-yellow-400 text-white'
                                  : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <input
                        type="text"
                        placeholder={t('trainings.playerNotes')}
                        value={playerAtt.notes || ''}
                        onChange={(e) => updatePlayerAttendance(player._id, 'notes', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Coach Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('trainings.overallRating')}
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    onClick={() => setOverallRating(num)}
                    className={`w-10 h-10 rounded-lg text-lg font-bold transition-colors ${
                      num <= overallRating
                        ? 'bg-yellow-400 text-white'
                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('trainings.coachNotes')}
              </label>
              <textarea
                rows={6}
                value={coachNotes}
                onChange={(e) => setCoachNotes(e.target.value)}
                placeholder={t('trainings.coachNotesPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        )}

        {/* Media Tab */}
        {activeTab === 'media' && (
          <div className="space-y-6">
            {/* Photos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">{t('trainings.photos')}</h3>
                <Button
                  variant="secondary"
                  size="small"
                  icon={Camera}
                  onClick={() => photoInputRef.current?.click()}
                >
                  {t('trainings.uploadPhotos')}
                </Button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {training.photos?.map((photo, index) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img src={photo.url} alt={photo.caption || ''} className="w-full h-full object-cover" />
                  </div>
                ))}
                {(!training.photos || training.photos.length === 0) && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    {t('trainings.noPhotos')}
                  </div>
                )}
              </div>
            </div>

            {/* Videos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">{t('trainings.videos')}</h3>
                <Button
                  variant="secondary"
                  size="small"
                  icon={Video}
                  onClick={() => videoInputRef.current?.click()}
                >
                  {t('trainings.uploadVideo')}
                </Button>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {training.videos?.map((video, index) => (
                  <div key={index} className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                    <video src={video.url} controls className="w-full h-full object-cover" />
                  </div>
                ))}
                {(!training.videos || training.videos.length === 0) && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    {t('trainings.noVideos')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button variant="secondary" onClick={onClose}>
          {t('common.close')}
        </Button>
        <Button icon={Save} onClick={handleSaveAttendance} loading={saving}>
          {t('trainings.saveAndComplete')}
        </Button>
      </div>
    </div>
  );
};

const Trainings = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTraining, setEditingTraining] = useState(null);
  const [deletingTraining, setDeletingTraining] = useState(null);
  const [viewingTraining, setViewingTraining] = useState(null);

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
            <Card
              key={training._id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setViewingTraining(training)}
            >
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

                <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
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
                      onClick={() => setViewingTraining(training)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
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

      {/* Training Detail Modal */}
      <Modal
        isOpen={!!viewingTraining}
        onClose={() => setViewingTraining(null)}
        title={t('trainings.trainingDetails')}
        size="xlarge"
      >
        <TrainingDetailModal
          training={viewingTraining}
          onClose={() => setViewingTraining(null)}
          t={t}
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
