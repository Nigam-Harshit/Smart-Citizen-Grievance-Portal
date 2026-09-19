const Notification = require('../models/Notification');

/**
 * Retrieves notifications for the authenticated user with total and unread counts.
 * GET /api/notifications
 */
const getNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

        const filter = { recipient: userId };
        if (req.query.unreadOnly === 'true') {
            filter.isRead = false;
        }

        const [notifications, unreadCount] = await Promise.all([
            Notification.find(filter)
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean(),
            Notification.countDocuments({ recipient: userId, isRead: false })
        ]);

        res.status(200).json({
            success: true,
            count: notifications.length,
            unreadCount,
            notifications
        });
    } catch (error) {
        console.error('getNotifications error:', error);
        res.status(500).json({ message: 'Failed to retrieve notifications', error: error.message });
    }
};

/**
 * Marks a single notification as read for the authenticated recipient.
 * PUT /api/notifications/:id/read
 */
const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { isRead: true, readAt: new Date() },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found or unauthorized' });
        }

        res.status(200).json({
            success: true,
            message: 'Notification marked as read',
            notification
        });
    } catch (error) {
        console.error('markAsRead error:', error);
        res.status(500).json({ message: 'Failed to mark notification as read', error: error.message });
    }
};

/**
 * Marks all unread notifications as read for the authenticated recipient.
 * PUT /api/notifications/mark-all-read
 */
const markAllAsRead = async (req, res) => {
    try {
        const result = await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        res.status(200).json({
            success: true,
            message: 'All notifications marked as read',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('markAllAsRead error:', error);
        res.status(500).json({ message: 'Failed to mark all notifications as read', error: error.message });
    }
};

/**
 * Safely creates a notification without ever failing, interrupting, or rolling back the primary caller operation.
 * Automatically enforces that the actor is never notified about their own action.
 *
 * @param {Object} options
 * @param {string|mongoose.Types.ObjectId} options.recipient - Target User ObjectId
 * @param {string|mongoose.Types.ObjectId} [options.actor] - Acting User ObjectId (skipped if actor == recipient)
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {'ASSIGNMENT'|'STATUS_CHANGE'|'TIMELINE_UPDATE'|'SYSTEM'} [options.type='SYSTEM']
 * @param {string|mongoose.Types.ObjectId} [options.grievanceId]
 * @param {string} [options.eventKey] - Optional idempotency key for deduplication
 */
const createNotificationSafe = async ({ recipient, actor, title, message, type = 'SYSTEM', grievanceId, eventKey }) => {
    if (!recipient) return null;

    // Rule: Never notify the actor about their own action
    if (actor && String(actor) === String(recipient)) {
        return null;
    }

    try {
        return await Notification.create({
            recipient,
            actor,
            title,
            message,
            type,
            grievanceId,
            eventKey
        });
    } catch (err) {
        // E11000 duplicate key error on eventKey represents safe deduplication of retried events
        if (err.code === 11000) {
            return null;
        }
        console.error('Non-blocking notification dispatch handled:', err.message);
        return null;
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    createNotificationSafe
};

