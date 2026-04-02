const toIntId = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) ? parsed : null;
};

const toPublicUser = (user, options = {}) => {
  if (!user) return null;
  const {
    includePassword = false,
    ensureSubjects = true,
  } = options;

  const next = {
    ...user,
    id: String(user.id),
    _id: String(user.id),
  };

  if (!includePassword) {
    delete next.password;
  }

  if (ensureSubjects && !Array.isArray(next.subjects)) {
    next.subjects = [];
  }

  return next;
};

const toPublicNotification = (notification) => {
  if (!notification) return null;
  return {
    ...notification,
    id: String(notification.id),
    _id: String(notification.id),
    user: String(notification.userId),
    userId: String(notification.userId),
  };
};

const toPublicConversation = (conversation) => {
  if (!conversation) return null;

  const participants = Array.isArray(conversation.participants)
    ? conversation.participants.map((entry) => {
        if (entry && entry.user) return toPublicUser(entry.user);
        if (entry && typeof entry.userId !== 'undefined') return String(entry.userId);
        return entry;
      })
    : [];

  return {
    ...conversation,
    id: String(conversation.id),
    _id: String(conversation.id),
    participants,
  };
};

const toPublicMessage = (message) => {
  if (!message) return null;
  const sender =
    message.sender && typeof message.sender === 'object'
      ? toPublicUser(message.sender)
      : message.sender;

  return {
    ...message,
    id: String(message.id),
    _id: String(message.id),
    senderId: String(message.senderId),
    conversationId: String(message.conversationId),
    sender,
  };
};

module.exports = {
  toIntId,
  toPublicUser,
  toPublicNotification,
  toPublicConversation,
  toPublicMessage,
};
