<script setup>
/**
 * ProfilePictureModal Component
 * Modal for managing profile picture - upload, select from album, or remove
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 4.1, 4.2, 4.3
 */
import { ref, computed, watch } from 'vue'
import Modal from '@/components/Modal.vue'
import MediaPicker from '@/components/MediaPicker.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { useAuthStore } from '@/stores/auth'
import { validateAvatarFile, uploadAvatar } from '@/lib/avatar'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  currentAvatarUrl: {
    type: String,
    default: null
  },
  userId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close', 'updated'])

const auth = useAuthStore()

// State
const view = ref('options') // 'options', 'upload', 'confirm-remove'
const showMediaPicker = ref(false)
const loading = ref(false)
const error = ref(null)

// Upload state
const selectedFile = ref(null)
const previewUrl = ref(null)
const uploadProgress = ref(0)
const isDragging = ref(false)
const fileInputRef = ref(null)

// Reset state when modal opens/closes
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    resetState()
  }
})

function resetState() {
  view.value = 'options'
  showMediaPicker.value = false
  loading.value = false
  error.value = null
  selectedFile.value = null
  previewUrl.value = null
  uploadProgress.value = 0
  isDragging.value = false
}

// Check if user has an avatar
const hasAvatar = computed(() => !!props.currentAvatarUrl)

// File input handling
function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileSelect(event) {
  const file = event.target.files?.[0]
  if (file) {
    processFile(file)
  }
}

// Drag and drop handling
function handleDragOver(event) {
  event.preventDefault()
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

function handleDrop(event) {
  event.preventDefault()
  isDragging.value = false
  
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    processFile(file)
  }
}

// Process selected file
function processFile(file) {
  error.value = null
  
  // Validate file (Requirements 1.2, 1.3)
  const validation = validateAvatarFile(file)
  if (!validation.valid) {
    error.value = validation.error
    return
  }
  
  selectedFile.value = file
  
  // Create preview URL
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = URL.createObjectURL(file)
  
  // Switch to upload view
  view.value = 'upload'
}

// Upload the selected file
async function handleUpload() {
  if (!selectedFile.value) return
  
  loading.value = true
  error.value = null
  uploadProgress.value = 0
  
  try {
    // Simulate progress (actual upload doesn't provide progress)
    const progressInterval = setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += 10
      }
    }, 100)
    
    // Upload to storage (Requirement 1.4)
    const result = await uploadAvatar(props.userId, selectedFile.value)
    
    clearInterval(progressInterval)
    uploadProgress.value = 100
    
    if (!result.success) {
      error.value = result.error || 'Failed to upload avatar'
      return
    }
    
    // Update profile with new avatar URL (Requirement 1.5)
    const updateResult = await auth.updateAvatar(result.url)
    
    if (!updateResult.success) {
      error.value = updateResult.message || 'Failed to update profile'
      return
    }
    
    // Emit updated event and close
    emit('updated', result.url)
    emit('close')
  } catch (err) {
    console.error('Error uploading avatar:', err)
    error.value = err.message || 'An error occurred while uploading'
  } finally {
    loading.value = false
  }
}

// Handle album selection (Requirements 2.1, 2.2)
function openMediaPicker() {
  showMediaPicker.value = true
}

async function handleMediaSelect(imageUrl) {
  loading.value = true
  error.value = null
  
  try {
    // Update profile with selected image URL (Requirement 2.3)
    const updateResult = await auth.updateAvatar(imageUrl)
    
    if (!updateResult.success) {
      error.value = updateResult.message || 'Failed to update profile'
      return
    }
    
    // Emit updated event and close
    emit('updated', imageUrl)
    emit('close')
  } catch (err) {
    console.error('Error selecting from album:', err)
    error.value = err.message || 'An error occurred'
  } finally {
    loading.value = false
  }
}

// Handle avatar removal (Requirements 4.1, 4.2, 4.3)
function showRemoveConfirmation() {
  view.value = 'confirm-remove'
}

async function handleRemove() {
  loading.value = true
  error.value = null
  
  try {
    // Remove avatar (deletes from storage and sets avatar_url to null)
    const result = await auth.removeAvatar()
    
    if (!result.success) {
      error.value = result.message || 'Failed to remove avatar'
      return
    }
    
    // Emit updated event and close
    emit('updated', null)
    emit('close')
  } catch (err) {
    console.error('Error removing avatar:', err)
    error.value = err.message || 'An error occurred while removing'
  } finally {
    loading.value = false
  }
}

