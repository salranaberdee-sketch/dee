<script setup>
/**
 * Online/Offline Indicator Component
 * Shows connection status and pending sync items in NavBar
 * 
 * PWA Feature: Online/Offline indicator
 */
import { computed } from 'vue'
import { useOfflineSyncStore } from '@/stores/offlineSync'

const offlineSync = useOfflineSyncStore()

const statusConfig = computed(() => {
  switch (offlineSync.syncStatus) {
    case 'offline':
      return {
        icon: 'offline',
        label: 'ออฟไลน์',
        class: 'status-offline'
      }
    case 'syncing':
      return {
        icon: 'sync',
        label: 'กำลังซิงค์...',
        class: 'status-syncing'
      }
    case 'pending':
      return {
        icon: 'pending',
        label: `รอซิงค์ ${offlineSync.pendingCount} รายการ`,
        class: 'status-pending'
      }
    default:
      return {
        icon: 'online',
        label: 'ออนไลน์',
        class: 'status-online'
      }
  }
})

// Only show when offline or has pending items
const shouldShow = computed(() => {
  return !offlineSync.isOnline || offlineSync.hasPendingItems || offlineSync.isSyncing
})
</script>

<template>
  <div v-if="shouldShow" class="online-indicator" :class="statusConfig.class">
    <!-- Offline icon -->
    <svg v-if="statusConfig.icon === 'offline'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.58 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"/>
    </svg>
    
    <!-- Syncing icon (animated) -->
    <svg v-else-if="statusConfig.icon === 'sync'" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="spin">
      <path d="M23 4v6h-6M1 20v-6h6"/>
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
    </svg>
    
    <!-- Pending icon -->
    <svg v-else-if="statusConfig.icon === 'pending'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
    
    <!-- Online icon -->
    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01"/>
    </svg>
    
    <span class="indicator-label">{{ statusConfig.label }}</span>
    
    <!-- Pending count badge -->
    <span v-if="offlineSync.pendingCount > 0" class="pending-badge">
      {{ offlineSync.pendingCount }}
    </span>
  </div>
</template>

<style scoped>
.online-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.online-indicator svg {
  width: 14px;
  height: 14px;
  stroke-width: 2;
}

.status-online {
  background: #D1FAE5;
  color: #065F46;
}

.status-offline {
  background: #FEE2E2;
  color: #991B1B;
}

.status-syncing {
  background: #FEF3C7;
  color: #92400E;
}

.status-pending {
  background: #E0E7FF;
  color: #3730A3;
}

.indicator-label {
  white-space: nowrap;
}

.pending-badge {
  background: #171717;
  color: white;
  font-size: 9px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Hide label on very small screens */
@media (max-width: 360px) {
  .indicator-label {
    display: none;
  }
}
</style>
