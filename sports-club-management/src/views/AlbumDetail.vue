<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/Modal.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const data = useDataStore()

const albumId = computed(() => route.params.albumId)
const album = ref(null)
const mediaItems = ref([])
const loading = ref(true)
const uploading = ref(false)
const message = ref('')
const messageType = ref('success')

// Storage quota state (Requirement 6.2)
const storageStats = ref({ totalFiles: 0, totalSize: 0, quotaUsedPercent: 0 })
const quotaWarningThreshold = 80 // Show warning at 80% usage

// Preview modal state
const showPreview = ref(false)
const previewMedia = ref(null)

// Edit album modal state
const showEditModal = ref(false)
const editForm = ref({ name: '', description: '', album_type: 'general' })
const isSaving = ref(false)

// Delete confirmation
const showDeleteConfirm = ref(false)
const deleteTarget = ref(null) // 'album' or media id

const albumTypes = [
  { value: 'general', label: 'ทั่วไป' },
  { value: 'competition', label: 'การแข่งขัน' },
  { value: 'training', label: 'ฝึกซ้อม' },
  { value: 'documents', label: 'เอกสาร' }
]

// Check if current user owns this album
const isOwner = computed(() => {
  return album.value?.user_id === auth.user?.id
})

// Computed: quota warning states (Requirement 6.2)
const isApproachingQuota = computed(() => {
  return storageStats.value.quotaUsedPercent >= quotaWarningThreshold && 
         storageStats.value.quotaUsedPercent < 100
})

const isQuotaExceeded = computed(() => {
  return storageStats.value.quotaUsedPercent >= 100
})

// Format storage size for display
function formatStorageSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Load album and media
async function loadAlbum() {
  loading.value = true
  try {
    // First try to fetch the album directly by ID (works for both owner and coach viewing)
    const { data: albumData, error: albumErr } = await supabase
      .from('user_albums')
      .select('*')
      .eq('id', albumId.value)
      .single()
    
    if (albumErr) {
      console.error('Error fetching album:', albumErr)
      album.value = null
    } else {
      album.value = albumData
    }
    
    if (album.value) {
      // Fetch media items
      mediaItems.value = await data.fetchAlbumMedia(albumId.value)
      
      // Load storage stats for quota warning (Requirement 6.2)
      if (album.value.user_id) {
        storageStats.value = await data.getUserStorageStats(album.value.user_id)
      }
    }
  } catch (err) {
    console.error('Error loading album:', err)
    message.value = 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
    messageType.value = 'error'
  } finally {
    loading.value = false
  }
}

onMounted(loadAlbum)

watch(albumId, loadAlbum)

// Get album type label
function getAlbumTypeLabel(type) {
  return albumTypes.find(t => t.value === type)?.label || 'ทั่วไป'
}

// Format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Handle file upload
async function handleFileUpload(event) {
  const files = event.target.files
  if (!files || files.length === 0) return

  // Block upload if quota exceeded (Requirement 6.2)
  if (isQuotaExceeded.value) {
    message.value = 'พื้นที่เก็บข้อมูลเต็ม กรุณาลบไฟล์เก่าก่อน'
    messageType.value = 'error'
    setTimeout(() => message.value = '', 5000)
    event.target.value = ''
    return
  }

  uploading.value = true
  let successCount = 0
  let errorMessages = []

  for (const file of files) {
    const result = await data.uploadMedia(albumId.value, file)
    if (result.success) {
      successCount++
    } else {
      errorMessages.push(`${file.name}: ${result.message}`)
    }
  }

  // Refresh media list
  mediaItems.value = await data.fetchAlbumMedia(albumId.value)
  
  // Refresh storage stats after upload (Requirement 6.2)
  if (album.value?.user_id) {
    storageStats.value = await data.getUserStorageStats(album.value.user_id)
  }

  // Show result message
  if (successCount > 0) {
    message.value = `อัปโหลดสำเร็จ ${successCount} ไฟล์`
    messageType.value = 'success'
  }
  if (errorMessages.length > 0) {
    message.value = errorMessages.join(', ')
    messageType.value = 'error'
  }

  setTimeout(() => message.value = '', 5000)
  uploading.value = false
  
  // Reset file input
  event.target.value = ''
}

// Open preview modal
function openPreview(media) {
  previewMedia.value = media
  showPreview.value = true
}

// Open edit modal
function openEditModal() {
  editForm.value = {
    name: album.value.name,
    description: album.value.description || '',
    album_type: album.value.album_type
  }
  showEditModal.value = true
}

