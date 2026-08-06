/** Administrator = Super Admin (atau pemegang izin '*'). Peran admin/manager/member sudah dihapus. */
export function isAdminUser(user) {
  return Boolean(user && (user.role === "super_admin" || (user.permissions || []).includes("*")));
}

export function isPrivileged(user) {
  return isAdminUser(user);
}

export function canManage(user, doc) {
  if (!user || !doc) return false;
  return isAdminUser(user) || doc.created_by === user.id;
}

export function isTaskPic(user, task) {
  return user && task && (task.pic || {}).user_id === user.id;
}

export function hasPerm(user, key) {
  if (!user) return false;
  const perms = user.permissions || [];
  return isAdminUser(user) || perms.includes(key);
}
