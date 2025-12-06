<template>
  <div class="score-source-bar">
    <!-- Stacked Bar -->
    <div class="bar-container">
      <div 
        v-for="source in displaySources" 
        :key="source.category"
        class="bar-segment"
        :style="{ 
          width: source.weight + '%', 
          backgroundColor: source.color 
        }"
        @click="$emit('segment-click', source.category)"
      >
        <span v-if="source.weight >= 15" class="segment-label">
          {{ source.weight }}%
        </span>
      </div>
    </div>
    
    <!-- Legend -->
    <div class="bar-legend">
      <div 
        v-for="source in displaySources" 
        :key="source.category + '-legend'"
        class="legend-item"
        @click="$emit('segment-click', source.category)"
      >
        <span class="legend-dot" :style="{ backgroundColor: source.color }"></span>
        <span class="legend-name">{{ source.displayName }}</span>
        <span class="legend-weight">{{ source.weight }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  sources: {
    type: Array,
    required: true,
    default: () => []
  }
})

defineEmits(['segment-click'])

// จำกัดแค่ 5 segments
const displaySources = computed(() => {
  return props.sources.slice(0, 5)
})
</script>

<style scoped>
.score-source-bar {
  width: 100%;
}

/* Stacked Bar */
.bar-container {
  display: flex;
  height: 24px;
  border-radius: 6px;
  overflow: hidden;
  background: #E5E5E5;
}

.bar-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.bar-segment:hover {
  opacity: 0.85;
}

.segment-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

/* Legend */
.bar-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
  padding: 0.25rem 0;
}

.legend-item:hover .legend-name {
  text-decoration: underline;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-name {
  font-size: 0.75rem;
  color: #525252;
}

.legend-weight {
  font-size: 0.75rem;
  font-weight: 600;
  color: #171717;
}

/* Responsive */
@media (max-width: 640px) {
  .bar-container {
    height: 20px;
  }
  
  .segment-label {
    font-size: 0.65rem;
  }
  
  .bar-legend {
    gap: 0.5rem;
  }
  
  .legend-name,
  .legend-weight {
    font-size: 0.7rem;
  }
}
</style>
