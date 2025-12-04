# 🔔 AMDA Notifications System Documentation

## Overview

The AMDA Notifications System is a comprehensive, multi-channel notification platform that supports **Email**, **SMS**, **Push Notifications**, **In-App Notifications**, and **Webhooks**. It features template management, user preferences, queue processing, real-time delivery, and WebSocket integration.

## 🏗 Architecture

### Core Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Controllers   │    │    Services      │    │    Channels     │
│                 │────│                  │────│                 │
│ • REST APIs     │    │ • Business Logic │    │ • Email (SMTP)  │
│ • Validation    │    │ • Template Mgmt  │    │ • SMS           │
│ • Error Handling│    │ • User Prefs     │    │ • Push          │
└─────────────────┘    │ • Queue Mgmt     │    │ • In-App        │
                       │ • WebSocket      │    │ • Webhooks      │
                       └──────────────────┘    └─────────────────┘
                                │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│    Database     │    │   Events/Queue   │    │   Templates     │
│                 │    │                  │    │                 │
│ • notifications │    │ • Bull Queue     │    │ • JSON Templates│
│ • templates     │────│ • Redis Backend  │────│ • Variable Sub. │
│ • preferences   │    │ • Retry Logic    │    │ • Multi-Channel │
│ • deliveries    │    │ • Scheduling     │    │ • Versioning    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📁 File Structure

```
src/modules/notifications/
├── channels/                   # Delivery channels
│   ├── email.channel.ts       # SMTP email delivery
│   ├── sms.channel.ts         # SMS delivery
│   ├── push.channel.ts        # Push notifications
│   ├── in-app.channel.ts      # In-app notifications
│   └── webhook.channel.ts     # Webhook delivery
├── controllers/
│   └── notification.controller.ts  # REST API endpoints
├── services/
│   ├── notification.service.ts     # Core business logic
│   ├── template.service.ts         # Template management
│   ├── channel-factory.service.ts  # Channel creation
│   ├── notification-queue.service.ts # Queue management
│   └── websocket-notification.service.ts # Real-time delivery
├── interfaces/
│   ├── notification.interface.ts   # Type definitions
│   └── events.interface.ts         # Event interfaces
├── dtos/
│   └── notification.dto.ts         # Data transfer objects
├── routes/
│   └── notification.routes.ts      # API route definitions
└── templates/                      # JSON templates
    ├── password-reset.template.json
    └── password-changed.template.json
```

## 🛠 Setup & Configuration

### 1. Environment Variables

Add these to your `.env` file:

```env
# Email Configuration (Required for Email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_NAME=AMDA Platform
SMTP_FROM_EMAIL=noreply@amda.com

# Redis Configuration (Required for queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=3600

# Optional: SMS Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+1234567890

# Optional: Push Notification Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
```

### 2. Database Migration

The system requires the following database tables:

```sql
-- notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(255) NOT NULL,
    channel notification_channel_enum NOT NULL,
    status notification_status_enum DEFAULT 'pending',
    priority notification_priority_enum DEFAULT 'normal',
    recipient_id UUID NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(20),
    subject VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    template_data JSONB,
    template_id UUID,
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,
    error_message TEXT,
    error_details JSONB,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    is_archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- notification_templates table
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(255) NOT NULL,
    channel notification_channel_enum NOT NULL,
    subject VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    html_content TEXT,
    default_data JSONB,
    variables JSONB,
    is_active BOOLEAN DEFAULT true,
    version VARCHAR(50) DEFAULT '1.0.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- notification_preferences table
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(255) NOT NULL,
    channel notification_channel_enum NOT NULL,
    enabled BOOLEAN DEFAULT true,
    settings JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Initialize Services

The notification system is automatically initialized when the application starts via the route registration in `/api/routes/index.ts`.

## 🚀 Usage Guide

### 1. Quick Start - Send a Simple Notification

```typescript
import { NotificationHelper } from '@/shared/utils/notification-helper';
import { NotificationChannel, NotificationPriority } from '@/database/entities/notification.entity';

// Send a welcome email
await NotificationHelper.sendWelcome(
  'user-123',
  'user@example.com',
  'John Doe'
);

// Send a custom notification
await NotificationHelper.sendCustomNotification(
  'user-123',
  'form_submitted',
  {
    formTitle: 'Solar Installation Report',
    submissionId: 'sub-456'
  },
  {
    channel: NotificationChannel.EMAIL,
    priority: NotificationPriority.HIGH
  }
);
```

### 2. Using the Service Directly

```typescript
import { NotificationService } from '@/modules/notifications/services/notification.service';
import { NotificationChannel, NotificationPriority } from '@/database/entities/notification.entity';

const notificationService = new NotificationService(/* dependencies */);

