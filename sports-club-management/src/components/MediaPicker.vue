<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import Modal from '@/components/Modal.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  userId: { type: String, default: null },
  albumType: { type: String, default: null }, // Filter by album type
  multiple: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'select'])

const auth = useAuthStore()
const data = useDataStore()

const loading = ref(true)
const selectedAlbum = ref(null)
const selectedMedia = ref([])
const filterType = ref(props.albumType || 'all')

const albumTypes = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'general', label: 'ทั่วไป' },
  { value: 'competition', label: 'การแข่งขัน' },
  { value: 'training', label: 'ฝึกซ้อม' },
  { value: 'documents', label: 'เอกสาร' }
]

// Get user ID (props or current user)
const targetUserId = computed(() => props.userId || auth.user?.id)

// Filtered albums based on type
const filteredAlbums = computed(() => {
  let albums = data.userAlbums.filter(a => a.user_id === targetUserId.value)
  if (filterType.value && filterType.value !== 'all') {
    albums = albums.filter(a => a.album_type === filterType.value)
  }
  return albums
})

// Media items for selected album
const mediaItems = computed(() => {
  if (!selectedAlbum.value) return []
  return data.albumMedia.filter(m => m.album_id === selectedAlbum.value.id)
})

// Load data
async function loadData() {
  loading.value = true
  try {
    await data.fetchUserAlbums(targetUserId.value)
  } catch (err) {
    console.error('Error loading albums:', err)
  } finally {
    loading.value = false
  }
}

// Watch for show prop changes
watch(() => props.show, (newVal) => {
  if (newVal) {
    loadData()
    selectedAlbum.value = null
    selectedMedia.value = []
    filterType.value = props.albumType || 'all'
  }
})

// Watch for albumType prop changes
watch(() => props.albumType, (newVal) => {
  filterType.value = newVal || 'all'
})

onMounted(() => {
  if (props.show) {
    loadData()
  }
})

// Select album and load its media
async function selectAlbum(album) {
  selectedAlbum.value = album
  await data.fetchAlbumMedia(album.id)
}

// Go back to album list
function backToAlbums() {
  selectedAlbum.value = null
  selectedMedia.value = []
}

// Toggle media selection
function toggleMedia(media) {
  if (props.multiple) {
    const idx = selectedMedia.value.findIndex(m => m.id === media.id)
    if (idx >= 0) {
      selectedMedia.value.splice(idx, 1)
    } else {
      selectedMedia.value.push(media)
    }
  } else {
    selectedMedia.value = [media]
  }
}

// Check if media is selected
function isSelected(media) {
  return selectedMedia.value.some(m => m.id === media.id)
}

// Confirm selection
function confirmSelection() {
  if (selectedMedia.value.length === 0) return
  
  if (props.multiple) {
    emit('select', selectedMedia.value.map(m => m.file_url))
  } else {
    emit('select', selectedMedia.value[0].file_url)
  }
  emit('close')
}

// Close modal
function closeModal() {
  emit('close')
}

// Get album type label
function getAlbumTypeLabel(type) {
  return albumTypes.find(t => t.value === type)?.label || 'ทั่วไป'
}

// Check if media is image
function isImage(media) {
  return media.file_type?.startsWith('image/')
}
</script>

<template>
  <Modal :show="show" size="large" @close="closeModal">
    <template #header>
      <div class="picker-header">
        <button v-if="selectedAlbum" class="btn-back" @click="backToAlbums">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span>{{ selectedAlbum ? selectedAlbum.name : 'เลือกรูปภาพ' }}</span>
      </div>
    </template>

    <template #body>
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <svg class="spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
        </svg>
        <span>กำลังโหลด...</span>
      </div>

      <!-- Album List View -->
      <div v-else-if="!selectedAlbum" class="album-view">
        <!-- Filter -->
        <div class="filter-bar">
          <select v-model="filterType" class="filter-select">
            <option v-for="type in albumTypes" :key="type.value" :value="type.value">
              {{ type.label }}
            </option>
          </select>
        </div>

        <!-- Albums Grid -->
        <div v-if="filteredAlbums.length > 0" class="albums-grid">
          <div 
            v-for="album in filteredAlbums" 
            :key="album.id" 
            class="album-item"
            @click="selectAlbum(album)"
          >
            <div class="album-cover">
              <img v-if="album.cover_image_url" :src="album.cover_image_url" :alt="album.name" />
              <div v-else class="album-placeholder">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
            </div>
            <div class="album-info">
              <span class="album-name">{{ album.name }}</span>
              <span class="album-type">{{ getAlbumTypeLabel(album.album_type) }}</span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <p>ไม่พบอัลบั้ม</p>
        </div>
      </div>

      <!-- Media List View -->
      <div v-else class="media-view">
        <div v-if="mediaItems.length > 0" class="media-grid">
          <div 
            v-for="media in mediaItems" 
            :key="media.id" 
            :class="['media-item', { selected: isSelected(media) }]"
            @click="toggleMedia(media)"
          >
            <div class="media-thumbnail">
              <img v-if="isImage(media)" :src="media.thumbnail_url || media.file_url" :alt="media.file_name" />
              <div v-else class="media-file-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
            </div>
            <div v-if="isSelected(media)" class="selected-indicator">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <p>ไม่มีรูปภาพในอัลบั้มนี้</p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="picker-footer">
        <span v-if="selectedMedia.length > 0" class="selection-count">
          เลือก {{ selectedMedia.length }} รายการ
        </span>
        <div class="footer-actions">
          <button class="btn btn-secondary" @click="closeModal">ยกเลิก</button>
          <button 
            class="btn btn-primary" 
            :disabled="selectedMedia.length === 0"
            @click="confirmSelection"
          >
            เลือก
          </button>
        </div>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
/* Picker Header */
.picker-header {
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

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #737373;
  gap: 12px;
}

/* Filter Bar */
.filter-bar {
  margin-bottom: 16px;
}

.filter-select {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid #E5E5E5;
  border-radius: 10px;
  font-size: 14px;
  background: #fff;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 40px;
}

.filter-select:focus {
  outline: none;
  border-color: #171717;
}

/* Albums Grid */
.albums-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.album-item {
  background: #FAFAFA;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s;
}

.album-item:hover {
  transform: scale(1.02);
}

.album-cover {
  aspect-ratio: 1;
  background: #E5E5E5;
  overflow: hidden;
}

.album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.album-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #A3A3A3;
}

.album-info {
  padding: 10px;
}

.album-name {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #171717;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-type {
  font-size: 11px;
  color: #737373;
}

/* Media Grid */
.media-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.media-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s;
}

.media-item:hover {
  transform: scale(1.02);
}

.media-item.selected {
  outline: 3px solid #171717;
  outline-offset: -3px;
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
  align-items: center;
  justify-content: center;
  color: #737373;
}

.selected-indicator {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  background: #171717;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #737373;
  text-align: center;
}

.empty-state svg {
  color: #D4D4D4;
  margin-bottom: 8px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* Picker Footer */
.picker-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.selection-count {
  font-size: 13px;
  color: #525252;
}

.footer-actions {
  display: flex;
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

/* Spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}
</style>
