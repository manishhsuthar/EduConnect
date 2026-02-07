const onlineUserCounts = new Map();

const addOnlineUser = (userId) => {
  if (!userId) return;
  const key = userId.toString();
  const current = onlineUserCounts.get(key) || 0;
  onlineUserCounts.set(key, current + 1);
};

const removeOnlineUser = (userId) => {
  if (!userId) return;
  const key = userId.toString();
  const current = onlineUserCounts.get(key) || 0;
  if (current <= 1) {
    onlineUserCounts.delete(key);
  } else {
    onlineUserCounts.set(key, current - 1);
  }
};

const getOnlineUserIds = () => Array.from(onlineUserCounts.keys());

const getOnlineCount = () => onlineUserCounts.size;

module.exports = {
  addOnlineUser,
  removeOnlineUser,
  getOnlineUserIds,
  getOnlineCount,
};
