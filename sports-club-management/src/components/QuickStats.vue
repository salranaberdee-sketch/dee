<template>
  <div class="quick-stats">
    <div class="stat-item" @click="$emit('stat-click', 'total')">
      <span class="stat-number">{{ stats.totalAthletes }}</span>
      <span class="stat-label">นักกีฬา</span>
    </div>
    
    <div class="stat-divider"></div>
    
    <div class="stat-item" @click="$emit('stat-click', 'average')">
      <span class="stat-number">{{ stats.avgScore }}</span>
      <span class="stat-label">คะแนนเฉลี่ย</span>
    </div>
    
    <div class="stat-divider"></div>
    
    <div class="stat-item excellent" @click="$emit('stat-click', 'excellent')">
      <span class="stat-number">{{ stats.excellentCount }}</span>
      <span class="stat-label">ดีเยี่ยม</span>
    </div>
    
    <div class="stat-divider"></div>
    
    <div class="stat-item warning" @click="$emit('stat-click', 'needsImprovement')">
      <span class="stat-number">{{ stats.needsImprovementCount }}</span>
      <span class="stat-label">ต้องปรับปรุง</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  stats: {
    type: Object,
    required: true,
    validator: (value) => {
      return typeof value.totalAthletes === 'number' &&
             typeof value.avgScore === 'number' &&
             typeof value.excellentCount === 'number' &&
             typeof value.needsImprovementCount === 'number'
    }
  }
})

defineEmits(['stat-click'])
</script>

<style scoped>
.quick-stats {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 1rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: background 0.15s;
}

.stat-item:hover {
  background: #F5F5F5;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: #171717;
  line-height: 1;
}

.stat-label {
  font-size: 0.7rem;
  color: #737373;
  margin-top: 0.25rem;
}

/* Color variants */
.stat-item.excellent .stat-number {
  color: #059669;
}

.stat-item.warning .stat-number {
  color: #DC2626;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: #E5E5E5;
}

/* Responsive */
@media (max-width: 640px) {
  .quick-stats {
    padding: 0.75rem 0.5rem;
  }
  
  .stat-number {
    font-size: 1.25rem;
  }
  
  .stat-label {
    font-size: 0.65rem;
  }
  
  .stat-divider {
    height: 32px;
  }
}
</style>
