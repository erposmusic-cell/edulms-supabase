/**
 * Notification Service - Auto-create notifications for users
 * Called from API routes alongside WA notifications
 */
import { db } from './db'

export type NotificationType = 'attendance' | 'grade' | 'announcement' | 'leave_request' | 'assignment' | 'system'

/**
 * Create a notification for a user
 */
export async function createNotification(params: {
  userId: string
  title: string
  message: string
  type: NotificationType
}): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        isRead: false,
      },
    })
  } catch (error) {
    console.error('Failed to create notification:', error)
  }
}

/**
 * Create notification for all users with a specific role
 */
export async function createNotificationForRole(params: {
  role: string
  title: string
  message: string
  type: NotificationType
  excludeUserId?: string
}): Promise<void> {
  try {
    const users = await db.user.findMany({
      where: {
        role: params.role,
        isActive: true,
        ...(params.excludeUserId && { id: { not: params.excludeUserId } }),
      },
    })

    if (users.length > 0) {
      await db.notification.createMany({
        data: users.map(u => ({
          userId: u.id,
          title: params.title,
          message: params.message,
          type: params.type,
          isRead: false,
        })),
      })
    }
  } catch (error) {
    console.error('Failed to create role notifications:', error)
  }
}

/**
 * Create notification for parents of students in a class
 */
export async function createNotificationForClassParents(params: {
  classId: string
  title: string
  message: string
  type: NotificationType
  excludeUserId?: string
}): Promise<void> {
  try {
    const students = await db.student.findMany({
      where: { classId: params.classId },
      include: { user: true },
    })

    // Find parent users linked to these students
    const parents = await db.parent.findMany({
      where: { childId: { in: students.map(s => s.id) } },
      include: { user: true },
    })

    const userIds = [
      ...parents.map(p => p.userId),
      ...students.map(s => s.userId),
    ].filter(Boolean).filter(id => id !== params.excludeUserId)

    // Deduplicate
    const uniqueUserIds = [...new Set(userIds)]

    if (uniqueUserIds.length > 0) {
      await db.notification.createMany({
        data: uniqueUserIds.map(userId => ({
          userId,
          title: params.title,
          message: params.message,
          type: params.type,
          isRead: false,
        })),
      })
    }
  } catch (error) {
    console.error('Failed to create class parent notifications:', error)
  }
}

/**
 * Create notification for specific user IDs
 */
export async function createNotificationForUsers(params: {
  userIds: string[]
  title: string
  message: string
  type: NotificationType
}): Promise<void> {
  try {
    if (params.userIds.length === 0) return

    await db.notification.createMany({
      data: params.userIds.map(userId => ({
        userId,
        title: params.title,
        message: params.message,
        type: params.type,
        isRead: false,
      })),
    })
  } catch (error) {
    console.error('Failed to create user notifications:', error)
  }
}
