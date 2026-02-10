import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trainingsAPI, playersAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Card, Loading, Button, Badge, Avatar } from '../../components/common';
import { ArrowLeft, Users, Star, MessageSquare, Camera, Video, FileText, Save, Plus, Link, X, Download } from 'lucide-react';
import { formatDate, getStatusColor } from '../../utils/helpers';
import toast from 'react-hot-toast';

const TrainingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const isReadOnly = isAdmin;

  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const planInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('attendance');
  const [attendance, setAttendance] = useState([]);
  const [coachNotes, setCoachNotes] = useState('');
  const [overallRating, setOverallRating] = useState(5);
  const [saving, setSaving] = useState(false);

  // Photo/Video preview states
  const [photoPreview, setPhotoPreview] = useState([]);
  const [videoPreview, setVideoPreview] = useState(null);
  const [youtubeLink, setYoutubeLink] = useState('');
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [planUploading, setPlanUploading] = useState(false);

  // Fetch training data
  const { data: training, isLoading } = useQuery({
    queryKey: ['training', id],
    queryFn: () => trainingsAPI.getById(id),
    select: (res) => res.data.training,
    enabled: !!id,
  });

  // Fetch team players
  const { data: playersData, isLoading: playersLoading } = useQuery({
    queryKey: ['players', training?.team?._id],
    queryFn: () => playersAPI.getByTeam(training?.team?._id),
    enabled: !!training?.team?._id,
    select: (res) => res.data.players,
  });

  // Initialize state when training/players load
  useEffect(() => {
    if (training) {
      setCoachNotes(training.coachNotes || '');
      setOverallRating(training.overallRating || 5);
    }
  }, [training]);

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
          status: 'absent',
          rating: 5,
          performance: { effort: 5, technique: 5, attitude: 5, teamwork: 5 },
          notes: ''
        };
      });
      setAttendance(initialAttendance);
    }
  }, [playersData, training]);

  const updateAttendanceMutation = useMutation({
    mutationFn: (data) => trainingsAPI.updateAttendance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['training', id]);
      queryClient.invalidateQueries(['trainings']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const updateTrainingMutation = useMutation({
    mutationFn: (data) => trainingsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['training', id]);
      queryClient.invalidateQueries(['trainings']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const getPlayerAttendance = (playerId) => {
    return attendance.find(a => a.player === playerId) || {
      player: playerId,
      status: 'absent',
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
      navigate(-1);
    } catch (error) {
      // Error handled by mutation
    } finally {
      setSaving(false);
    }
  };

  // Photo handlers
  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const previews = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name
    }));
    setPhotoPreview(previews);
  };

  const handlePhotoUpload = async () => {
    if (photoPreview.length === 0) return;

    const formData = new FormData();
    photoPreview.forEach(p => formData.append('photos', p.file));

    try {
      await trainingsAPI.uploadPhotos(id, formData);
      queryClient.invalidateQueries(['training', id]);
      toast.success(t('common.success'));
      photoPreview.forEach(p => URL.revokeObjectURL(p.url));
      setPhotoPreview([]);
    } catch (error) {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  };

  const cancelPhotoUpload = () => {
    photoPreview.forEach(p => URL.revokeObjectURL(p.url));
    setPhotoPreview([]);
  };

  // Video handlers
  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setVideoPreview({
      file,
      url: URL.createObjectURL(file),
      name: file.name
    });
  };

  const handleVideoUpload = async () => {
    if (!videoPreview) return;

    const formData = new FormData();
    formData.append('video', videoPreview.file);

    try {
      await trainingsAPI.uploadVideo(id, formData);
      queryClient.invalidateQueries(['training', id]);
      toast.success(t('common.success'));
      URL.revokeObjectURL(videoPreview.url);
      setVideoPreview(null);
    } catch (error) {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  };

  const cancelVideoUpload = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview.url);
      setVideoPreview(null);
    }
  };

  // YouTube handlers
  const getYoutubeVideoId = (url) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleAddYoutubeLink = async () => {
    const videoId = getYoutubeVideoId(youtubeLink);
    if (!videoId) {
      toast.error(t('trainings.invalidYoutubeLink'));
      return;
    }

    try {
      await trainingsAPI.update(id, {
        videos: [...(training.videos || []), {
          url: youtubeLink,
          type: 'youtube',
          videoId: videoId,
          uploadedAt: new Date()
        }]
      });
      queryClient.invalidateQueries(['training', id]);
      toast.success(t('common.success'));
      setYoutubeLink('');
      setShowYoutubeInput(false);
    } catch (error) {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  };

  // Training plan upload
  const handlePlanUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (!validTypes.includes(file.type)) {
      toast.error(t('trainings.invalidPlanType'));
      return;
    }

    setPlanUploading(true);
    const formData = new FormData();
    formData.append('document', file);

    try {
      await trainingsAPI.uploadPlan(id, formData);
      queryClient.invalidateQueries(['training', id]);
      toast.success(t('common.success'));
    } catch (error) {
      toast.error(error.response?.data?.message || t('common.error'));
    } finally {
      setPlanUploading(false);
    }
  };

  // Attendance helpers
  const isPlayerPresent = (playerId) => {
    const att = getPlayerAttendance(playerId);
    return att.status === 'present' || att.status === 'late';
  };

  const toggleAttendance = (playerId) => {
    const current = getPlayerAttendance(playerId);
    const newStatus = (current.status === 'present' || current.status === 'late') ? 'absent' : 'present';
    updatePlayerAttendance(playerId, 'status', newStatus);
  };

  const specialStatuses = [
    { value: 'late', label: t('trainings.attendanceStatus.late'), color: 'bg-yellow-500' },
    { value: 'excused', label: t('trainings.attendanceStatus.excused'), color: 'bg-gray-500' },
    { value: 'injured', label: t('trainings.attendanceStatus.injured'), color: 'bg-orange-500' },
  ];

  const tabs = [
    { id: 'plan', label: t('trainings.trainingPlan'), icon: FileText },
    { id: 'attendance', label: t('trainings.attendance'), icon: Users },
    { id: 'evaluation', label: t('trainings.evaluation'), icon: Star },
    { id: 'notes', label: t('trainings.coachNotes'), icon: MessageSquare },
    { id: 'media', label: t('trainings.media'), icon: Camera },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading />
      </div>
    );
  }

  if (!training) {
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
          <h1 className="text-2xl font-bold text-gray-900">{t('trainings.trainingDetails')}</h1>
        </div>
      </div>

      {/* Training Info Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{training.team?.name}</h2>
            <p className="text-gray-500">
              {formatDate(training.date)} | {training.startTime} - {training.endTime}
            </p>
            <p className="text-gray-400">{training.location}</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge className={getStatusColor(training.status)}>
              {t(`trainings.statuses.${training.status}`)}
            </Badge>
            <Badge variant="primary">{t(`trainings.types.${training.type}`)}</Badge>
          </div>
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
        {/* Training Plan Tab */}
        {activeTab === 'plan' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">{t('trainings.trainingPlan')}</h3>
              {!isReadOnly && (
                <>
                  <Button
                    variant="secondary"
                    icon={FileText}
                    onClick={() => planInputRef.current?.click()}
                    loading={planUploading}
                  >
                    {t('trainings.uploadPlan')}
                  </Button>
                  <input
                    ref={planInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handlePlanUpload}
                    className="hidden"
                  />
                </>
              )}
            </div>

            {training.trainingPlan?.url ? (
              <div className="p-6 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-red-100 flex items-center justify-center">
                    <FileText className="w-7 h-7 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{training.trainingPlan.originalName}</p>
                    <p className="text-sm text-gray-500">
                      {(training.trainingPlan.size / 1024).toFixed(1)} KB •
                      {new Date(training.trainingPlan.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <a
                    href={training.trainingPlan.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    {t('common.download')}
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-xl">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">{t('trainings.noPlan')}</p>
                {!isReadOnly && (
                  <p className="text-sm mt-2">{t('trainings.uploadPlanHint')}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('trainings.attendance')}</h3>
            {playersLoading ? (
              <Loading />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {playersData?.map((player) => {
                  const playerAtt = getPlayerAttendance(player._id);
                  const present = isPlayerPresent(player._id);
                  return (
                    <div key={player._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={player.photo}
                          firstName={player.firstName}
                          lastName={player.lastName}
                          size="medium"
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            {player.firstName} {player.lastName}
                          </p>
                          <p className="text-sm text-gray-500">#{player.jerseyNumber} - {player.position}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isReadOnly ? (
                          <span className={`px-4 py-2 text-sm font-medium rounded-full text-white ${
                            playerAtt.status === 'present' ? 'bg-green-500' :
                            playerAtt.status === 'late' ? 'bg-yellow-500' :
                            playerAtt.status === 'excused' ? 'bg-gray-500' :
                            playerAtt.status === 'injured' ? 'bg-orange-500' : 'bg-red-500'
                          }`}>
                            {t(`trainings.attendanceStatus.${playerAtt.status}`)}
                          </span>
                        ) : (
                          <>
                            <input
                              type="checkbox"
                              checked={present}
                              onChange={() => toggleAttendance(player._id)}
                              className="w-6 h-6 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                            />
                            {specialStatuses.map((status) => (
                              <button
                                key={status.value}
                                onClick={() => updatePlayerAttendance(player._id, 'status', status.value)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                                  playerAtt.status === status.value
                                    ? `${status.color} text-white`
                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                }`}
                                title={status.label}
                              >
                                {status.label}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Evaluation Tab */}
        {activeTab === 'evaluation' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('trainings.evaluation')}</h3>
            {playersLoading ? (
              <Loading />
            ) : (
              playersData?.filter(player => {
                const att = getPlayerAttendance(player._id);
                return att.status !== 'absent';
              }).map((player) => {
                const playerAtt = getPlayerAttendance(player._id);
                return (
                  <div key={player._id} className="p-6 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-4 mb-6">
                      <Avatar
                        src={player.photo}
                        firstName={player.firstName}
                        lastName={player.lastName}
                        size="medium"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {player.firstName} {player.lastName}
                        </p>
                        <p className="text-sm text-gray-500">#{player.jerseyNumber}</p>
                      </div>
                      {isReadOnly && (
                        <div className="flex items-center gap-2">
                          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                          <span className="text-xl font-bold text-gray-900">{playerAtt.rating || '-'}/10</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                      {['effort', 'technique', 'attitude', 'teamwork'].map((metric) => (
                        <div key={metric}>
                          <label className="text-sm text-gray-500 block mb-2">
                            {t(`trainings.${metric}`)}
                          </label>
                          {isReadOnly ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary-500 rounded-full"
                                  style={{ width: `${((playerAtt.performance?.[metric] || 5) / 10) * 100}%` }}
                                />
                              </div>
                              <span className="text-lg font-bold text-primary-600 w-8">
                                {playerAtt.performance?.[metric] || 5}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min="1"
                                max="10"
                                value={playerAtt.performance?.[metric] || 5}
                                onChange={(e) => updatePlayerAttendance(player._id, `performance.${metric}`, parseInt(e.target.value))}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                              />
                              <span className="text-lg font-bold text-primary-600 w-8">
                                {playerAtt.performance?.[metric] || 5}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {!isReadOnly && (
                      <div className="mb-4">
                        <label className="text-sm text-gray-500 block mb-2">
                          {t('trainings.playerRating')}
                        </label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <button
                              key={num}
                              onClick={() => updatePlayerAttendance(player._id, 'rating', num)}
                              className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${
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
                    )}

                    <div>
                      {isReadOnly ? (
                        playerAtt.notes && (
                          <p className="text-gray-600 italic bg-white px-4 py-3 rounded-lg border border-gray-100">
                            {playerAtt.notes}
                          </p>
                        )
                      ) : (
                        <input
                          type="text"
                          placeholder={t('trainings.playerNotes')}
                          value={playerAtt.notes || ''}
                          onChange={(e) => updatePlayerAttendance(player._id, 'notes', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Coach Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <label className="block text-lg font-medium text-gray-900 mb-4">
                {t('trainings.overallRating')}
              </label>
              {isReadOnly ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <div
                        key={num}
                        className={`w-12 h-12 rounded-lg text-lg font-bold flex items-center justify-center ${
                          num <= overallRating
                            ? 'bg-yellow-400 text-white'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                  <span className="text-3xl font-bold text-gray-900">{overallRating}/10</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => setOverallRating(num)}
                      className={`w-12 h-12 rounded-lg text-lg font-bold transition-colors ${
                        num <= overallRating
                          ? 'bg-yellow-400 text-white'
                          : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-900 mb-4">
                {t('trainings.coachNotes')}
              </label>
              {isReadOnly ? (
                <div className="bg-gray-50 rounded-xl p-6 min-h-[200px]">
                  {coachNotes ? (
                    <p className="text-gray-700 whitespace-pre-wrap">{coachNotes}</p>
                  ) : (
                    <p className="text-gray-400 italic">{t('trainings.noNotes')}</p>
                  )}
                </div>
              ) : (
                <textarea
                  rows={8}
                  value={coachNotes}
                  onChange={(e) => setCoachNotes(e.target.value)}
                  placeholder={t('trainings.coachNotesPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              )}
            </div>
          </div>
        )}

        {/* Media Tab */}
        {activeTab === 'media' && (
          <div className="space-y-8">
            {/* Photos Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{t('trainings.photos')}</h3>
                {!isReadOnly && (
                  <>
                    <Button
                      variant="secondary"
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
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </>
                )}
              </div>

              {photoPreview.length > 0 && (
                <div className="mb-6 p-6 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm text-blue-700 mb-4 font-medium">{t('trainings.previewBeforeUpload')}</p>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {photoPreview.map((photo, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                        <button
                          onClick={() => {
                            URL.revokeObjectURL(photo.url);
                            setPhotoPreview(prev => prev.filter((_, i) => i !== index));
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handlePhotoUpload}>{t('common.upload')}</Button>
                    <Button variant="secondary" onClick={cancelPhotoUpload}>{t('common.cancel')}</Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {training.photos?.map((photo, index) => (
                  <div key={index} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                    <img src={photo.url} alt={photo.caption || ''} className="w-full h-full object-cover" />
                  </div>
                ))}
                {(!training.photos || training.photos.length === 0) && photoPreview.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
                    <Camera className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    {t('trainings.noPhotos')}
                  </div>
                )}
              </div>
            </div>

            {/* Videos Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{t('trainings.videos')}</h3>
                {!isReadOnly && (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      icon={Link}
                      onClick={() => setShowYoutubeInput(!showYoutubeInput)}
                    >
                      YouTube
                    </Button>
                    <Button
                      variant="secondary"
                      icon={Video}
                      onClick={() => videoInputRef.current?.click()}
                    >
                      {t('trainings.uploadVideo')}
                    </Button>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoSelect}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {showYoutubeInput && (
                <div className="mb-6 p-6 bg-red-50 rounded-xl border border-red-200">
                  <p className="text-sm text-red-700 mb-4 font-medium">{t('trainings.addYoutubeLink')}</p>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={youtubeLink}
                      onChange={(e) => setYoutubeLink(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                    <Button onClick={handleAddYoutubeLink}>{t('common.add')}</Button>
                    <Button variant="secondary" onClick={() => { setShowYoutubeInput(false); setYoutubeLink(''); }}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                  {youtubeLink && getYoutubeVideoId(youtubeLink) && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 mb-2">{t('trainings.preview')}:</p>
                      <div className="aspect-video w-80 rounded-lg overflow-hidden">
                        <iframe
                          src={`https://www.youtube.com/embed/${getYoutubeVideoId(youtubeLink)}`}
                          className="w-full h-full"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {videoPreview && (
                <div className="mb-6 p-6 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm text-blue-700 mb-4 font-medium">{t('trainings.previewBeforeUpload')}</p>
                  <div className="aspect-video w-80 rounded-lg overflow-hidden bg-gray-100 mb-4">
                    <video src={videoPreview.url} controls className="w-full h-full object-cover" />
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{videoPreview.name}</p>
                  <div className="flex gap-3">
                    <Button onClick={handleVideoUpload}>{t('common.upload')}</Button>
                    <Button variant="secondary" onClick={cancelVideoUpload}>{t('common.cancel')}</Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {training.videos?.map((video, index) => (
                  <div key={index} className="aspect-video rounded-xl overflow-hidden bg-gray-100">
                    {video.type === 'youtube' || video.url?.includes('youtube.com') || video.url?.includes('youtu.be') ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${video.videoId || getYoutubeVideoId(video.url)}`}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    ) : (
                      <video src={video.url} controls className="w-full h-full object-cover" />
                    )}
                  </div>
                ))}
                {(!training.videos || training.videos.length === 0) && !videoPreview && (
                  <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
                    <Video className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    {t('trainings.noVideos')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex justify-end gap-4">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            {t('common.cancel')}
          </Button>
          <Button icon={Save} onClick={handleSaveAttendance} loading={saving}>
            {t('trainings.saveAndComplete')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default TrainingDetail;
