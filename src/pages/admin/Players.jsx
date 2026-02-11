import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { playersAPI, teamsAPI } from '../../utils/api';
import { Card, Loading, Button, Input, Select, Modal, Avatar, Badge, EmptyState, ConfirmDialog } from '../../components/common';
import { Plus, Search, Edit, Trash2, Eye, Users, Download, Camera, Upload, User, Phone, Calendar, Ruler, Scale, Star, Heart, HeartPulse } from 'lucide-react';
import { formatDate, getPositionColor, calculateAge, getOverallRating, positions } from '../../utils/helpers';
import toast from 'react-hot-toast';

const PlayerForm = ({ player, teams, onSubmit, onClose, loading, onPhotoUpload }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [photoPreview, setPhotoPreview] = useState(player?.photo || null);
  const [selectedFile, setSelectedFile] = useState(null);

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

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (data) => {
    await onSubmit(data, selectedFile);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Photo Upload */}
      <div className="flex justify-center">
        <div className="relative">
          <div
            className="w-28 h-28 rounded-full overflow-hidden bg-gray-100 border-4 border-gray-200 cursor-pointer hover:border-primary-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <User className="w-12 h-12" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors"
          >
            <Camera className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>
      <p className="text-center text-sm text-gray-500">{t('players.clickToUploadPhoto')}</p>

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
            { value: 'right', label: t('players.rightFoot') },
            { value: 'left', label: t('players.leftFoot') },
            { value: 'both', label: t('players.bothFeet') },
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
          label={`${t('players.height')} (cm)`}
          type="number"
          min="100"
          max="220"
          {...register('height', { valueAsNumber: true })}
        />
        <Input
          label={`${t('players.weight')} (kg)`}
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

const PlayerDetailModal = ({ player, onClose, onMarkRecovered, onMarkInjured, recoveryLoading, t }) => {
  const [showInjuryForm, setShowInjuryForm] = useState(false);
  const [injuryDetails, setInjuryDetails] = useState('');
  const [injuryEndDate, setInjuryEndDate] = useState('');

  if (!player) return null;

  const ratingItems = [
    { key: 'pace', label: 'PAC', color: 'bg-green-500' },
    { key: 'shooting', label: 'SHO', color: 'bg-red-500' },
    { key: 'passing', label: 'PAS', color: 'bg-blue-500' },
    { key: 'dribbling', label: 'DRI', color: 'bg-yellow-500' },
    { key: 'defending', label: 'DEF', color: 'bg-purple-500' },
    { key: 'physical', label: 'PHY', color: 'bg-orange-500' },
  ];

  const handleMarkInjured = () => {
    if (injuryDetails.trim()) {
      onMarkInjured(player._id, injuryDetails, injuryEndDate || null);
      setShowInjuryForm(false);
      setInjuryDetails('');
      setInjuryEndDate('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Photo */}
      <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-gray-100">
        <div className="relative">
          <Avatar
            src={player.photo}
            firstName={player.firstName}
            lastName={player.lastName}
            size="xlarge"
            className="w-32 h-32"
          />
          {player.jerseyNumber && (
            <span className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center text-lg font-bold">
              {player.jerseyNumber}
            </span>
          )}
        </div>
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-bold text-gray-900">
            {player.firstName} {player.lastName}
          </h2>
          {player.fatherName && (
            <p className="text-gray-500">{player.fatherName}</p>
          )}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getPositionColor(player.position)}`}>
              {t(`players.positions.${player.position}`)}
            </span>
            <span className="text-sm text-gray-500">{player.team?.name}</span>
            {player.isInjured && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                {t('players.injured')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('players.personalInfo')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">{t('players.birthDate')}</p>
              <p className="font-medium">{formatDate(player.birthDate)}</p>
              <p className="text-sm text-gray-500">{player.age} {t('players.yearsOld')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Ruler className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">{t('players.height')}</p>
              <p className="font-medium">{player.height || '-'} cm</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Scale className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">{t('players.weight')}</p>
              <p className="font-medium">{player.weight || '-'} kg</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg col-span-2 sm:col-span-1">
            <Star className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">{t('players.preferredFoot')}</p>
              <p className="font-medium">{t(`players.${player.preferredFoot}Foot`)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Parent Info */}
      {(player.parentName || player.parentPhone) && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('players.parentInfo')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {player.parentName && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">{t('players.parentName')}</p>
                  <p className="font-medium">{player.parentName}</p>
                </div>
              </div>
            )}
            {player.parentPhone && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">{t('players.parentPhone')}</p>
                  <p className="font-medium">{player.parentPhone}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('players.statistics')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-primary-50 rounded-lg">
            <p className="text-3xl font-bold text-primary-600">{player.statistics?.matchesPlayed || 0}</p>
            <p className="text-sm text-gray-600">{t('players.matchesPlayed')}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{player.statistics?.goals || 0}</p>
            <p className="text-sm text-gray-600">{t('players.goals')}</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{player.statistics?.assists || 0}</p>
            <p className="text-sm text-gray-600">{t('players.assists')}</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-3xl font-bold text-yellow-600">{player.statistics?.yellowCards || 0}</p>
            <p className="text-sm text-gray-600">{t('players.yellowCards')}</p>
          </div>
        </div>
      </div>

      {/* Ratings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('players.ratings')}</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{t('players.overallRating')}:</span>
            <span className="text-2xl font-bold text-primary-600">{player.overallRating || 50}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {ratingItems.map(({ key, label, color }) => (
            <div key={key} className="text-center">
              <div className={`w-14 h-14 mx-auto rounded-lg ${color} flex items-center justify-center mb-1`}>
                <span className="text-xl font-bold text-white">{player.ratings?.[key] || 50}</span>
              </div>
              <p className="text-xs font-medium text-gray-600">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Injury Status */}
      {player.isInjured ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-red-800">{t('players.injuryStatus')}</h3>
            <Button
              size="small"
              variant="success"
              icon={HeartPulse}
              onClick={() => onMarkRecovered(player._id)}
              loading={recoveryLoading}
            >
              {t('players.markRecovered')}
            </Button>
          </div>
          <p className="text-red-700">{player.injuryDetails || t('players.injured')}</p>
          {player.injuryEndDate && (
            <p className="text-sm text-red-600 mt-1">
              {t('players.expectedReturn')}: {formatDate(player.injuryEndDate)}
            </p>
          )}
        </div>
      ) : (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-green-600" />
              <span className="text-green-700 font-medium">{t('players.available')}</span>
            </div>
            <Button
              size="small"
              variant="danger"
              icon={HeartPulse}
              onClick={() => setShowInjuryForm(true)}
            >
              {t('players.markInjured')}
            </Button>
          </div>

          {showInjuryForm && (
            <div className="mt-4 pt-4 border-t border-green-200 space-y-3">
              <Input
                label={t('players.injuryDetails')}
                value={injuryDetails}
                onChange={(e) => setInjuryDetails(e.target.value)}
                placeholder={t('players.injuryDetailsPlaceholder')}
              />
              <Input
                label={t('players.expectedReturn')}
                type="date"
                value={injuryEndDate}
                onChange={(e) => setInjuryEndDate(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="small"
                  variant="danger"
                  onClick={handleMarkInjured}
                  loading={recoveryLoading}
                  disabled={!injuryDetails.trim()}
                >
                  {t('common.confirm')}
                </Button>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => {
                    setShowInjuryForm(false);
                    setInjuryDetails('');
                    setInjuryEndDate('');
                  }}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button variant="secondary" onClick={onClose}>
          {t('common.close')}
        </Button>
      </div>
    </div>
  );
};

const Players = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [showInjuredOnly, setShowInjuredOnly] = useState(searchParams.get('isInjured') === 'true');
  const [showModal, setShowModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [deletingPlayer, setDeletingPlayer] = useState(null);
  const [viewingPlayer, setViewingPlayer] = useState(null);

  // Read isInjured from URL params
  useEffect(() => {
    const isInjuredParam = searchParams.get('isInjured');
    setShowInjuredOnly(isInjuredParam === 'true');
  }, [searchParams]);

  const { data: playersData, isLoading } = useQuery({
    queryKey: ['players', searchTerm, selectedTeam, selectedPosition, showInjuredOnly],
    queryFn: () => playersAPI.getAll({
      search: searchTerm,
      team: selectedTeam,
      position: selectedPosition,
      isInjured: showInjuredOnly ? 'true' : undefined,
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
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => playersAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['players']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: ({ id, formData }) => playersAPI.uploadPhoto(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries(['players']);
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

  const updateInjuryMutation = useMutation({
    mutationFn: ({ id, data }) => playersAPI.updateInjury(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['players']);
      if (!variables.data.isInjured) {
        toast.success(t('players.recoveredSuccess'));
      } else {
        toast.success(t('players.injuredSuccess'));
      }
      setViewingPlayer(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const handleSubmit = async (data, photoFile) => {
    try {
      let playerId;

      if (editingPlayer) {
        await updateMutation.mutateAsync({ id: editingPlayer._id, data });
        playerId = editingPlayer._id;
      } else {
        const response = await createMutation.mutateAsync(data);
        playerId = response.data.player._id;
      }

      if (photoFile && playerId) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        await uploadPhotoMutation.mutateAsync({ id: playerId, formData });
      }

      setShowModal(false);
      setEditingPlayer(null);
      toast.success(t('common.success'));
    } catch (error) {
      // Errors handled by mutation callbacks
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

  const handleMarkRecovered = (playerId) => {
    updateInjuryMutation.mutate({
      id: playerId,
      data: {
        isInjured: false,
        injuryDetails: '',
        injuryEndDate: null,
        physicalCondition: 100
      }
    });
  };

  const handleMarkInjured = (playerId, injuryDetails, injuryEndDate) => {
    updateInjuryMutation.mutate({
      id: playerId,
      data: {
        isInjured: true,
        injuryDetails,
        injuryEndDate,
        physicalCondition: 50
      }
    });
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
          <button
            onClick={() => {
              const newValue = !showInjuredOnly;
              setShowInjuredOnly(newValue);
              if (newValue) {
                setSearchParams({ isInjured: 'true' });
              } else {
                setSearchParams({});
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              showInjuredOnly
                ? 'bg-red-100 text-red-700 border border-red-300'
                : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            {t('players.injured')}
          </button>
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
            <Card
              key={player._id}
              className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setViewingPlayer(player)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <Avatar
                    src={player.photo}
                    firstName={player.firstName}
                    lastName={player.lastName}
                    size="large"
                  />
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setViewingPlayer(player)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
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
                  <div className="flex items-center gap-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getPositionColor(player.position)}`}>
                      {t(`players.positions.${player.position}`)}
                    </span>
                    {player.isInjured && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                        {t('players.injured')}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {player.age} {t('players.yearsOld')}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100 text-center">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{player.statistics?.matchesPlayed || 0}</p>
                    <p className="text-xs text-gray-500">{t('players.matchesPlayed')}</p>
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
          loading={createMutation.isPending || updateMutation.isPending || uploadPhotoMutation.isPending}
        />
      </Modal>

      {/* Player Detail Modal */}
      <Modal
        isOpen={!!viewingPlayer}
        onClose={() => setViewingPlayer(null)}
        title={t('players.playerDetails')}
        size="large"
      >
        <PlayerDetailModal
          player={viewingPlayer}
          onClose={() => setViewingPlayer(null)}
          onMarkRecovered={handleMarkRecovered}
          onMarkInjured={handleMarkInjured}
          recoveryLoading={updateInjuryMutation.isPending}
          t={t}
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
