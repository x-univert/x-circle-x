import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetIsLoggedIn, useGetAccountInfo } from 'lib';
import { useChat } from '../../hooks/useChat';
import { ChatChannel, ChatMessage, OnlineUser } from '../../services/chatService';
import { formatAddress, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '../../services/chatService';
import { MessageBubble } from '../chat/MessageBubble';
import { MediaUploadPreview } from '../chat/MediaPreview';
import { EmojiButton } from '../chat/EmojiPicker';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { getLocalProfile, ExtendedUserProfile } from '../../services/profileService';
import { useGetHerotag, getUserProfileData, getProfilePictureUrl } from '../../hooks/useGetHerotag';

// Type for cached profile data
interface CachedProfile {
  displayName: string
  avatarUrl?: string
}

export function ChatTab() {
  const { t } = useTranslation();
  const isLoggedIn = useGetIsLoggedIn();
  const { address } = useGetAccountInfo();

  const {
    isConfigured,
    isAuthenticated,
    isLoading,
    error,
    channels,
    currentChannel,
    messages,
    onlineUsers,
    currentPrivateChat,
    replyingTo,
    isUploading,
    uploadProgress,
    setCurrentChannel,
    sendChannelMessage,
    startPrivateChat,
    sendPrivateChatMessage,
    closePrivateChat,
    clearError,
    setReplyingTo,
    handleReaction,
    sendMediaMessage,
    sendVoiceMsg,
    availableReactions
  } = useChat(address);

  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [profileCache, setProfileCache] = useState<Map<string, CachedProfile>>(new Map());
  const [xPortalCache, setXPortalCache] = useState<Map<string, string | null>>(new Map()); // address -> profileUrl or null
  const fetchedXPortalRef = useRef<Set<string>>(new Set()); // Track which addresses we've fetched
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get xPortal profile for current user (same fallback as Header)
  const { profileUrl: xPortalProfileUrl } = useGetHerotag(address);

  // Helper to extract avatarUrl from profile (checking avatarType)
  const getAvatarUrlFromProfile = (profile: ExtendedUserProfile | null, xPortalFallback?: string): string | undefined => {
    // First priority: localStorage profile with upload/nft type
    if (profile && (profile.avatarType === 'upload' || profile.avatarType === 'nft') && profile.avatarUrl) {
      return profile.avatarUrl;
    }
    // Fallback: xPortal profile picture
    if (xPortalFallback) {
      return xPortalFallback;
    }
    return undefined;
  };

  // Load current user's profile on mount + when xPortal profile loads
  useEffect(() => {
    if (address) {
      const normalizedAddress = address.toLowerCase();
      const myProfile = getLocalProfile(address);
      const avatarUrl = getAvatarUrlFromProfile(myProfile, xPortalProfileUrl);

      // Only update if profile changed
      const existing = profileCache.get(normalizedAddress);
      const displayName = myProfile?.displayName || `${address.slice(0, 8)}...${address.slice(-4)}`;

      if (!existing || existing.displayName !== displayName || existing.avatarUrl !== avatarUrl) {
        setProfileCache(prev => new Map(prev).set(normalizedAddress, {
          displayName: displayName,
          avatarUrl: avatarUrl
        }));
      }
    }
  }, [address, xPortalProfileUrl]);

  // Function to get profile from cache (read-only, no state updates during render)
  const getProfileForAddress = useCallback((senderAddress: string): CachedProfile | undefined => {
    const normalizedAddress = senderAddress.toLowerCase();
    return profileCache.get(normalizedAddress);
  }, [profileCache]);

  // Fetch xPortal profiles for all unique message senders
  useEffect(() => {
    const fetchXPortalProfiles = async () => {
      const uniqueSenders = [...new Set(messages.map(m => m.senderAddress.toLowerCase()))];
      const addressesToFetch = uniqueSenders.filter(addr => !fetchedXPortalRef.current.has(addr));

      if (addressesToFetch.length === 0) return;

      // Mark as being fetched to avoid duplicate requests
      addressesToFetch.forEach(addr => fetchedXPortalRef.current.add(addr));

      // Fetch profiles in parallel (limit to 5 concurrent requests)
      const batchSize = 5;
      const newXPortalData = new Map<string, string | null>();

      for (let i = 0; i < addressesToFetch.length; i += batchSize) {
        const batch = addressesToFetch.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(async (addr) => {
            const data = await getUserProfileData(addr);
            const profileUrl = getProfilePictureUrl(data);
            return { addr, profileUrl: profileUrl || null };
          })
        );
        results.forEach(({ addr, profileUrl }) => {
          newXPortalData.set(addr, profileUrl);
        });
      }

      // Update xPortal cache
      if (newXPortalData.size > 0) {
        setXPortalCache(prev => {
          const updated = new Map(prev);
          newXPortalData.forEach((url, addr) => updated.set(addr, url));
          return updated;
        });
      }
    };

    fetchXPortalProfiles();
  }, [messages]);

  // Load profiles for all message senders (batch update to avoid multiple re-renders)
  useEffect(() => {
    const uniqueSenders = [...new Set(messages.map(m => m.senderAddress.toLowerCase()))];
    const currentUserNormalized = address?.toLowerCase();
    const newProfiles = new Map<string, CachedProfile>();
    let hasNewProfiles = false;

    uniqueSenders.forEach(normalizedAddress => {
      const existing = profileCache.get(normalizedAddress);
      const isCurrentUser = normalizedAddress === currentUserNormalized;

      // Get xPortal avatar - use hook result for current user, cache for others
      const xPortalAvatar = isCurrentUser
        ? xPortalProfileUrl
        : xPortalCache.get(normalizedAddress) || undefined;

      // Check if we need to update this profile
      const needsUpdate = !existing ||
        (!existing.avatarUrl && xPortalAvatar); // Update if we now have an avatar

      if (needsUpdate) {
        const localProfile = getLocalProfile(normalizedAddress);
        const avatarUrl = getAvatarUrlFromProfile(localProfile, xPortalAvatar);

        // Get display name from various sources
        let displayName = localProfile?.displayName;
        if (!displayName) {
          const onlineUser = onlineUsers.find(u => u.address.toLowerCase() === normalizedAddress);
          displayName = onlineUser?.displayName;
        }
        if (!displayName) {
          displayName = `${normalizedAddress.slice(0, 8)}...${normalizedAddress.slice(-4)}`;
        }

        newProfiles.set(normalizedAddress, {
          displayName: displayName,
          avatarUrl: avatarUrl
        });
        hasNewProfiles = true;
      }
    });

    // Only update state if there are new profiles (batch update)
    if (hasNewProfiles) {
      setProfileCache(prev => {
        const updated = new Map(prev);
        newProfiles.forEach((profile, addr) => updated.set(addr, profile));
        return updated;
      });
    }
  }, [messages, onlineUsers, address, xPortalProfileUrl, xPortalCache]);

  // Voice recorder
  const {
    isRecording,
    duration: recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    error: voiceError
  } = useVoiceRecorder();

  // Auto-scroll to bottom when new messages arrive (only within the messages container)
  useEffect(() => {
    if (messagesContainerRef.current) {
      // Scroll the container to bottom without affecting the page scroll
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (isSending || isUploading) return;

    // Send file if selected
    if (selectedFile) {
      setIsSending(true);
      const success = await sendMediaMessage(selectedFile, messageInput.trim() || undefined);
      if (success) {
        setMessageInput('');
        setSelectedFile(null);
      }
      setIsSending(false);
      return;
    }

    // Send text message
    if (!messageInput.trim()) return;

    setIsSending(true);
    const success = currentPrivateChat
      ? await sendPrivateChatMessage(messageInput)
      : await sendChannelMessage(messageInput);

    if (success) {
      setMessageInput('');
    }
    setIsSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        alert(t('chat.fileTooLarge', 'File too large (max 10MB)'));
        return;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        alert(t('chat.fileTypeNotAllowed', 'File type not allowed'));
        return;
      }
      setSelectedFile(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Voice recording handlers
  const handleStartRecording = async () => {
    await startRecording();
  };

  const handleStopAndSendVoice = async () => {
    const blob = await stopRecording();
    if (blob && recordingDuration > 0) {
      setIsSending(true);
      await sendVoiceMsg(blob, recordingDuration);
      setIsSending(false);
    }
  };

  const handleCancelRecording = () => {
    cancelRecording();
  };

  const formatRecordingDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Emoji handler
  const handleEmojiSelect = (emoji: string) => {
    setMessageInput(prev => prev + emoji);
    inputRef.current?.focus();
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        alert(t('chat.fileTooLarge', 'File too large (max 10MB)'));
        return;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        alert(t('chat.fileTypeNotAllowed', 'File type not allowed'));
        return;
      }
      setSelectedFile(file);
    }
  }, [t]);

  // Not configured state
  if (!isConfigured) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl text-center">
        <div className="text-6xl mb-4">🔧</div>
        <h3 className="text-xl font-bold text-white mb-2">{t('chat.notConfigured', 'Chat Not Configured')}</h3>
        <p className="text-gray-400 mb-4">
          {t('chat.notConfiguredDesc', 'Firebase is not configured. Please add your Firebase credentials to enable chat functionality.')}
        </p>
        <div className="bg-gray-800/50 rounded-lg p-4 text-left">
          <p className="text-gray-300 text-sm font-mono">
            VITE_FIREBASE_API_KEY=...<br />
            VITE_FIREBASE_AUTH_DOMAIN=...<br />
            VITE_FIREBASE_PROJECT_ID=...<br />
            VITE_FIREBASE_STORAGE_BUCKET=...<br />
            VITE_FIREBASE_MESSAGING_SENDER_ID=...<br />
            VITE_FIREBASE_APP_ID=...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in state
  if (!isLoggedIn) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl text-center">
        <div className="text-6xl mb-4">🔐</div>
        <h3 className="text-xl font-bold text-white mb-2">{t('chat.connectWallet', 'Connect Your Wallet')}</h3>
        <p className="text-gray-400">
          {t('chat.connectWalletDesc', 'Please connect your MultiversX wallet to access the chat.')}
        </p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl text-center">
        <div className="animate-spin text-4xl mb-4">🌀</div>
        <p className="text-gray-300">{t('chat.loading', 'Loading chat...')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[600px] max-h-[600px]">
      {/* Sidebar - Channels & Users */}
      <div className="lg:col-span-1 bg-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col h-full min-h-0 overflow-hidden">
        {/* Channels */}
        <div className="mb-4">
          <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
            <span>📢</span> {t('chat.channels', 'Channels')}
          </h3>
          <div className="space-y-1">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => {
                  closePrivateChat();
                  setCurrentChannel(channel);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg transition flex items-center gap-2 ${
                  currentChannel?.id === channel.id && !currentPrivateChat
                    ? 'bg-purple-500/30 text-white'
                    : 'text-gray-300 hover:bg-white/10'
                }`}
              >
                <span>{channel.icon}</span>
                <span className="truncate">{channel.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Online Users */}
        <div className="flex-1 overflow-hidden">
          <button
            onClick={() => setShowUserList(!showUserList)}
            className="w-full text-white font-semibold mb-2 flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span>👥</span> {t('chat.onlineUsers', 'Online')} ({onlineUsers.length})
            </span>
            <span>{showUserList ? '▲' : '▼'}</span>
          </button>

          {showUserList && (
            <div className="space-y-1 overflow-y-auto max-h-48">
              {onlineUsers.length === 0 ? (
                <p className="text-gray-500 text-sm px-3">{t('chat.noUsersOnline', 'No users online')}</p>
              ) : (
                onlineUsers.map((user) => (
                  <button
                    key={user.address}
                    onClick={() => user.address !== address && startPrivateChat(user.address)}
                    disabled={user.address === address}
                    className={`w-full text-left px-3 py-2 rounded-lg transition flex items-center gap-2 ${
                      currentPrivateChat === user.address
                        ? 'bg-green-500/30 text-white'
                        : user.address === address
                        ? 'text-gray-500 cursor-default'
                        : 'text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="truncate text-sm">
                      {user.displayName}
                      {user.address === address && ` (${t('chat.you', 'you')})`}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Private Chat indicator */}
        {currentPrivateChat && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-green-400 text-sm flex items-center gap-2">
                <span>💬</span> {formatAddress(currentPrivateChat)}
              </span>
              <button
                onClick={closePrivateChat}
                className="text-gray-400 hover:text-white text-sm"
              >
                X
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div
        className={`lg:col-span-3 bg-white/10 backdrop-blur-md rounded-2xl flex flex-col relative h-full min-h-0 overflow-hidden ${
          isDragging ? 'ring-2 ring-purple-500' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-purple-500/20 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
            <div className="text-center">
              <div className="text-4xl mb-2">📁</div>
              <p className="text-white font-semibold">{t('chat.dropFile', 'Drop file here')}</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-white/10">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            {currentPrivateChat ? (
              <>
                <span>💬</span>
                {t('chat.privateWith', 'Private chat with')} {formatAddress(currentPrivateChat)}
              </>
            ) : currentChannel ? (
              <>
                <span>{currentChannel.icon}</span>
                {currentChannel.name}
              </>
            ) : (
              t('chat.selectChannel', 'Select a channel')
            )}
          </h2>
          {currentChannel && !currentPrivateChat && (
            <p className="text-gray-400 text-sm">{currentChannel.description}</p>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-4 mt-4 bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-2 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={clearError} className="text-red-300 hover:text-white">X</button>
          </div>
        )}

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">💬</div>
              <p>{t('chat.noMessages', 'No messages yet. Be the first to say hello!')}</p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.senderAddress.toLowerCase() === address?.toLowerCase()}
                userAddress={address || ''}
                availableReactions={availableReactions}
                senderProfile={getProfileForAddress(message.senderAddress)}
                onReply={(msg) => setReplyingTo(msg)}
                onReaction={(msgId, emoji) => handleReaction(msgId, emoji, message.reactions)}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply bar */}
        {replyingTo && (
          <div className="mx-4 mb-2 bg-white/5 rounded-lg p-3 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-purple-400 font-semibold">
                {t('chat.replyingTo', 'Replying to')} {replyingTo.sender}
              </p>
              <p className="text-sm text-gray-400 truncate">{replyingTo.content}</p>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="ml-2 text-gray-400 hover:text-white p-1"
            >
              X
            </button>
          </div>
        )}

        {/* File preview */}
        {selectedFile && (
          <div className="mx-4 mb-2">
            <MediaUploadPreview
              file={selectedFile}
              onRemove={() => setSelectedFile(null)}
              uploadProgress={isUploading ? uploadProgress : undefined}
            />
          </div>
        )}

        {/* Voice error */}
        {voiceError && (
          <div className="mx-4 mb-2 bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-2 rounded-lg text-sm">
            {voiceError}
          </div>
        )}

        {/* Input */}
        <div className="flex-shrink-0 p-4 border-t border-white/10">
          {/* Voice Recording UI - replaces input when recording */}
          {isRecording ? (
            <div className="flex items-center gap-3 bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-3">
              {/* Recording indicator */}
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />

              {/* Duration */}
              <span className="text-white font-mono min-w-[50px]">
                {formatRecordingDuration(recordingDuration)}
              </span>

              {/* Waveform animation */}
              <div className="flex items-center gap-0.5 flex-1">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-red-400 rounded-full transition-all"
                    style={{
                      height: `${8 + Math.sin(Date.now() / 100 + i * 0.5) * 8 + Math.random() * 4}px`,
                    }}
                  />
                ))}
              </div>

              {/* Cancel button */}
              <button
                onClick={handleCancelRecording}
                className="p-2 hover:bg-white/10 rounded-full transition text-gray-300 hover:text-white"
                title={t('chat.cancelRecording', 'Cancel')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Send voice button */}
              <button
                onClick={handleStopAndSendVoice}
                disabled={isSending}
                className="p-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-full transition text-white"
                title={t('chat.sendVoice', 'Send voice message')}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-end">
              {/* File upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending || isUploading}
                className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-lg transition text-white"
                title={t('chat.attachFile', 'Attach file')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_FILE_TYPES.join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Emoji picker button */}
              <EmojiButton
                onSelectEmoji={handleEmojiSelect}
                disabled={isSending || isUploading}
              />

              {/* Text input */}
              <input
                ref={inputRef}
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('chat.messagePlaceholder', 'Type a message...')}
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                disabled={isSending || isUploading}
              />

              {/* Voice recorder button */}
              <button
                onClick={handleStartRecording}
                disabled={isSending || isUploading || !!selectedFile}
                className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition text-white"
                title={t('chat.recordVoice', 'Record voice message')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>

              {/* Send button */}
              <button
                onClick={handleSendMessage}
                disabled={(!messageInput.trim() && !selectedFile) || isSending || isUploading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition"
              >
                {isSending || isUploading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatTab;