// Navigation
function goBack() {
  if (view.value === 'upload' || view.value === 'confirm-remove') {
    view.value = 'options'
    selectedFile.value = null
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = null
    }
    error.value = null
  }
}

function closeModal() {
  emit('close')
}

// Cleanup preview URL on unmount
import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
})
</script>

<template>
  <Modal :show="isOpen" @close="closeModal">
    <template #header>
      <div class="modal-header-content">
        <button v-if="view !== 'options'" class="btn-back" @click="goBack">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span>
          {{ view === 'options' ? 'รูปโปรไฟล์' : 
             view === 'upload' ? 'อัปโหลดรูปภาพ' : 
             'ยืนยันการลบ' }}
        </span>
      </div>
    </template>

    <template #body>
      <!-- Error Message -->
      <div v-if="error" class="error-message">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>{{ error }}</span>
      </div>

      <!-- Options View (Requirement 1.1) -->
      <div v-if="view === 'options'" class="options-view">
        <!-- Current Avatar Preview -->
        <div class="current-avatar">
          <UserAvatar 
            :avatar-url="currentAvatarUrl" 
            :user-name="auth.profile?.name || ''" 
            size="xl"
          />
        </div>

        <!-- Action Options -->
        <div class="options-list">
          <button class="option-btn" @click="triggerFileInput">
            <div class="option-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div class="option-text">
              <span class="option-title">อัปโหลดรูปใหม่</span>
              <span class="option-desc">JPG, PNG หรือ WebP ไม่เกิน 2MB</span>
            </div>
          </button>

          <button class="option-btn" @click="openMediaPicker">
            <div class="option-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            <div class="option-text">
              <span class="option-title">เลือกจากอัลบั้ม</span>
              <span class="option-desc">ใช้รูปที่มีอยู่แล้ว</span>
            </div>
          </button>

          <button 
            v-if="hasAvatar" 
            class="option-btn option-btn--danger" 
            @click="showRemoveConfirmation"
          >
            <div class="option-icon option-icon--danger">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </div>
            <div class="option-text">
              <span class="option-title option-title--danger">ลบรูปโปรไฟล์</span>
              <span class="option-desc">กลับไปใช้ตัวอักษรแทน</span>
            </div>
          </button>
        </div>

        <!-- Hidden file input -->
        <input 
          ref="fileInputRef"
          type="file" 
          accept="image/jpeg,image/png,image/webp"
          class="hidden-input"
          @change="handleFileSelect"
        />
      </div>

      <!-- Upload View (Requirements 1.2, 1.3, 1.4) -->
      <div v-else-if="view === 'upload'" class="upload-view">
        <!-- Preview -->
        <div v-if="previewUrl" class="upload-preview">
          <img :src="previewUrl" alt="Preview" />
        </div>

        <!-- Drop Zone (when no file selected) -->
        <div 
          v-else
          class="drop-zone"
          :class="{ 'drop-zone--active': isDragging }"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          @drop="handleDrop"
          @click="triggerFileInput"
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <p>ลากไฟล์มาวางที่นี่</p>
          <span>หรือคลิกเพื่อเลือกไฟล์</span>
        </div>

        <!-- Progress Bar -->
        <div v-if="loading" class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${uploadProgress}%` }"></div>
          </div>
          <span class="progress-text">กำลังอัปโหลด... {{ uploadProgress }}%</span>
        </div>

        <!-- File Info -->
        <div v-if="selectedFile && !loading" class="file-info">
          <span class="file-name">{{ selectedFile.name }}</span>
          <span class="file-size">{{ (selectedFile.size / 1024).toFixed(1) }} KB</span>
        </div>
      </div>

      <!-- Remove Confirmation View (Requirement 4.1) -->
      <div v-else-if="view === 'confirm-remove'" class="confirm-view">
        <div class="confirm-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h4>ลบรูปโปรไฟล์?</h4>
        <p>รูปโปรไฟล์จะถูกลบและกลับไปใช้ตัวอักษรตัวแรกของชื่อแทน</p>
      </div>
    </template>

    <template #footer>
      <!-- Options View Footer -->
      <div v-if="view === 'options'" class="modal-footer-content">
        <button class="btn btn-secondary" @click="closeModal">ปิด</button>
      </div>

      <!-- Upload View Footer -->
      <div v-else-if="view === 'upload'" class="modal-footer-content">
        <button class="btn btn-secondary" @click="goBack" :disabled="loading">ยกเลิก</button>
        <button 
          class="btn btn-primary" 
          :disabled="!selectedFile || loading"
          @click="handleUpload"
        >
          <svg v-if="loading" class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          {{ loading ? 'กำลังอัปโหลด...' : 'อัปโหลด' }}
        </button>
      </div>

      <!-- Remove Confirmation Footer -->
      <div v-else-if="view === 'confirm-remove'" class="modal-footer-content">
        <button class="btn btn-secondary" @click="goBack" :disabled="loading">ยกเลิก</button>
        <button 
          class="btn btn-danger" 
          :disabled="loading"
          @click="handleRemove"
        >
          <svg v-if="loading" class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          {{ loading ? 'กำลังลบ...' : 'ลบรูปโปรไฟล์' }}
        </button>
      </div>
    </template>
  </Modal>

  <!-- Media Picker Modal (Requirements 2.1, 2.2) -->
  <MediaPicker 
    :show="showMediaPicker"
    :user-id="userId"
    @close="showMediaPicker = false"
    @select="handleMediaSelect"
  />
</template>


<style scoped>
/* Modal Header */
.modal-header-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-back {
  width: 32px;
  height: 32px;
  background: #F5F5F5;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-back:hover {
  background: #E5E5E5;
}

/* Error Message */
.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 10px;
  color: #DC2626;
  font-size: 13px;
  margin-bottom: 16px;
}

.error-message svg {
  flex-shrink: 0;
}

/* Options View */
.options-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.current-avatar {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px;
  background: #FAFAFA;
  border: 1.5px solid #E5E5E5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}

.option-btn:hover {
  background: #F5F5F5;
  border-color: #D4D4D4;
}

.option-btn--danger:hover {
  background: #FEF2F2;
  border-color: #FECACA;
}

.option-icon {
  width: 44px;
  height: 44px;
  background: #171717;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.option-icon svg {
  color: #fff;
}

.option-icon--danger {
  background: #EF4444;
}

.option-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-title {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
}

.option-title--danger {
  color: #DC2626;
}

.option-desc {
  font-size: 12px;
  color: #737373;
}

.hidden-input {
  display: none;
}

/* Upload View */
.upload-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.upload-preview {
  width: 100%;
  aspect-ratio: 1;
  max-width: 240px;
  margin: 0 auto;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #E5E5E5;
}

.upload-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 20px;
  border: 2px dashed #D4D4D4;
  border-radius: 12px;
  background: #FAFAFA;
  cursor: pointer;
  transition: all 0.2s;
}

.drop-zone:hover,
.drop-zone--active {
  border-color: #171717;
  background: #F5F5F5;
}

.drop-zone svg {
  color: #737373;
}

.drop-zone p {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #404040;
}

.drop-zone span {
  font-size: 12px;
  color: #737373;
}

/* Progress */
.progress-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-bar {
  height: 6px;
  background: #E5E5E5;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #171717;
  border-radius: 3px;
  transition: width 0.2s ease;
}

.progress-text {
  font-size: 12px;
  color: #737373;
  text-align: center;
}

/* File Info */
.file-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #F5F5F5;
  border-radius: 8px;
}

.file-name {
  font-size: 13px;
  color: #404040;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.file-size {
  font-size: 12px;
  color: #737373;
}

/* Confirm View */
.confirm-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 20px 0;
}

.confirm-icon {
  width: 72px;
  height: 72px;
  background: #FEF2F2;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.confirm-icon svg {
  color: #EF4444;
}

.confirm-view h4 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: #171717;
}

.confirm-view p {
  margin: 0;
  font-size: 14px;
  color: #737373;
  max-width: 280px;
}

/* Footer */
.modal-footer-content {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: 0.15s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #171717;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #262626;
}

.btn-secondary {
  background: #fff;
  color: #404040;
  border: 1px solid #E5E5E5;
}

.btn-secondary:hover:not(:disabled) {
  background: #F5F5F5;
}

.btn-danger {
  background: #EF4444;
  color: #fff;
}

.btn-danger:hover:not(:disabled) {
  background: #DC2626;
}

/* Spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}
</style>