// Send single notification
const notification = await notificationService.sendNotification({
  type: 'form_approved',
  channel: NotificationChannel.EMAIL,
  recipientId: 'user-123',
  recipientEmail: 'user@example.com',
  subject: 'Form Approved',
  content: 'Your form has been approved.',
  priority: NotificationPriority.NORMAL
});

// Send bulk notifications
const notifications = await notificationService.sendBulkNotification({
  type: 'system_maintenance',
  recipients: [
    { recipientId: 'user-1', recipientEmail: 'user1@example.com' },
    { recipientId: 'user-2', recipientEmail: 'user2@example.com' }
  ],
  channel: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
  data: {
    maintenanceStart: '2024-12-25 02:00:00',
    maintenanceEnd: '2024-12-25 06:00:00'
  }
});
```

### 3. Template-Based Notifications

#### Create a Template

```typescript
import { TemplateService } from '@/modules/notifications/services/template.service';

const templateService = new TemplateService();

const template = await templateService.createTemplate({
  name: 'form_submission_confirmation',
  type: 'form_confirmation',
  channel: NotificationChannel.EMAIL,
  subject: 'Form Submission Confirmed - {{formTitle}}',
  content: `
    Hello {{userName}},
    
    Your form "{{formTitle}}" has been successfully submitted.
    
    Submission Details:
    - Submission ID: {{submissionId}}
    - Submitted At: {{submittedAt}}
    - Status: {{status}}
    
    You can track your submission status at: {{trackingUrl}}
    
    Best regards,
    AMDA Team
  `,
  htmlContent: `
    <h2>Form Submission Confirmed</h2>
    <p>Hello {{userName}},</p>
    <p>Your form "<strong>{{formTitle}}</strong>" has been successfully submitted.</p>
    
    <h3>Submission Details:</h3>
    <ul>
      <li>Submission ID: {{submissionId}}</li>
      <li>Submitted At: {{submittedAt}}</li>
      <li>Status: <span style="color: green;">{{status}}</span></li>
    </ul>
    
    <p><a href="{{trackingUrl}}">Track your submission status</a></p>
    
    <p>Best regards,<br/>AMDA Team</p>
  `,
  variables: ['userName', 'formTitle', 'submissionId', 'submittedAt', 'status', 'trackingUrl']
});
```

#### Use Template in Notification

```typescript
// Send notification using template
await notificationService.sendNotification({
  type: 'form_confirmation',
  channel: NotificationChannel.EMAIL,
  recipientId: 'user-123',
  recipientEmail: 'user@example.com',
  subject: '', // Will be populated from template
  content: '', // Will be populated from template
  templateId: template.id,
  templateData: {
    userName: 'John Doe',
    formTitle: 'Solar Installation Report',
    submissionId: 'SUB-789',
    submittedAt: new Date().toLocaleString(),
    status: 'SUBMITTED',
    trackingUrl: 'https://app.amda.com/submissions/SUB-789'
  }
});
```

## 📱 Frontend Integration

### 1. React/Vue.js - User Notifications

```typescript
// api/notifications.ts
interface Notification {
  id: string;
  type: string;
  subject: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isRead: boolean;
  createdAt: string;
}