// Save album changes
async function saveAlbum() {
  if (!editForm.value.name.trim()) {
    message.value = 'กรุณาระบุชื่ออัลบั้ม'
    messageType.value = 'error'
    setTimeout(() => message.value = '', 3000)
    return
  }

  isSaving.value = true
  try {
    const result = await data.updateAlbum(albumId.value, {
      name: editForm.value.name,
      description: editForm.value.description,
      album_type: editForm.value.album_type
    })

    if (result.success) {
      album.value = result.data
      showEditModal.value = false
      message.value = 'บันทึกสำเร็จ'
      messageType.value = 'success'
    } else {
      message.value = result.message || 'เกิดข้อผิดพลาด'
      messageType.value = 'error'
    }
  } catch (err) {
    message.value = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
    messageType.value = 'error'
  } finally {
    isSaving.value = false
    setTimeout(() => message.value = '', 3000)
  }
}

// Confirm delete
function confirmDelete(target) {
  deleteTarget.value = target
  showDeleteConfirm.value = true
}

// Execute delete
async function executeDelete() {
  if (deleteTarget.value === 'album') {
    // Delete entire album
    const result = await data.deleteAlbum(albumId.value)
    if (result.success) {
      router.push('/profile')
    } else {
      message.value = result.message || 'เกิดข้อผิดพลาดในการลบ'
      messageType.value = 'error'
      setTimeout(() => message.value = '', 3000)
    }
  } else {
    // Delete single media
    const result = await data.deleteMedia(deleteTarget.value)
    if (result.success) {
      mediaItems.value = mediaItems.value.filter(m => m.id !== deleteTarget.value)
      message.value = 'ลบไฟล์สำเร็จ'
      messageType.value = 'success'
      
      // Refresh storage stats after deletion (Requirement 6.2)
      if (album.value?.user_id) {
        storageStats.value = await data.getUserStorageStats(album.value.user_id)
      }
    } else {
      message.value = result.message || 'เกิดข้อผิดพลาดในการลบ'
      messageType.value = 'error'
    }
    setTimeout(() => message.value = '', 3000)
  }
  showDeleteConfirm.value = false
  deleteTarget.value = null
}

// Go back
function goBack() {
  router.push('/profile')
}

// Check if media is image
function isImage(media) {
  return media.file_type?.startsWith('image/')
}
</script>

