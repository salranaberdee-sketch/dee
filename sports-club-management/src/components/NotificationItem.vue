<!--
  NotificationItem.vue
  Displays a single notification with title, message, type icon, timestamp
  
  Feature: notification-inbox
  Requirements: 1.3, 2.1, 2.2, 4.1, 6.1
-->
<script setup>
import { computed } from 'vue'

const props = defineProps({
  notification: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['click', 'markRead', 'markUnread', 'delete'])

// ตรวจสอบว่ายังไม่ได้อ่าน
const isUnread = computed(() => !props.notification.is_read)

// Format relative time (e.g., "2 hours ago")
function formatRelativeTime(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)

  if (diffSec < 60) return 'เมื่อสักครู่'
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`
  if (diffHour < 24) return `${diffHour} ชั่วโมงที่แล้ว`
  if (diffDay < 7) return `${diffDay} วันที่แล้ว`
  if (diffWeek < 4) return `${diffWeek} สัปดาห์ที่แล้ว`
  if (diffMonth < 12) return `${diffMonth} เดือนที่แล้ว`
  
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Get icon and label for notification type
const typeConfig = computed(() => {
  const configs = {
    announcement_urgent: {
      label: 'ประกาศเร่งด่วน',
      bgColor: 'var(--accent-danger)',
      icon: 'alert-triangle'
    },
    announcement_normal: {
      label: 'ประกาศ',
      bgColor: 'var(--gray-900)',
      icon: 'megaphone'
    },
    schedule_updates: {
      label: 'ตารางนัดหมาย',
      bgColor: 'var(--gray-900)',
      icon: 'calendar'
    },
    event_reminders: {
      label: 'เตือนกิจกรรม',
      bgColor: 'var(--gray-900)',
      icon: 'clock'
    },
    tournament_updates: {
      label: 'การแข่งขัน',
      bgColor: 'var(--gray-900)',
      icon: 'trophy'
    },
    club_application: {
      label: 'ใบสมัคร',
      bgColor: 'var(--gray-900)',
      icon: 'user-plus'
    }
  }
  return configs[props.notification.type] || configs.announcement_normal
})

// Handle notification click
function handleClick() {
  emit('click', props.notification)
}

// Handle mark as read/unread
function handleToggleRead(e) {
  e.stopPropagation()
  if (isUnread.value) {
    emit('markRead', props.notification.id)
  } else {
    emit('markUnread', props.notification.id)
  }
}

// Handle delete
function handleDelete(e) {
  e.stopPropagation()
  emit('delete', props.notification.id)
}
</script>

<template>
  <div 
    class="notification-item" 
    :class="{ 'notification-item--unread': isUnread }"
    @click="handleClick"
  >
    <!-- Type Icon -->
    <div class="notification-icon" :style="{ background: typeConfig.bgColor }">
      <!-- Alert Triangle (Urgent) -->
      <svg v-if="typeConfig.icon === 'alert-triangle'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      
      <!-- Megaphone (Announcement) -->
      <svg v-else-if="typeConfig.icon === 'megaphone'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 11l18-5v12L3 13v-2z"/>
        <path d="M11.6 16.8a3 3 0 11-5.8-1.6"/>
      </svg>
      
      <!-- Calendar (Schedule) -->
      <svg v-else-if="typeConfig.icon === 'calendar'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      
      <!-- Clock (Event Reminder) -->
      <svg v-else-if="typeConfig.icon === 'clock'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      
      <!-- Trophy (Tournament) -->
      <svg v-else-if="typeConfig.icon === 'trophy'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 010-5H6"/>
        <path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>
        <path d="M4 22h16"/>
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
        <path d="M18 2H6v7a6 6 0 0012 0V2z"/>
      </svg>
      
      <!-- User Plus (Club Application) -->
      <svg v-else-if="typeConfig.icon === 'user-plus'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="8.5" cy="7" r="4"/>
        <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
      </svg>
    </div>

    <!-- Content -->
    <div class="notification-content">
      <div class="notification-header">
        <span class="notification-type">{{ typeConfig.label }}</span>
        <span class="notification-time">{{ formatRelativeTime(notification.created_at) }}</span>
      </div>
      <h4 class="notification-title">{{ notification.title }}</h4>
      <p class="notification-message">{{ notification.message }}</p>
    </div>
    
    <!-- Actions -->
    <div class="notification-actions">
      <!-- Mark Read/Unread Button -->
      <button 
        class="action-btn" 
        :title="isUnread ? 'ทำเครื่องหมายว่าอ่านแล้ว' : 'ทำเครื่องหมายว่ายังไม่อ่าน'"
        @click="handleToggleRead"
      >
        <!-- Check Circle (Mark as Read) -->
        <svg v-if="isUnread" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <!-- Circle (Mark as Unread) -->
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      </button>
      
      <!-- Delete Button -->
      <button 
        class="action-btn action-btn--danger" 
        title="ลบการแจ้งเตือน"
        @click="handleDelete"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      </button>
    </div>
    
    <!-- Unread Indicator -->
    <div v-if="isUnread" class="unread-indicator"></div>
  </div>
</template>

<style scoped>
.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--white, #ffffff);
  border-radius: 12px;
  border: 1px solid var(--gray-200, #e5e5e5);
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.notification-item:hover {
  background: var(--gray-50, #fafafa);
  border-color: var(--gray-300, #d4d4d4);
}

/* Unread state - bold styling */
.notification-item--unread {
  background: var(--gray-50, #fafafa);
  border-left: 3px solid var(--gray-900, #171717);
}

.notification-item--unread .notification-title {
  font-weight: 700;
}

.notification-item--unread .notification-message {
  color: var(--gray-700, #404040);
}

/* Type Icon */
.notification-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-icon svg {
  width: 20px;
  height: 20px;
  color: var(--white, #ffffff);
}

/* Content */
.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.notification-type {
  font-size: 11px;
  font-weight: 600;
  color: var(--gray-500, #737373);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.notification-time {
  font-size: 12px;
  color: var(--gray-400, #a3a3a3);
  white-space: nowrap;
}

.notification-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--gray-900, #171717);
  margin: 0 0 4px 0;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.notification-message {
  font-size: 13px;
  color: var(--gray-500, #737373);
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* Actions */
.notification-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  color: var(--gray-400, #a3a3a3);
}

.action-btn:hover {
  background: var(--gray-100, #f5f5f5);
  color: var(--gray-700, #404040);
}

.action-btn--danger:hover {
  background: #fef2f2;
  color: var(--accent-danger, #ef4444);
}

.action-btn svg {
  width: 18px;
  height: 18px;
}

/* Unread Indicator Dot */
.unread-indicator {
  position: absolute;
  top: 50%;
  left: 6px;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  background: var(--gray-900, #171717);
  border-radius: 50%;
}

/* Mobile adjustments */
@media (max-width: 480px) {
  .notification-item {
    padding: 12px;
    gap: 10px;
  }
  
  .notification-icon {
    width: 36px;
    height: 36px;
  }
  
  .notification-icon svg {
    width: 18px;
    height: 18px;
  }
  
  .notification-actions {
    flex-direction: row;
  }
  
  .action-btn {
    width: 28px;
    height: 28px;
  }
  
  .action-btn svg {
    width: 16px;
    height: 16px;
  }
}
</style>
