<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import Modal from '@/components/Modal.vue'

const props = defineProps({
  userId: { type: String, required: true },
  readOnly: { type: Boolean, default: false }
})

const router = useRouter()
const auth = useAuthStore()
const data = useDataStore()

const showCreateModal = ref(false)
const isCreating = ref(false)
const message = ref('')
const messageType = ref('success')

// Form data for new album
const newAlbum = ref({
  name: '',
  description: '',
  album_type: 'general'
})

const albumTypes = [
  { value: 'general', label: 'ทั่วไป' },
  { value: 'competition', label: 'การแข่งขัน' },
  { value: 'training', label: 'ฝึกซ้อม' },
  { value: 'documents', label: 'เอกสาร' }
]

// Computed: albums for this user
const albums = computed(() => {
  return data.userAlbums.filter(a => a.user_id === props.userId)
})

// Load albums on mount
onMounted(async () => {
  await data.fetchUserAlbums(props.userId)
})

// Get album type label
function getAlbumTypeLabel(type) {
  return albumTypes.find(t => t.value === type)?.label || 'ทั่วไป'
}

// Get media count for album (from albumMedia state)
function getMediaCount(albumId) {
  return data.albumMedia.filter(m => m.album_id === albumId).length
}

// Open create modal
function openCreateModal() {
  newAlbum.value = { name: '', description: '', album_type: 'general' }
  showCreateModal.value = true
}

// Create new album
async function createAlbum() {
  if (!newAlbum.value.name.trim()) {
    message.value = 'กรุณาระบุชื่ออัลบั้ม'
    messageType.value = 'error'
    setTimeout(() => message.value = '', 3000)
    return
  }

  isCreating.value = true
  try {
    const result = await data.createAlbum({
      user_id: props.userId,
      name: newAlbum.value.name,
      description: newAlbum.value.description,
      album_type: newAlbum.value.album_type
    })

    if (result.success) {
      showCreateModal.value = false
      message.value = 'สร้างอัลบั้มสำเร็จ'
      messageType.value = 'success'
      setTimeout(() => message.value = '', 3000)
    } else {
      message.value = result.message || 'เกิดข้อผิดพลาด'
      messageType.value = 'error'
      setTimeout(() => message.value = '', 3000)
    }
  } catch (err) {
    message.value = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
    messageType.value = 'error'
    setTimeout(() => message.value = '', 3000)
  } finally {
    isCreating.value = false
  }
}

// Navigate to album detail
function openAlbum(albumId) {
  router.push(`/profile/albums/${albumId}`)
}
</script>

<template>
  <div class="album-section">
    <div class="section-header">
      <div class="section-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </div>
      <span class="section-title">อัลบั้มรูปภาพ</span>
      <button v-if="!readOnly" class="btn-add" @click="openCreateModal">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>

    <!-- Message Alert -->
    <div v-if="message" :class="['alert', `alert-${messageType}`]">
      {{ message }}
    </div>

    <!-- Albums Grid -->
    <div v-if="albums.length > 0" class="albums-grid">
      <div 
        v-for="album in albums" 
        :key="album.id" 
        class="album-card"
        @click="openAlbum(album.id)"
      >
        <div class="album-cover">
          <img v-if="album.cover_image_url" :src="album.cover_image_url" :alt="album.name" />
          <div v-else class="album-cover-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        </div>
        <div class="album-info">
          <h4 class="album-name">{{ album.name }}</h4>
          <div class="album-meta">
            <span class="album-type">{{ getAlbumTypeLabel(album.album_type) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      <p>ยังไม่มีอัลบั้ม</p>
      <button v-if="!readOnly" class="btn btn-primary" @click="openCreateModal">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        สร้างอัลบั้มแรก
      </button>
    </div>

    <!-- Create Album Modal -->
    <Modal :show="showCreateModal" title="สร้างอัลบั้มใหม่" @close="showCreateModal = false">
      <template #body>
        <div class="form-fields">
          <div class="field">
            <label>ชื่ออัลบั้ม <span class="required">*</span></label>
            <input 
              v-model="newAlbum.name" 
              type="text" 
              placeholder="เช่น รูปแข่งขัน 2024"
              maxlength="100"
            />
          </div>
          <div class="field">
            <label>ประเภท</label>
            <select v-model="newAlbum.album_type">
              <option v-for="type in albumTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
          </div>
          <div class="field">
            <label>คำอธิบาย</label>
            <textarea 
              v-model="newAlbum.description" 
              rows="3" 
              placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
            ></textarea>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showCreateModal = false">ยกเลิก</button>
          <button 
            class="btn btn-primary" 
            :disabled="isCreating || !newAlbum.name.trim()"
            @click="createAlbum"
          >
            <svg v-if="isCreating" class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
            </svg>
            {{ isCreating ? 'กำลังสร้าง...' : 'สร้างอัลบั้ม' }}
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>


<style scoped>
.album-section {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #E5E5E5;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #F5F5F5;
}

.section-icon {
  width: 36px;
  height: 36px;
  background: #171717;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-icon svg {
  width: 18px;
  height: 18px;
  color: #fff;
}

.section-title {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: #171717;
}

.btn-add {
  width: 36px;
  height: 36px;
  background: #F5F5F5;
  border: none;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-add:hover {
  background: #E5E5E5;
}

.btn-add svg {
  color: #525252;
}

/* Alert */
.alert {
  margin: 12px 16px;
  padding: 12px 16px;
  border-radius: 10px;
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

/* Albums Grid */
.albums-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 16px;
}

.album-card {
  background: #FAFAFA;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.album-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.album-card:active {
  transform: translateY(0);
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

.album-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #A3A3A3;
}

.album-info {
  padding: 12px;
}

.album-name {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.album-type {
  font-size: 12px;
  color: #737373;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #737373;
  text-align: center;
}

.empty-state svg {
  margin-bottom: 12px;
  color: #D4D4D4;
}

.empty-state p {
  margin: 0 0 16px 0;
  font-size: 14px;
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

/* Spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}

/* Responsive */
@media (min-width: 480px) {
  .albums-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