<template>
  <div class="page">
    <!-- Header -->
    <header class="header">
      <button class="btn-back" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <div class="header-content">
        <h1>{{ album?.name || 'อัลบั้ม' }}</h1>
        <small v-if="album">{{ getAlbumTypeLabel(album.album_type) }}</small>
      </div>
      <button v-if="isOwner" class="btn-menu" @click="openEditModal">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
        </svg>
      </button>
    </header>

    <!-- Message Alert -->
    <div v-if="message" :class="['alert', `alert-${messageType}`]">
      {{ message }}
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <svg class="spinner" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
      </svg>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Album Content -->
    <div v-else-if="album" class="container">
      <!-- Album Description -->
      <p v-if="album.description" class="album-description">{{ album.description }}</p>

      <!-- Storage Quota Warning (Requirement 6.2) -->
      <div v-if="isOwner && isApproachingQuota" class="quota-warning">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div class="quota-warning-content">
          <span>พื้นที่เก็บข้อมูลใกล้เต็ม ({{ storageStats.quotaUsedPercent }}%)</span>
          <small>ใช้ไป {{ formatStorageSize(storageStats.totalSize) }} จาก 100 MB</small>
        </div>
      </div>

      <!-- Storage Quota Exceeded (Requirement 6.2) -->
      <div v-if="isOwner && isQuotaExceeded" class="quota-exceeded">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <div class="quota-exceeded-content">
          <span>พื้นที่เก็บข้อมูลเต็ม</span>
          <small>กรุณาลบไฟล์เก่าก่อนอัปโหลดไฟล์ใหม่</small>
        </div>
      </div>

      <!-- Upload Button (Owner only) -->
      <label v-if="isOwner" class="upload-area" :class="{ uploading, disabled: isQuotaExceeded }">
        <input 
          type="file" 
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          @change="handleFileUpload"
          :disabled="uploading || isQuotaExceeded"
          hidden
        />
        <div v-if="uploading" class="upload-content">
          <svg class="spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          <span>กำลังอัปโหลด...</span>
        </div>
        <div v-else-if="isQuotaExceeded" class="upload-content upload-disabled">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span>ไม่สามารถอัปโหลดได้</span>
          <small>พื้นที่เก็บข้อมูลเต็ม</small>
        </div>
        <div v-else class="upload-content">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span>อัปโหลดรูปภาพหรือเอกสาร</span>
          <small>JPG, PNG, WebP, PDF (ไม่เกิน 10MB)</small>
        </div>
      </label>

      <!-- Media Grid -->
      <div v-if="mediaItems.length > 0" class="media-grid">
        <div 
          v-for="media in mediaItems" 
          :key="media.id" 
          class="media-card"
          @click="openPreview(media)"
        >
          <div class="media-thumbnail">
            <img v-if="isImage(media)" :src="media.thumbnail_url || media.file_url" :alt="media.file_name" />
            <div v-else class="media-file-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span>PDF</span>
            </div>
          </div>
          <div class="media-info">
            <span class="media-name">{{ media.file_name }}</span>
            <span class="media-size">{{ formatFileSize(media.file_size) }}</span>
          </div>
          <button 
            v-if="isOwner" 
            class="media-delete" 
            @click.stop="confirmDelete(media.id)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <p>ยังไม่มีรูปภาพในอัลบั้มนี้</p>
      </div>

      <!-- Delete Album Button (Owner only) -->
      <button v-if="isOwner" class="btn-delete-album" @click="confirmDelete('album')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
        ลบอัลบั้มนี้
      </button>
    </div>

    <!-- Not Found -->
    <div v-else class="not-found">
      <p>ไม่พบอัลบั้ม</p>
      <button class="btn btn-primary" @click="goBack">กลับหน้าโปรไฟล์</button>
    </div>

    <!-- Preview Modal -->
    <Modal :show="showPreview" size="large" @close="showPreview = false">
      <template #header>
        <span>{{ previewMedia?.file_name }}</span>
      </template>
      <template #body>
        <div class="preview-content">
          <img 
            v-if="previewMedia && isImage(previewMedia)" 
            :src="previewMedia.file_url" 
            :alt="previewMedia.file_name"
            class="preview-image"
          />
          <div v-else class="preview-pdf">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p>{{ previewMedia?.file_name }}</p>
            <a :href="previewMedia?.file_url" target="_blank" class="btn btn-primary">
              เปิดไฟล์ PDF
            </a>
          </div>
        </div>
        <div v-if="previewMedia" class="preview-meta">
          <span>ขนาด: {{ formatFileSize(previewMedia.file_size) }}</span>
          <span>อัปโหลด: {{ formatDate(previewMedia.uploaded_at) }}</span>
        </div>
      </template>
    </Modal>

    <!-- Edit Album Modal -->
    <Modal :show="showEditModal" title="แก้ไขอัลบั้ม" @close="showEditModal = false">
      <template #body>
        <div class="form-fields">
          <div class="field">
            <label>ชื่ออัลบั้ม <span class="required">*</span></label>
            <input v-model="editForm.name" type="text" maxlength="100" />
          </div>
          <div class="field">
            <label>ประเภท</label>
            <select v-model="editForm.album_type">
              <option v-for="type in albumTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
          </div>
          <div class="field">
            <label>คำอธิบาย</label>
            <textarea v-model="editForm.description" rows="3"></textarea>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showEditModal = false">ยกเลิก</button>
          <button 
            class="btn btn-primary" 
            :disabled="isSaving || !editForm.name.trim()"
            @click="saveAlbum"
          >
            {{ isSaving ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal :show="showDeleteConfirm" title="ยืนยันการลบ" @close="showDeleteConfirm = false">
      <template #body>
        <p v-if="deleteTarget === 'album'" class="confirm-text">
          คุณต้องการลบอัลบั้มนี้และรูปภาพทั้งหมดในอัลบั้มหรือไม่?
        </p>
        <p v-else class="confirm-text">
          คุณต้องการลบไฟล์นี้หรือไม่?
        </p>
      </template>
      <template #footer>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showDeleteConfirm = false">ยกเลิก</button>
          <button class="btn btn-danger" @click="executeDelete">ลบ</button>
        </div>
      </template>
    </Modal>
  </div>
</template>


<style scoped>
.page {
  min-height: 100vh;
  background: #F5F5F5;
  padding-bottom: 100px;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #fff;
  border-bottom: 1px solid #E5E5E5;
  position: sticky;
  top: 0;
  z-index: 10;
}

.btn-back,
.btn-menu {
  width: 40px;
  height: 40px;
  background: #F5F5F5;
  border: none;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-back:hover,
.btn-menu:hover {
  background: #E5E5E5;
}

.header-content {
  flex: 1;
}

.header-content h1 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.header-content small {
  font-size: 13px;
  color: #737373;
}

/* Alert */
.alert {
  margin: 16px 20px;
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}

.alert-success {
  background: #D1FAE5;
  color: #065F46;
}

.alert-error {
  background: #FEE2E2;
  color: #991B1B;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #737373;
}

.loading-state p {
  margin-top: 12px;
  font-size: 14px;
}

/* Container */
.container {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

/* Album Description */
.album-description {
  font-size: 14px;
  color: #525252;
  margin: 0 0 20px 0;
  line-height: 1.5;
}

/* Upload Area */
.upload-area {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  border: 2px dashed #D4D4D4;
  border-radius: 12px;
  cursor: pointer;
  transition: 0.15s;
  background: #fff;
  margin-bottom: 20px;
}

.upload-area:hover {
  border-color: #171717;
  background: #FAFAFA;
}

.upload-area.uploading {
  border-color: #A3A3A3;
  cursor: wait;
}

.upload-area.disabled {
  border-color: #D4D4D4;
  background: #F5F5F5;
  cursor: not-allowed;
}

.upload-area.disabled:hover {
  border-color: #D4D4D4;
  background: #F5F5F5;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #525252;
  text-align: center;
}

.upload-content span {
  font-size: 14px;
  font-weight: 500;
}

.upload-content small {
  font-size: 12px;
  color: #A3A3A3;
}

.upload-content.upload-disabled {
  color: #A3A3A3;
}

.upload-content.upload-disabled svg {
  color: #D4D4D4;
}

/* Quota Warning (Requirement 6.2) */
.quota-warning {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: #FEF3C7;
  border: 1px solid #F59E0B;
  border-radius: 12px;
  margin-bottom: 16px;
}

.quota-warning svg {
  color: #D97706;
  flex-shrink: 0;
  margin-top: 2px;
}

.quota-warning-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.quota-warning-content span {
  font-size: 14px;
  font-weight: 500;
  color: #92400E;
}

.quota-warning-content small {
  font-size: 12px;
  color: #B45309;
}

/* Quota Exceeded (Requirement 6.2) */
.quota-exceeded {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: #FEE2E2;
  border: 1px solid #EF4444;
  border-radius: 12px;
  margin-bottom: 16px;
}

.quota-exceeded svg {
  color: #DC2626;
  flex-shrink: 0;
  margin-top: 2px;
}

.quota-exceeded-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.quota-exceeded-content span {
  font-size: 14px;
  font-weight: 500;
  color: #991B1B;
}

.quota-exceeded-content small {
  font-size: 12px;
  color: #B91C1C;
}

/* Media Grid */
.media-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.media-card {
  position: relative;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s;
}

.media-card:hover {
  transform: scale(1.02);
}

.media-thumbnail {
  aspect-ratio: 1;
  background: #E5E5E5;
  overflow: hidden;
}

.media-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-file-icon {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #737373;
  gap: 4px;
}

.media-file-icon span {
  font-size: 11px;
  font-weight: 600;
}

.media-info {
  padding: 8px;
}

.media-name {
  display: block;
  font-size: 11px;
  color: #404040;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-size {
  font-size: 10px;
  color: #A3A3A3;
}

.media-delete {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
  color: #fff;
}

.media-card:hover .media-delete {
  opacity: 1;
}

.media-delete:hover {
  background: #EF4444;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #737373;
  text-align: center;
}

.empty-state svg {
  color: #D4D4D4;
  margin-bottom: 12px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* Delete Album Button */
.btn-delete-album {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  margin-top: 40px;
  background: none;
  border: 1.5px solid #EF4444;
  border-radius: 12px;
  color: #EF4444;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-delete-album:hover {
  background: #EF4444;
  color: #fff;
}

/* Not Found */
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #737373;
}

.not-found p {
  margin: 0 0 16px 0;
  font-size: 14px;
}

/* Preview Content */
.preview-content {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.preview-image {
  max-width: 100%;
  max-height: 60vh;
  border-radius: 8px;
}

.preview-pdf {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  color: #737373;
}

.preview-pdf p {
  margin: 0;
  font-size: 14px;
  word-break: break-all;
  text-align: center;
}

.preview-meta {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #E5E5E5;
  font-size: 13px;
  color: #737373;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: 0.15s;
  text-decoration: none;
}

.btn-primary {
  background: #171717;
  color: #fff;
}

.btn-primary:hover {
  background: #262626;
}

.btn-primary:disabled {
  background: #D4D4D4;
  cursor: not-allowed;
}

.btn-secondary {
  background: #fff;
  color: #404040;
  border: 1px solid #E5E5E5;
}

.btn-secondary:hover {
  background: #F5F5F5;
}

.btn-danger {
  background: #EF4444;
  color: #fff;
}

.btn-danger:hover {
  background: #DC2626;
}

/* Form Fields */
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field label {
  font-size: 14px;
  font-weight: 500;
  color: #404040;
}

.field .required {
  color: #DC2626;
}

.field input,
.field select,
.field textarea {
  padding: 12px 16px;
  border: 1.5px solid #E5E5E5;
  border-radius: 10px;
  font-size: 15px;
  font-family: inherit;
  background: #fff;
  width: 100%;
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  outline: none;
  border-color: #171717;
}

.field select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 40px;
}

.field textarea {
  resize: vertical;
  min-height: 80px;
}

/* Modal Actions */
.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.modal-actions .btn {
  flex: 1;
}

/* Confirm Text */
.confirm-text {
  font-size: 14px;
  color: #404040;
  text-align: center;
  margin: 0;
}

/* Spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}

/* Responsive */
@media (min-width: 480px) {
  .media-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
