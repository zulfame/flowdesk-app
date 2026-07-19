export function isPrivileged(user) {
  return user && (user.role === "admin" || user.role === "manager");
}

export function canManage(user, doc) {
  if (!user || !doc) return false;
  return user.role === "admin" || doc.created_by === user.id;
}

export function isTaskPic(user, task) {
  return user && task && (task.pic || {}).user_id === user.id;
}
