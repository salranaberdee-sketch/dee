<template>
  <router-link :to="to" class="action-card" :class="status">
    <!-- Status Indicator -->
    <div class="status-dot" :class="status"></div>
    
    <!-- Badge -->
    <span v-if="showBadge" class="badge">ตั้งค่า</span>
    
    <!-- Icon (48x48px) -->
    <div class="card-icon">
      <svg v-if="icon === 'settings'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
      <svg v-else-if="icon === 'chart'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 20V10M12 20V4M6 20v-6"/>
      </svg>
      <svg v-else-if="icon === 'calculator'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="4" y="2" width="16" height="20" rx="2"/>
        <line x1="8" y1="6" x2="16" y2="6"/>
        <line x1="8" y1="10" x2="8" y2="10"/>
        <line x1="12" y1="10" x2="12" y2="10"/>
        <line x1="16" y1="10" x2="16" y2="10"/>
        <line x1="8" y1="14" x2="8" y2="14"/>
        <line x1="12" y1="14" x2="12" y2="14"/>
        <line x1="16" y1="14" x2="16" y2="14"/>
        <line x1="8" y1="18" x2="8" y2="18"/>
        <line x1="12" y1="18" x2="16" y2="18"/>
      </svg>
      <svg v-else-if="icon === 'plus-minus'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="11"/>
        <line x1="9" y1="8" x2="15" y2="8"/>
        <line x1="9" y1="16" x2="15" y2="16"/>
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
      </svg>
    </div>
    
    <!-- Title (max 4 words) -->
    <span class="card-title">{{ title }}</span>
  </router-link>
</template>

<script setup>
defineProps({
  icon: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    validator: (value) => value.split(' ').length <= 4
  },
  status: {
    type: String,
    default: 'active',
    validator: (value) => ['active', 'inactive', 'setup'].includes(value)
  },
  showBadge: {
    type: Boolean,
    default: false
  },
  to: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.action-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.25rem 1rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  text-decoration: none;
  min-height: 120px;
  min-width: 140px;
  transition: all 0.15s;
  cursor: pointer;
}

.action-card:hover {
  background: #FAFAFA;
  border-color: #D4D4D4;
  transform: translateY(-2px);
}

.action-card:active {
  transform: translateY(0);
}

/* Status Dot */
.status-dot {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.active {
  background: #22C55E;
}

.status-dot.inactive {
  background: #A3A3A3;
}

.status-dot.setup {
  background: #F59E0B;
}

/* Badge */
.badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 0.2rem 0.5rem;
  background: #171717;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 500;
  border-radius: 4px;
}

/* Icon - 48x48px */
.card-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #171717;
  border-radius: 12px;
}

.card-icon svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

/* Title */
.card-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #171717;
  text-align: center;
}

/* Inactive state */
.action-card.inactive {
  opacity: 0.7;
}

.action-card.inactive .card-icon {
  background: #737373;
}

/* Setup state */
.action-card.setup .card-icon {
  background: #F59E0B;
}

/* Touch target - minimum 48x48px */
@media (hover: none) {
  .action-card {
    min-height: 120px;
  }
}

/* Responsive */
@media (max-width: 640px) {
  .action-card {
    padding: 1rem 0.75rem;
    min-height: 110px;
  }
  
  .card-icon {
    width: 44px;
    height: 44px;
  }
  
  .card-icon svg {
    width: 22px;
    height: 22px;
  }
  
  .card-title {
    font-size: 0.8rem;
  }
}
</style>
