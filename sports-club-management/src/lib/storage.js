/**
 * Storage Utilities
 * Helper functions สำหรับ Supabase Storage พร้อม Image Transformations
 * ตาม supabase-best-practices.md
 */

import { supabase } from './supabase'

// ============ CONSTANTS ============

// ค่า cache-control ตามประเภทไฟล์
const CACHE_SETTINGS = {
  images: '86400',      // 24 ชั่วโมง
  videos: '604800',     // 7 วัน
  documents: '3600',    // 1 ชั่วโมง
  avatars: '43200'      // 12 ชั่วโมง
}

// ขนาดรูปภาพมาตรฐาน
const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150 },
  small: { width: 300, height: 300 },
  medium: { width: 600, height: 600 },
  large: { width: 1200, height: 1200 }
}

// ============ UPLOAD FUNCTIONS ============

/**
 * อัพโหลดรูปภาพพร้อมตั้งค่า cache-control
 * @param {string} bucket - ชื่อ bucket
 * @param {string} path - path ของไฟล์
 * @param {File} file - ไฟล์ที่จะอัพโหลด
 * @param {Object} options - ตัวเลือกเพิ่มเติม
 * @returns {Promise<{success: boolean, path?: string, error?: string}>}
 */
export async function uploadImage(bucket, path, file, options = {}) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: options.cacheControl || CACHE_SETTINGS.images,
        upsert: options.upsert || false,
        contentType: file.type
      })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, path: data.path }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * อัพโหลด avatar พร้อมตั้งค่า cache-control
 * @param {string} userId - รหัสผู้ใช้
 * @param {File} file - ไฟล์รูปภาพ
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export async function uploadAvatar(userId, file) {
  const path = `${userId}/avatar.${file.name.split('.').pop()}`
  
  const result = await uploadImage('profile-pictures', path, file, {
    cacheControl: CACHE_SETTINGS.avatars,
    upsert: true
  })

  if (!result.success) {
    return result
  }

  // ดึง public URL พร้อม transformation
  const url = getTransformedUrl('profile-pictures', result.path, 'small')
  return { success: true, url }
}

/**
 * อัพโหลดไฟล์ลงอัลบั้ม
 * @param {string} userId - รหัสผู้ใช้
 * @param {string} albumId - รหัสอัลบั้ม
 * @param {File} file - ไฟล์ที่จะอัพโหลด
 * @returns {Promise<{success: boolean, path?: string, error?: string}>}
 */
export async function uploadAlbumMedia(userId, albumId, file) {
  const timestamp = Date.now()
  const ext = file.name.split('.').pop()
  const path = `${userId}/${albumId}/${timestamp}.${ext}`
  
  // กำหนด cache-control ตามประเภทไฟล์
  const isVideo = file.type.startsWith('video/')
  const cacheControl = isVideo ? CACHE_SETTINGS.videos : CACHE_SETTINGS.images

  return await uploadImage('albums', path, file, { cacheControl })
}

// ============ URL FUNCTIONS ============

/**
 * ดึง URL รูปภาพพร้อม transformation
 * @param {string} bucket - ชื่อ bucket
 * @param {string} path - path ของไฟล์
 * @param {string} size - ขนาดที่ต้องการ (thumbnail, small, medium, large)
 * @param {Object} customOptions - ตัวเลือก transformation เพิ่มเติม
 * @returns {string} - URL ของรูปภาพ
 */
export function getTransformedUrl(bucket, path, size = 'medium', customOptions = {}) {
  const sizeConfig = IMAGE_SIZES[size] || IMAGE_SIZES.medium
  
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path, {
      transform: {
        width: customOptions.width || sizeConfig.width,
        height: customOptions.height || sizeConfig.height,
        resize: customOptions.resize || 'cover',
        quality: customOptions.quality || 80,
        ...customOptions
      }
    })

  return data.publicUrl
}

/**
 * ดึง URL thumbnail ของรูปภาพ
 * @param {string} bucket - ชื่อ bucket
 * @param {string} path - path ของไฟล์
 * @returns {string} - URL ของ thumbnail
 */
export function getThumbnailUrl(bucket, path) {
  return getTransformedUrl(bucket, path, 'thumbnail')
}

/**
 * ดึง URL รูปภาพขนาดเต็ม (ไม่มี transformation)
 * @param {string} bucket - ชื่อ bucket
 * @param {string} path - path ของไฟล์
 * @returns {string} - URL ของรูปภาพ
 */
export function getOriginalUrl(bucket, path) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

/**
 * ดึง URL avatar พร้อม transformation
 * @param {string} avatarUrl - URL หรือ path ของ avatar
 * @param {string} size - ขนาดที่ต้องการ
 * @returns {string} - URL ของ avatar
 */
export function getAvatarUrl(avatarUrl, size = 'small') {
  if (!avatarUrl) return null
  
  // ถ้าเป็น full URL อยู่แล้ว ให้ return เลย
  if (avatarUrl.startsWith('http')) {
    return avatarUrl
  }
  
  return getTransformedUrl('profile-pictures', avatarUrl, size)
}

// ============ DELETE FUNCTIONS ============

/**
 * ลบไฟล์จาก storage
 * @param {string} bucket - ชื่อ bucket
 * @param {string[]} paths - รายการ path ที่จะลบ
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteFiles(bucket, paths) {
  try {
    const { error } = await supabase.storage.from(bucket).remove(paths)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// ============ LIST FUNCTIONS ============

/**
 * ดึงรายการไฟล์ใน folder
 * @param {string} bucket - ชื่อ bucket
 * @param {string} path - path ของ folder
 * @param {Object} options - ตัวเลือก (limit, offset)
 * @returns {Promise<{success: boolean, files?: Array, error?: string}>}
 */
export async function listFiles(bucket, path, options = {}) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path, {
        limit: options.limit || 100,
        offset: options.offset || 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, files: data || [] }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// ============ EXPORTS ============

export {
  CACHE_SETTINGS,
  IMAGE_SIZES
}
