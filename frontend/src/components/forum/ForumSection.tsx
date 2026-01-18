import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetAccountInfo } from 'lib';
import { useForum } from '../../hooks/useForum';
import { ForumCategory, CATEGORY_INFO, ForumTopic, ForumComment } from '../../services/forumService';
import { formatAddress } from '../../services/chatService';
import { isFirebaseConfigured } from '../../config/firebase';

export function ForumSection() {
  const { t } = useTranslation();
  const { address } = useGetAccountInfo();
  const isConfigured = isFirebaseConfigured();

  const {
    isLoading,
    error,
    topics,
    currentTopic,
    comments,
    selectedCategory,
    selectTopic,
    closeTopic,
    createNewTopic,
    addNewComment,
    voteOnTopic,
    voteOnComment,
    setSelectedCategory,
    clearError
  } = useForum(address);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicContent, setNewTopicContent] = useState('');
  const [newTopicCategory, setNewTopicCategory] = useState<ForumCategory>(ForumCategory.General);
  const [isCreating, setIsCreating] = useState(false);

  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  // Not configured state
  if (!isConfigured) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
        <div className="text-4xl mb-3">🔧</div>
        <h4 className="text-white font-semibold mb-2">{t('forum.notConfigured', 'Forum Not Configured')}</h4>
        <p className="text-gray-400 text-sm">
          {t('forum.notConfiguredDesc', 'Firebase is not configured. Add your Firebase credentials to enable the forum.')}
        </p>
      </div>
    );
  }

  const handleCreateTopic = async () => {
    if (!newTopicTitle.trim() || !newTopicContent.trim()) return;

    setIsCreating(true);
    const topicId = await createNewTopic(newTopicTitle, newTopicContent, newTopicCategory);
    if (topicId) {
      setShowCreateModal(false);
      setNewTopicTitle('');
      setNewTopicContent('');
      setNewTopicCategory(ForumCategory.General);
    }
    setIsCreating(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsCommenting(true);
    await addNewComment(newComment);
    setNewComment('');
    setIsCommenting(false);
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('forum.justNow', 'just now');
    if (diffMins < 60) return t('forum.minutesAgo', '{{count}}m ago', { count: diffMins });
    if (diffHours < 24) return t('forum.hoursAgo', '{{count}}h ago', { count: diffHours });
    if (diffDays < 7) return t('forum.daysAgo', '{{count}}d ago', { count: diffDays });
    return date.toLocaleDateString();
  };

  // Topic Detail View
  if (currentTopic) {
    return (
      <div className="space-y-4">
        {/* Back button */}
        <button
          onClick={closeTopic}
          className="text-gray-400 hover:text-white flex items-center gap-2 transition"
        >
          <span>←</span> {t('forum.backToTopics', 'Back to topics')}
        </button>

        {/* Topic */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs ${CATEGORY_INFO[currentTopic.category as ForumCategory]?.color || 'bg-gray-500/20 text-gray-300'}`}>
                  {CATEGORY_INFO[currentTopic.category as ForumCategory]?.icon} {CATEGORY_INFO[currentTopic.category as ForumCategory]?.label}
                </span>
                {currentTopic.isPinned && <span className="text-yellow-500">📌</span>}
                {currentTopic.isLocked && <span className="text-red-500">🔒</span>}
              </div>
              <h3 className="text-xl font-bold text-white">{currentTopic.title}</h3>
            </div>
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => voteOnTopic(currentTopic.id, 'up')}
                className="text-gray-400 hover:text-green-400 transition"
              >
                ▲
              </button>
              <span className={`font-bold ${currentTopic.votes > 0 ? 'text-green-400' : currentTopic.votes < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {currentTopic.votes}
              </span>
              <button
                onClick={() => voteOnTopic(currentTopic.id, 'down')}
                className="text-gray-400 hover:text-red-400 transition"
              >
                ▼
              </button>
            </div>
          </div>

          <p className="text-gray-300 whitespace-pre-wrap mb-4">{currentTopic.content}</p>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{t('forum.by', 'By')} <span className="text-purple-400">{currentTopic.author}</span></span>
            <span>{formatTime(currentTopic.createdAt)}</span>
          </div>
        </div>

        {/* Comments */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h4 className="text-white font-semibold mb-4">
            💬 {t('forum.comments', 'Comments')} ({comments.length})
          </h4>

          {/* Comment list */}
          <div className="space-y-4 mb-6">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                {t('forum.noComments', 'No comments yet. Be the first to comment!')}
              </p>
            ) : (
              comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  isOwn={comment.authorAddress === address}
                  onVote={(type) => voteOnComment(comment.id, type)}
                  formatTime={formatTime}
                />
              ))
            )}
          </div>

          {/* Add comment */}
          {!currentTopic.isLocked && address && (
            <div className="border-t border-white/10 pt-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t('forum.addCommentPlaceholder', 'Write a comment...')}
                rows={3}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none mb-3"
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim() || isCommenting}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg transition"
              >
                {isCommenting ? '...' : t('forum.postComment', 'Post Comment')}
              </button>
            </div>
          )}

          {currentTopic.isLocked && (
            <div className="border-t border-white/10 pt-4 text-center">
              <p className="text-gray-500">🔒 {t('forum.topicLocked', 'This topic is locked')}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Topics List View
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <span>💬</span> {t('forum.title', 'Community Forum')}
        </h3>

        {address && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            <span>✏️</span> {t('forum.newTopic', 'New Topic')}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-2 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-300 hover:text-white">✕</button>
        </div>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-lg text-sm transition ${
            selectedCategory === null
              ? 'bg-purple-500/30 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          {t('forum.allCategories', 'All')}
        </button>
        {Object.entries(CATEGORY_INFO).map(([key, info]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key as ForumCategory)}
            className={`px-3 py-1.5 rounded-lg text-sm transition flex items-center gap-1 ${
              selectedCategory === key
                ? `${info.color}`
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <span>{info.icon}</span> {info.label}
          </button>
        ))}
      </div>

      {/* Topics list */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin text-4xl mb-2">🌀</div>
          <p className="text-gray-400">{t('forum.loading', 'Loading topics...')}</p>
        </div>
      ) : topics.length === 0 ? (
        <div className="text-center py-12 bg-white/5 border border-white/10 rounded-xl">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-gray-400 mb-2">{t('forum.noTopics', 'No topics yet')}</p>
          <p className="text-gray-500 text-sm">{t('forum.beFirstToCreate', 'Be the first to start a discussion!')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topics.map((topic) => (
            <TopicItem
              key={topic.id}
              topic={topic}
              onClick={() => selectTopic(topic.id)}
              onVote={(type) => voteOnTopic(topic.id, type)}
              formatTime={formatTime}
            />
          ))}
        </div>
      )}

      {/* Create Topic Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-lg w-full border border-purple-500/30">
            <h3 className="text-xl font-bold text-white mb-4">{t('forum.createTopic', 'Create New Topic')}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">{t('forum.category', 'Category')}</label>
                <select
                  value={newTopicCategory}
                  onChange={(e) => setNewTopicCategory(e.target.value as ForumCategory)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                >
                  {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                    <option key={key} value={key}>
                      {info.icon} {info.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">{t('forum.topicTitle', 'Title')}</label>
                <input
                  type="text"
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  placeholder={t('forum.titlePlaceholder', 'Topic title...')}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">{t('forum.content', 'Content')}</label>
                <textarea
                  value={newTopicContent}
                  onChange={(e) => setNewTopicContent(e.target.value)}
                  placeholder={t('forum.contentPlaceholder', 'What would you like to discuss?')}
                  rows={5}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTopicTitle('');
                  setNewTopicContent('');
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition"
              >
                {t('forum.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleCreateTopic}
                disabled={!newTopicTitle.trim() || !newTopicContent.trim() || isCreating}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition"
              >
                {isCreating ? '...' : t('forum.create', 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Topic item component
function TopicItem({
  topic,
  onClick,
  onVote,
  formatTime
}: {
  topic: ForumTopic;
  onClick: () => void;
  onVote: (type: 'up' | 'down') => void;
  formatTime: (timestamp: any) => string;
}) {
  const { t } = useTranslation();
  const categoryInfo = CATEGORY_INFO[topic.category as ForumCategory] || CATEGORY_INFO[ForumCategory.General];

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition flex gap-4">
      {/* Votes */}
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onVote('up'); }}
          className="text-gray-400 hover:text-green-400 transition p-1"
        >
          ▲
        </button>
        <span className={`font-bold text-sm ${topic.votes > 0 ? 'text-green-400' : topic.votes < 0 ? 'text-red-400' : 'text-gray-400'}`}>
          {topic.votes}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onVote('down'); }}
          className="text-gray-400 hover:text-red-400 transition p-1"
        >
          ▼
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 cursor-pointer" onClick={onClick}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`px-2 py-0.5 rounded text-xs ${categoryInfo.color}`}>
            {categoryInfo.icon} {categoryInfo.label}
          </span>
          {topic.isPinned && <span className="text-yellow-500 text-sm">📌</span>}
          {topic.isLocked && <span className="text-red-500 text-sm">🔒</span>}
        </div>

        <h4 className="text-white font-semibold hover:text-purple-300 transition">{topic.title}</h4>

        <p className="text-gray-400 text-sm line-clamp-2 mt-1">{topic.content}</p>

        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span>{t('forum.by', 'By')} <span className="text-purple-400">{topic.author}</span></span>
          <span>💬 {topic.commentCount}</span>
          <span>{formatTime(topic.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

// Comment item component
function CommentItem({
  comment,
  isOwn,
  onVote,
  formatTime
}: {
  comment: ForumComment;
  isOwn: boolean;
  onVote: (type: 'up' | 'down') => void;
  formatTime: (timestamp: any) => string;
}) {
  return (
    <div className={`flex gap-3 ${isOwn ? 'bg-purple-500/10 rounded-lg p-3' : ''}`}>
      {/* Votes */}
      <div className="flex flex-col items-center gap-0.5">
        <button
          onClick={() => onVote('up')}
          className="text-gray-500 hover:text-green-400 transition text-xs"
        >
          ▲
        </button>
        <span className={`text-xs ${comment.votes > 0 ? 'text-green-400' : comment.votes < 0 ? 'text-red-400' : 'text-gray-500'}`}>
          {comment.votes}
        </span>
        <button
          onClick={() => onVote('down')}
          className="text-gray-500 hover:text-red-400 transition text-xs"
        >
          ▼
        </button>
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm font-semibold ${isOwn ? 'text-purple-400' : 'text-gray-300'}`}>
            {comment.author}
          </span>
          <span className="text-xs text-gray-500">{formatTime(comment.createdAt)}</span>
        </div>
        <p className="text-gray-300 text-sm">{comment.content}</p>
      </div>
    </div>
  );
}

export default ForumSection;