class NotificationAPI {
  static async getUserNotifications(userId: string, page = 1, limit = 20) {
    const response = await fetch(`/api/v1/notifications/users/${userId}/notifications?page=${page}&limit=${limit}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return response.json();
  }

  static async markAsRead(userId: string, notificationId: string) {
    const response = await fetch(`/api/v1/notifications/users/${userId}/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return response.json();
  }

  static async markAllAsRead(userId: string) {
    const response = await fetch(`/api/v1/notifications/users/${userId}/notifications/read-all`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return response.json();
  }

  static async getNotificationStats(userId: string) {
    const response = await fetch(`/api/v1/notifications/users/${userId}/notifications/stats`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return response.json();
  }
}
```

### 2. React Component Example

```typescript
// components/NotificationCenter.tsx
import React, { useState, useEffect } from 'react';
import { NotificationAPI } from '../api/notifications';

interface NotificationCenterProps {
  userId: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
    loadStats();
  }, [userId]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await NotificationAPI.getUserNotifications(userId);
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await NotificationAPI.markAsRead(userId, notificationId);
      // Update local state
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await NotificationAPI.markAllAsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <div className="notification-center">
      <div className="notification-header">
        <h3>Notifications {unreadCount > 0 && <span className="badge">{unreadCount}</span>}</h3>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead}>Mark All Read</button>
        )}
      </div>
      
      <div className="notification-list">
        {loading ? (
          <div>Loading...</div>
        ) : notifications.length === 0 ? (
          <div>No notifications</div>
        ) : (
          notifications.map(notification => (
            <div
              key={notification.id}
              className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
              onClick={() => !notification.isRead && markAsRead(notification.id)}
            >
              <div className="notification-subject">{notification.subject}</div>
              <div className="notification-content">{notification.content}</div>
              <div className="notification-time">
                {new Date(notification.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
```

### 3. WebSocket Integration for Real-time Notifications

```typescript
// services/websocket.ts
import { io, Socket } from 'socket.io-client';

class NotificationWebSocket {
  private socket: Socket | null = null;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.connect();
  }

  connect() {
    this.socket = io('ws://localhost:3000', {
      auth: { token: getToken() }
    });

    this.socket.on('connect', () => {
      console.log('Connected to notification service');
      // Join user-specific room
      this.socket?.emit('join', { userId: this.userId });
    });

    this.socket.on('notification', (notification) => {
      console.log('New notification received:', notification);
      // Handle real-time notification
      this.handleNewNotification(notification);
    });

    this.socket.on('notification_updated', (notification) => {
      console.log('Notification updated:', notification);
      // Handle notification updates (read/unread status changes)
      this.handleNotificationUpdate(notification);
    });
  }

  private handleNewNotification(notification: any) {
    // Show toast notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.subject, {
        body: notification.content,
        icon: '/icon-notification.png'
      });
    }

    // Update UI state (e.g., increment unread count)
    // Trigger a state update in your app
    window.dispatchEvent(new CustomEvent('new-notification', { detail: notification }));
  }

  private handleNotificationUpdate(notification: any) {
    // Update notification in UI
    window.dispatchEvent(new CustomEvent('notification-updated', { detail: notification }));
  }

  disconnect() {
    this.socket?.disconnect();
  }
}
```

### 4. User Preferences Management

```typescript
// components/NotificationPreferences.tsx
import React, { useState, useEffect } from 'react';

interface PreferenceSettings {
  type: string;
  channel: string;
  enabled: boolean;
  settings?: Record<string, any>;
}

export const NotificationPreferences: React.FC<{ userId: string }> = ({ userId }) => {
  const [preferences, setPreferences] = useState<PreferenceSettings[]>([]);

  const notificationTypes = [
    { key: 'form_submitted', label: 'Form Submissions' },
    { key: 'form_approved', label: 'Form Approvals' },
    { key: 'payment_reminder', label: 'Payment Reminders' },
    { key: 'system_maintenance', label: 'System Maintenance' }
  ];

  const channels = [
    { key: 'email', label: 'Email' },
    { key: 'sms', label: 'SMS' },
    { key: 'in_app', label: 'In-App' },
    { key: 'push', label: 'Push Notifications' }
  ];

  const updatePreference = async (type: string, channel: string, enabled: boolean) => {
    try {
      await fetch(`/api/v1/notifications/users/${userId}/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ type, channel, enabled })
      });
      
      // Update local state
      setPreferences(prev => prev.map(pref => 
        pref.type === type && pref.channel === channel 
          ? { ...pref, enabled }
          : pref
      ));
    } catch (error) {
      console.error('Failed to update preference:', error);
    }
  };

  return (
    <div className="notification-preferences">
      <h3>Notification Preferences</h3>
      
      <table>
        <thead>
          <tr>
            <th>Notification Type</th>
            {channels.map(channel => (
              <th key={channel.key}>{channel.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {notificationTypes.map(type => (
            <tr key={type.key}>
              <td>{type.label}</td>
              {channels.map(channel => (
                <td key={channel.key}>
                  <input
                    type="checkbox"
                    checked={preferences.find(p => p.type === type.key && p.channel === channel.key)?.enabled ?? true}
                    onChange={(e) => updatePreference(type.key, channel.key, e.target.checked)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

## 📊 API Reference

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/notifications` | Create single notification (Admin only) |
| `POST` | `/api/v1/notifications/bulk` | Send bulk notifications (Admin only) |
| `GET` | `/api/v1/notifications` | Get all notifications with filters (Admin only) |
| `GET` | `/api/v1/notifications/:id` | Get single notification |
| `GET` | `/api/v1/notifications/users/:userId/notifications` | Get user notifications |
| `PATCH` | `/api/v1/notifications/users/:userId/notifications/:id/read` | Mark as read |
| `PATCH` | `/api/v1/notifications/users/:userId/notifications/:id/unread` | Mark as unread |
| `PATCH` | `/api/v1/notifications/users/:userId/notifications/read-all` | Mark all as read |
| `DELETE` | `/api/v1/notifications/users/:userId/notifications/:id` | Delete notification |
| `DELETE` | `/api/v1/notifications/users/:userId/notifications` | Delete multiple notifications |

### User Preferences

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/notifications/users/:userId/preferences` | Get user preferences |
| `PUT` | `/api/v1/notifications/users/:userId/preferences` | Update user preference |

### Statistics & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/notifications/users/:userId/notifications/stats` | Get user notification stats |
| `GET` | `/api/v1/notifications/queue/stats` | Get queue statistics (Admin only) |

### Test Endpoints (Development Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/notifications/test/email` | Test email delivery |
| `POST` | `/api/v1/notifications/test/full-pipeline` | Test full notification pipeline |
| `POST` | `/api/v1/notifications/test/in-app` | Test in-app notification |
| `POST` | `/api/v1/notifications/test/template` | Test template rendering |
| `GET` | `/api/v1/notifications/test/queue-stats` | Test queue statistics |

## 🧪 Testing

### 1. Test Email Configuration

```bash
curl -X POST http://localhost:3000/api/v1/notifications/test/email \
  -H "Content-Type: application/json" \
  -d '{
    "recipientEmail": "test@example.com",
    "subject": "Test Email",
    "content": "This is a test email from the notification system."
  }'
```

### 2. Test Full Pipeline

```bash
curl -X POST http://localhost:3000/api/v1/notifications/test/full-pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "test-user-123",
    "recipientEmail": "test@example.com",
    "type": "test_notification",
    "subject": "Test Pipeline Notification",
    "content": "Testing the full notification pipeline"
  }'
```

### 3. Test In-App Notification

```bash
curl -X POST http://localhost:3000/api/v1/notifications/test/in-app \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "test-user-123",
    "subject": "Test In-App Notification",
    "content": "This is a test in-app notification"
  }'
```

## 🔧 Troubleshooting

### Common Issues & Solutions

#### 1. Email Notifications Not Working

**Issue**: Notifications are created but emails are not being sent.

**Solutions**:
- Check SMTP configuration in environment variables
- Verify email credentials and permissions
- Test email configuration using the test endpoint
- Check logs for authentication errors

#### 2. Queue Not Processing

**Issue**: Notifications stuck in pending status.

**Solutions**:
- Ensure Redis is running and accessible
- Check Redis connection configuration
- Restart the notification queue service
- Monitor queue statistics endpoint

#### 3. WebSocket Connections Failing

**Issue**: Real-time notifications not working.

**Solutions**:
- Verify WebSocket server is running
- Check authentication tokens
- Ensure firewall/proxy allows WebSocket connections
- Test WebSocket connection independently

#### 4. Template Rendering Errors

**Issue**: Template variables not being replaced.

**Solutions**:
- Verify template exists and is active
- Check template variable names match data keys
- Ensure template data is properly formatted JSON
- Test template rendering using test endpoint

### Debug Commands

```bash
# Check notification queue status
curl http://localhost:3000/api/v1/notifications/test/queue-stats

# Check database connectivity
npm run migration:run

# Test email configuration
curl -X POST http://localhost:3000/api/v1/notifications/test/email -H "Content-Type: application/json" -d '{"recipientEmail":"your-email@example.com"}'
```

## 📈 Performance Considerations

### Optimization Tips

1. **Database Indexing**: Ensure proper indexes on frequently queried columns
2. **Queue Management**: Monitor Redis memory usage and queue length
3. **Batch Processing**: Use bulk notifications for multiple recipients
4. **Template Caching**: Templates are cached for performance
5. **Rate Limiting**: Implement rate limiting for notification APIs

### Monitoring

```typescript
// Monitor notification delivery rates
const stats = await notificationService.getNotificationStats(userId);
console.log('Delivery Stats:', stats);

// Monitor queue health
const queueStats = await queueService.getQueueStats();
console.log('Queue Stats:', queueStats);
```

## 🚀 Production Deployment

### Prerequisites

1. **Database**: PostgreSQL with proper migrations
2. **Redis**: For queue management
3. **SMTP Server**: For email delivery
4. **Environment Variables**: All required configurations

### Security Considerations

1. **API Authentication**: All endpoints require proper authentication
2. **User Authorization**: Users can only access their own notifications
3. **Admin Permissions**: Admin-only endpoints are protected
4. **Data Validation**: All inputs are validated using DTOs
5. **Error Handling**: Sensitive information is not exposed in errors

### Scaling

- **Horizontal Scaling**: Queue workers can be scaled independently
- **Database Optimization**: Consider read replicas for heavy notification loads
- **Caching**: Implement caching for frequently accessed templates and preferences
- **CDN**: Use CDN for static notification assets

---

## 🤝 Contributing

To extend the notification system:

1. **Adding New Channels**: Implement the `INotificationChannel` interface
2. **Custom Templates**: Add new template types and variables
3. **Enhanced Analytics**: Extend the statistics and reporting features
4. **Integration**: Add new event triggers from other modules

For more details, refer to the code documentation and type definitions.