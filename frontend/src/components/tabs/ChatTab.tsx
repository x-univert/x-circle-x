import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetIsLoggedIn, useGetAccountInfo } from 'lib';
import { useChat } from '../../hooks/useChat';
import { ChatChannel, ChatMessage, OnlineUser } from '../../services/chatService';
import { formatAddress } from '../../services/chatService';

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
    setCurrentChannel,
    sendChannelMessage,
    startPrivateChat,
    sendPrivateChatMessage,
    closePrivateChat,
    clearError
  } = useChat(address);

  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending) return;

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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[600px]">
      {/* Sidebar - Channels & Users */}
      <div className="lg:col-span-1 bg-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col">
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
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="lg:col-span-3 bg-white/10 backdrop-blur-md rounded-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
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
            <button onClick={clearError} className="text-red-300 hover:text-white">✕</button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                isOwn={message.senderAddress === address}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('chat.messagePlaceholder', 'Type a message...')}
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              disabled={isSending}
            />
            <button
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || isSending}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition"
            >
              {isSending ? '...' : '📤'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Message bubble component
function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
          isOwn
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
            : 'bg-white/10 text-white'
        }`}
      >
        {!isOwn && (
          <p className="text-xs text-purple-300 font-semibold mb-1">{message.sender}</p>
        )}
        <p className="break-words">{message.content}</p>
        <p className={`text-xs mt-1 ${isOwn ? 'text-purple-200' : 'text-gray-500'}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

export default ChatTab;
