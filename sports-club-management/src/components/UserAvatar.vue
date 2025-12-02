<script setup>
/**
 * UserAvatar Component
 * Reusable avatar component that displays profile picture or fallback character
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 * - 3.1: Display Avatar in Profile page hero section
 * - 3.2: Display Avatar in NavBar
 * - 3.3: Display first character of user name as fallback when no avatar
 * - 3.4: Display fallback character when image fails to load
 */
import { ref, computed } from 'vue'
import { getAvatarFallback } from '@/lib/avatar'

const props = defineProps({
  avatarUrl: {
    type: String,
    default: null
  },
  userName: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'xl'].includes(value)
  },
  editable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

// Track image load error state (Requirement 3.4)
const imageError = ref(false)

// Size mappings in pixels
const sizeMap = {
  sm: 32,   // NavBar, lists
  md: 48,   // Cards, compact views
  lg: 64,   // Profile sections
  xl: 96    // Profile hero
}

// Computed size value
const sizeValue = computed(() => sizeMap[props.size] || 48)

// Font size based on avatar size
const fontSizeMap = {
  sm: 13,
  md: 18,
  lg: 24,
  xl: 36
}

const fontSize = computed(() => fontSizeMap[props.size] || 18)

// Determine if we should show the image or fallback
const showImage = computed(() => {
  return props.avatarUrl && !imageError.value
})

// Get fallback character (Requirement 3.3)
const fallbackChar = computed(() => {
  return getAvatarFallback(props.userName)
})

// Handle image load error (Requirement 3.4)
function handleImageError() {
  imageError.value = true
}

// Handle image load success - reset error state
function handleImageLoad() {
  imageError.value = false
}

// Handle click event
function handleClick() {
  emit('click')
}

// Reset error state when avatarUrl changes
import { watch } from 'vue'
watch(() => props.avatarUrl, () => {
  imageError.value = false
})
</script>

<template>
  <div 
    class="user-avatar"
    :class="[
      `user-avatar--${size}`,
      { 'user-avatar--editable': editable }
    ]"
    :style="{
      width: `${sizeValue}px`,
      height: `${sizeValue}px`,
      fontSize: `${fontSize}px`
    }"
    @click="handleClick"
  >
    <!-- Avatar Image -->
    <img 
      v-if="showImage"
      :src="avatarUrl"
      :alt="userName || 'User avatar'"
      class="user-avatar__image"
      @error="handleImageError"
      @load="handleImageLoad"
    />
    
    <!-- Fallback Character -->
    <span v-else class="user-avatar__fallback">
      {{ fallbackChar }}
    </span>

    <!-- Edit Indicator (shown when editable) -->
    <div v-if="editable" class="user-avatar__edit">
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.user-avatar {
  position: relative;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--gray-800) 0%, var(--gray-900) 100%);
  color: var(--white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
  overflow: hidden;
  border: 2px solid var(--gray-200);
  transition: border-color 0.2s ease;
}

.user-avatar--editable {
  cursor: pointer;
}

.user-avatar--editable:hover {
  border-color: var(--gray-900);
}

.user-avatar__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar__fallback {
  text-transform: uppercase;
  user-select: none;
}

/* Edit indicator overlay */
.user-avatar__edit {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 28%;
  height: 28%;
  min-width: 16px;
  min-height: 16px;
  max-width: 28px;
  max-height: 28px;
  background: var(--gray-900);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--white);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.user-avatar--editable:hover .user-avatar__edit {
  opacity: 1;
}

.user-avatar__edit svg {
  width: 50%;
  height: 50%;
  color: var(--white);
}

/* Size-specific adjustments */
.user-avatar--sm {
  border-width: 1.5px;
}

.user-avatar--sm .user-avatar__edit {
  border-width: 1.5px;
}

.user-avatar--xl {
  border-width: 3px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.user-avatar--xl .user-avatar__edit {
  border-width: 2px;
}
</style>
