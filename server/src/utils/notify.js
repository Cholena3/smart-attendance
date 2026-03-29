import Notification from '../models/Notification.js';

/**
 * Create a notification for a user and optionally emit via Socket.IO
 */
export async function createNotification({ user, type, title, message, meta }, io) {
  const notification = await Notification.create({ user, type, title, message, meta });

  // Push real-time via Socket.IO if available
  if (io) {
    io.to(`user:${user.toString()}`).emit('notification:new', {
      _id: notification._id,
      type, title, message, meta,
      read: false,
      createdAt: notification.createdAt,
    });
  }

  return notification;
}

/**
 * Notify all students who have attended sessions for a given teacher's subject
 */
export async function notifyStudentsForSubject(Session, teacherId, subject, notifData, io) {
  const studentIds = await Session.find({
    teacher: teacherId,
    subject,
  }).distinct('attendees.student');

  const promises = studentIds.map((studentId) =>
    createNotification({ user: studentId, ...notifData }, io)
  );

  return Promise.all(promises);
}
