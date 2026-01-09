import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetIsLoggedIn, useGetAccountInfo } from 'lib';
import { useGetHerotag } from 'hooks/useGetHerotag';
import {
  getUserNFTs,
  getUserProposals,
  getUserProfile,
  saveUserProfile,
  uploadAvatarImage,
  getNFTImageUrl,
  ExtendedUserProfile,
  NFT
} from '../services/profileService';
import { Proposal, ProposalStatus } from '../services/daoService';

function Profile() {
  const { t } = useTranslation();
  const isLoggedIn = useGetIsLoggedIn();
  const { address } = useGetAccountInfo();
  const { herotag, profileUrl, coverUrl, description: xPortalBio, loading: herotagLoading } = useGetHerotag(address);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile state
  const [profile, setProfile] = useState<ExtendedUserProfile>({
    displayName: '',
    bio: '',
    avatarType: 'none',
    updatedAt: 0
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({ displayName: '', bio: '' });

  // NFTs state
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loadingNfts, setLoadingNfts] = useState(true);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarModalTab, setAvatarModalTab] = useState<'upload' | 'nft'>('nft');

  // DAO Proposals state
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);

  // Load profile data
  useEffect(() => {
    if (address) {
      loadProfileData();
    }
  }, [address]);

  const loadProfileData = async () => {
    if (!address) return;

    // Load profile
    const userProfile = await getUserProfile(address);
    setProfile(userProfile);
    setEditForm({
      displayName: userProfile.displayName,
      bio: userProfile.bio
    });

    // Load NFTs
    setLoadingNfts(true);
    const userNfts = await getUserNFTs(address);
    setNfts(userNfts);
    setLoadingNfts(false);

    // Load proposals
    setLoadingProposals(true);
    const userProposals = await getUserProposals(address);
    setProposals(userProposals);
    setLoadingProposals(false);
  };

  const handleSaveProfile = async () => {
    if (!address) return;

    setIsSaving(true);
    const updatedProfile: ExtendedUserProfile = {
      ...profile,
      displayName: editForm.displayName,
      bio: editForm.bio
    };

    const result = await saveUserProfile(address, updatedProfile);
    if (result.success) {
      setProfile(updatedProfile);
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !address) return;

    try {
      const imageData = await uploadAvatarImage(file);
      const updatedProfile: ExtendedUserProfile = {
        ...profile,
        avatarType: 'upload',
        avatarUrl: imageData,
        avatarNftId: undefined
      };

      const result = await saveUserProfile(address, updatedProfile);
      if (result.success) {
        setProfile(updatedProfile);
        setShowAvatarModal(false);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const handleSelectNftAvatar = async (nft: NFT) => {
    if (!address) return;

    const imageUrl = getNFTImageUrl(nft);
    const updatedProfile: ExtendedUserProfile = {
      ...profile,
      avatarType: 'nft',
      avatarUrl: imageUrl,
      avatarNftId: nft.identifier
    };

    const result = await saveUserProfile(address, updatedProfile);
    if (result.success) {
      setProfile(updatedProfile);
      setShowNftSelector(false);
    }
  };

  const getAvatarUrl = (): string | undefined => {
    // Priority: custom avatar (upload/NFT) > xPortal profile picture
    if (profile.avatarType === 'upload' || profile.avatarType === 'nft') {
      return profile.avatarUrl;
    }
    // Fallback to xPortal profile picture
    if (profileUrl) {
      return profileUrl;
    }
    return undefined;
  };

  const getStatusColor = (status: ProposalStatus) => {
    switch (status) {
      case ProposalStatus.Active:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case ProposalStatus.Passed:
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case ProposalStatus.Executed:
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case ProposalStatus.Failed:
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case ProposalStatus.Cancelled:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: ProposalStatus) => {
    switch (status) {
      case ProposalStatus.Active: return t('profile.proposalStatus.active', 'Active');
      case ProposalStatus.Passed: return t('profile.proposalStatus.passed', 'Passed');
      case ProposalStatus.Executed: return t('profile.proposalStatus.executed', 'Executed');
      case ProposalStatus.Failed: return t('profile.proposalStatus.failed', 'Failed');
      case ProposalStatus.Cancelled: return t('profile.proposalStatus.cancelled', 'Cancelled');
      default: return 'Unknown';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="bg-secondary rounded-2xl p-8 shadow-2xl max-w-md text-center border border-secondary">
          <div className="text-6xl mb-4">&#128274;</div>
          <h2 className="text-2xl font-semibold text-primary mb-4">
            {t('profile.loginRequired', 'Login Required')}
          </h2>
          <p className="text-secondary mb-6">
            {t('profile.connectWallet', 'Connect your MultiversX wallet to access your profile')}
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-btn-primary text-btn-primary font-semibold py-3 px-6 rounded-lg transition hover:opacity-90"
          >
            {t('profile.backToHome', 'Back to Home')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary">
            {t('profile.title', 'My Profile')}
          </h1>
        </div>

        {/* Profile Card with Banner */}
        <div className="bg-secondary rounded-2xl mb-8 border border-secondary overflow-hidden">
          {/* Banner - Uses xPortal cover if available, otherwise gradient */}
          <div className="relative h-32 sm:h-40">
            {coverUrl ? (
              <>
                {/* xPortal Cover Image */}
                <img
                  src={coverUrl}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
                {/* Gradient overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </>
            ) : (
              <>
                {/* Default gradient banner */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500" />
                {/* Animated pattern overlay */}
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  }} />
                </div>
                {/* Gradient overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </>
            )}
          </div>

          {/* Avatar overlapping banner */}
          <div className="relative px-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-16 sm:-mt-12">
              {/* Avatar */}
              <div className="relative">
                <div
                  className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-tertiary border-4 border-secondary cursor-pointer group shadow-xl"
                  onClick={() => setShowAvatarModal(true)}
                >
                  {getAvatarUrl() ? (
                    <img
                      src={getAvatarUrl()}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-secondary bg-gradient-to-br from-purple-500 to-blue-500">
                      {address?.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-sm">{t('profile.changeAvatar', 'Change')}</span>
                  </div>
                </div>
                {/* Edit avatar badge */}
                <button
                  onClick={() => setShowAvatarModal(true)}
                  className="absolute bottom-1 right-1 w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform"
                  title={t('profile.changeAvatar', 'Change')}
                >
                  <span className="text-sm">&#9998;</span>
                </button>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Avatar change button */}
              <div className="pb-4">
                <button
                  onClick={() => setShowAvatarModal(true)}
                  className="text-xs px-4 py-2 bg-tertiary text-secondary rounded-lg hover:bg-btn-primary hover:text-btn-primary transition flex items-center gap-2"
                >
                  <span>&#9998;</span> {t('profile.changeAvatar', 'Change Avatar')}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Profile Content */}
          <div className="p-6 pt-4">

            {/* Profile Info */}
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-secondary mb-1">
                      {t('profile.displayName', 'Display Name')}
                    </label>
                    <input
                      type="text"
                      value={editForm.displayName}
                      onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                      className="w-full px-4 py-2 bg-tertiary border border-secondary rounded-lg text-primary focus:outline-none focus:border-accent"
                      placeholder={t('profile.enterName', 'Enter your name')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-1">
                      {t('profile.bio', 'Bio')}
                    </label>
                    <textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      className="w-full px-4 py-2 bg-tertiary border border-secondary rounded-lg text-primary focus:outline-none focus:border-accent h-24 resize-none"
                      placeholder={t('profile.enterBio', 'Tell us about yourself...')}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="px-4 py-2 bg-btn-primary text-btn-primary rounded-lg hover:opacity-90 transition disabled:opacity-50"
                    >
                      {isSaving ? t('profile.saving', 'Saving...') : t('profile.save', 'Save')}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditForm({ displayName: profile.displayName, bio: profile.bio });
                      }}
                      className="px-4 py-2 bg-tertiary text-secondary rounded-lg hover:bg-btn-secondary transition"
                    >
                      {t('profile.cancel', 'Cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-2xl font-bold text-primary">
                      {profile.displayName || t('profile.anonymous', 'Anonymous')}
                    </h2>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-sm px-3 py-1 bg-tertiary text-secondary rounded-lg hover:bg-btn-primary hover:text-btn-primary transition"
                    >
                      {t('profile.edit', 'Edit')}
                    </button>
                  </div>

                  <p className="text-secondary mb-4">
                    {profile.bio || xPortalBio || t('profile.noBio', 'No bio yet')}
                  </p>

                  {/* Account Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {/* Herotag */}
                    <div className="flex items-center gap-3 bg-tertiary rounded-lg p-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-accent/20 border border-accent/30">
                        {profileUrl ? (
                          <img
                            src={profileUrl}
                            alt="Herotag"
                            className="w-full h-full object-cover"
                          />
                        ) : herotag ? (
                          <span className="text-accent font-bold text-sm">
                            {herotag.slice(0, 2).toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-accent font-bold">@</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-secondary">{t('profile.herotag', 'Herotag')}</p>
                        <p className="text-primary font-medium truncate">
                          {herotagLoading ? (
                            <span className="text-secondary">...</span>
                          ) : herotag ? (
                            <span className="text-accent">@{herotag}</span>
                          ) : (
                            <span className="text-secondary">N/A</span>
                          )}
                        </p>
                      </div>
                      {herotag && (
                        <a
                          href={`https://xportal.com/${herotag}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 bg-accent/20 text-accent rounded hover:bg-accent/30 transition"
                          title="View on xPortal"
                        >
                          xPortal
                        </a>
                      )}
                    </div>

                    {/* Address */}
                    <div className="flex items-center gap-3 bg-tertiary rounded-lg p-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-blue-500/20 border border-blue-500/30">
                        <span className="text-blue-400 text-lg">&#128279;</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-secondary">{t('profile.address', 'Address')}</p>
                        <code className="text-xs text-primary font-mono block truncate">
                          {address?.slice(0, 10)}...{address?.slice(-6)}
                        </code>
                      </div>
                      <button
                        onClick={() => copyToClipboard(address || '')}
                        className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition"
                        title={t('profile.copy', 'Copy')}
                      >
                        {t('profile.copy', 'Copy')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* NFTs Section */}
        <div className="bg-secondary rounded-2xl p-6 mb-8 border border-secondary">
          <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
            <span>&#127912;</span>
            {t('profile.myNfts', 'My NFTs')}
            <span className="text-sm font-normal text-secondary">({nfts.length})</span>
          </h3>

          {loadingNfts ? (
            <div className="text-center py-8">
              <div className="animate-spin text-3xl mb-2">&#8987;</div>
              <p className="text-secondary">{t('profile.loadingNfts', 'Loading NFTs...')}</p>
            </div>
          ) : nfts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {nfts.map((nft) => (
                <div
                  key={nft.identifier}
                  className="bg-tertiary rounded-xl overflow-hidden border border-secondary hover:border-accent transition cursor-pointer group"
                  onClick={() => handleSelectNftAvatar(nft)}
                >
                  <div className="aspect-square bg-primary/50 relative">
                    {getNFTImageUrl(nft) ? (
                      <img
                        src={getNFTImageUrl(nft)}
                        alt={nft.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '';
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        &#127912;
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs px-2 py-1 bg-accent rounded">
                        {t('profile.setAsAvatar', 'Set as Avatar')}
                      </span>
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-primary text-sm font-medium truncate">{nft.name}</p>
                    <p className="text-secondary text-xs truncate">{nft.collection}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">&#128444;</div>
              <p className="text-secondary">{t('profile.noNfts', 'No NFTs found')}</p>
            </div>
          )}
        </div>

        {/* DAO Proposals Section */}
        <div className="bg-secondary rounded-2xl p-6 border border-secondary">
          <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
            <span>&#128221;</span>
            {t('profile.myProposals', 'My DAO Proposals')}
            <span className="text-sm font-normal text-secondary">({proposals.length})</span>
          </h3>

          {loadingProposals ? (
            <div className="text-center py-8">
              <div className="animate-spin text-3xl mb-2">&#8987;</div>
              <p className="text-secondary">{t('profile.loadingProposals', 'Loading proposals...')}</p>
            </div>
          ) : proposals.length > 0 ? (
            <div className="space-y-4">
              {proposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="bg-tertiary rounded-xl p-4 border border-secondary hover:border-accent transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-primary font-semibold">{proposal.title}</h4>
                      <p className="text-xs text-secondary">ID: #{proposal.id}</p>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full border ${getStatusColor(proposal.status)}`}>
                      {getStatusLabel(proposal.status)}
                    </span>
                  </div>
                  <p className="text-secondary text-sm line-clamp-2 mb-3">{proposal.description}</p>
                  <div className="flex gap-4 text-xs text-secondary">
                    <span>{t('profile.votesFor', 'For')}: <span className="text-green-400">{parseFloat(proposal.votesFor).toFixed(0)}</span></span>
                    <span>{t('profile.votesAgainst', 'Against')}: <span className="text-red-400">{parseFloat(proposal.votesAgainst).toFixed(0)}</span></span>
                    <span>{t('profile.created', 'Created')}: {new Date(proposal.createdAt * 1000).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">&#128203;</div>
              <p className="text-secondary">{t('profile.noProposals', 'No proposals created yet')}</p>
            </div>
          )}
        </div>

        {/* Avatar Selection Modal */}
        {showAvatarModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-secondary rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden border border-accent">
              {/* Modal Header */}
              <div className="p-4 border-b border-secondary flex justify-between items-center">
                <h3 className="text-lg font-bold text-primary">
                  {t('profile.changeAvatar', 'Change Avatar')}
                </h3>
                <button
                  onClick={() => setShowAvatarModal(false)}
                  className="text-secondary hover:text-primary text-2xl"
                >
                  &times;
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-secondary">
                <button
                  onClick={() => setAvatarModalTab('upload')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition flex items-center justify-center gap-2 ${
                    avatarModalTab === 'upload'
                      ? 'text-accent border-b-2 border-accent bg-accent/10'
                      : 'text-secondary hover:text-primary hover:bg-tertiary'
                  }`}
                >
                  <span>&#128247;</span> {t('profile.uploadImage', 'Upload Image')}
                </button>
                <button
                  onClick={() => setAvatarModalTab('nft')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition flex items-center justify-center gap-2 ${
                    avatarModalTab === 'nft'
                      ? 'text-accent border-b-2 border-accent bg-accent/10'
                      : 'text-secondary hover:text-primary hover:bg-tertiary'
                  }`}
                >
                  <span>&#127912;</span> {t('profile.selectNft', 'Select NFT')}
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4 overflow-y-auto max-h-[55vh]">
                {avatarModalTab === 'upload' ? (
                  /* Upload Tab */
                  <div className="space-y-4">
                    {/* Current Avatar Preview */}
                    <div className="flex flex-col items-center">
                      <div className="w-32 h-32 rounded-full overflow-hidden bg-tertiary border-4 border-accent mb-4">
                        {getAvatarUrl() ? (
                          <img
                            src={getAvatarUrl()}
                            alt="Current Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-secondary bg-gradient-to-br from-purple-500 to-blue-500">
                            {address?.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-secondary mb-4">
                        {t('profile.currentAvatar', 'Current Avatar')}
                      </p>
                    </div>

                    {/* Upload Area */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-secondary hover:border-accent rounded-xl p-8 text-center cursor-pointer transition hover:bg-tertiary/50"
                    >
                      <div className="text-4xl mb-3">&#128228;</div>
                      <p className="text-primary font-medium mb-1">
                        {t('profile.clickToUpload', 'Click to upload an image')}
                      </p>
                      <p className="text-xs text-secondary">
                        {t('profile.supportedFormats', 'PNG, JPG, GIF, WebP (max 5MB)')}
                      </p>
                    </div>

                    {/* Use xPortal Avatar */}
                    {profileUrl && profile.avatarType !== 'none' && (
                      <div className="mt-4 p-4 bg-tertiary rounded-xl">
                        <p className="text-sm text-secondary mb-3">
                          {t('profile.useXportalAvatar', 'Or use your xPortal avatar:')}
                        </p>
                        <button
                          onClick={async () => {
                            const updatedProfile: ExtendedUserProfile = {
                              ...profile,
                              avatarType: 'none',
                              avatarUrl: undefined,
                              avatarNftId: undefined
                            };
                            const result = await saveUserProfile(address, updatedProfile);
                            if (result.success) {
                              setProfile(updatedProfile);
                              setShowAvatarModal(false);
                            }
                          }}
                          className="flex items-center gap-3 w-full p-3 bg-secondary rounded-lg hover:bg-accent/20 transition"
                        >
                          <img
                            src={profileUrl}
                            alt="xPortal"
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div className="text-left">
                            <p className="text-primary font-medium">xPortal Avatar</p>
                            <p className="text-xs text-secondary">{t('profile.resetToXportal', 'Reset to xPortal profile picture')}</p>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* NFT Tab */
                  <div>
                    {loadingNfts ? (
                      <div className="text-center py-8">
                        <div className="animate-spin text-3xl mb-2">&#8987;</div>
                        <p className="text-secondary">{t('profile.loadingNfts', 'Loading NFTs...')}</p>
                      </div>
                    ) : nfts.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {nfts.map((nft) => (
                          <div
                            key={nft.identifier}
                            className={`bg-tertiary rounded-lg overflow-hidden border-2 cursor-pointer transition ${
                              profile.avatarNftId === nft.identifier
                                ? 'border-accent ring-2 ring-accent/50'
                                : 'border-transparent hover:border-secondary'
                            }`}
                            onClick={() => {
                              handleSelectNftAvatar(nft);
                              setShowAvatarModal(false);
                            }}
                          >
                            <div className="aspect-square bg-primary/50 relative">
                              {getNFTImageUrl(nft) ? (
                                <img
                                  src={getNFTImageUrl(nft)}
                                  alt={nft.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">
                                  &#127912;
                                </div>
                              )}
                              {profile.avatarNftId === nft.identifier && (
                                <div className="absolute top-1 right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">&#10003;</span>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-center py-1 text-primary truncate px-1">
                              {nft.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">&#127912;</div>
                        <p className="text-secondary">{t('profile.noNftsToSelect', 'No NFTs available')}</p>
                        <p className="text-xs text-secondary mt-2">
                          {t('profile.getNftsHint', 'Acquire NFTs to use them as your avatar')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
