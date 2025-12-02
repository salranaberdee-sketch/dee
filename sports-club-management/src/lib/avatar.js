/**
 * Avatar Utility Functions
 * Handles profile picture validation, upload, deletion, and fallback display
 * 
 * Requirements: 1.2, 1.3, 1.4, 4.2
 */

import { supabase } from './supabase'

// Constants for file validation
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB in bytes (2,097,152)
const STORAGE_BUCKET = 'profile-pictures'

/**
 * Validate avatar file type and size
 * Implements Requirements 1.2 (file type) and 1.3 (file size)
 * 
 * @param {File} file - The file to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validateAvatarFile(file) {
  if (!file) {
    return { valid: false, error: 'No file provided' }
  }

  // Validate file type (Requirement 1.2)
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Invalid file type. Only JPG, PNG, and WebP are allowed.' 
    }
  }

  // Validate file size (Requirement 1.3)
  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: 'File size exceeds 2MB limit.' 
    }
  }

  return { valid: true }
}

/**
 * Get file extension from MIME type
 * @param {string} mimeType - The MIME type
 * @returns {string} File extension
 */
function getExtensionFromMimeType(mimeType) {
  const extensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  }
  return extensions[mimeType] || 'jpg'
}

/**
 * Upload avatar to Supabase Storage
 * Implements Requirement 1.4 - store image in profile-pictures bucket
 * Path format: {user_id}/avatar_{timestamp}.{ext}
 * 
 * @param {string} userId - The user's ID
 * @param {File} file - The image file to upload
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export async function uploadAvatar(userId, file) {
  // Validate file first
  const validation = validateAvatarFile(file)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  try {
    // Generate storage path: {user_id}/avatar_{timestamp}.{ext}
    const timestamp = Date.now()
    const extension = getExtensionFromMimeType(file.type)
    const filePath = `${userId}/avatar_${timestamp}.${extension}`

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError)
      return { success: false, error: uploadError.message || 'Failed to upload avatar' }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath)

    return { 
      success: true, 
      url: urlData.publicUrl,
      path: filePath
    }
  } catch (error) {
    console.error('Error in uploadAvatar:', error)
    return { success: false, error: error.message || 'Failed to upload avatar' }
  }
}

/**
 * Delete avatar from Supabase Storage
 * Implements Requirement 4.2 - delete image from storage bucket
 * 
 * @param {string} userId - The user's ID
 * @param {string} currentUrl - The current avatar URL to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteAvatar(userId, currentUrl) {
  if (!currentUrl) {
    return { success: true } // Nothing to delete
  }

  try {
    // Extract file path from URL
    // URL format: https://{project}.supabase.co/storage/v1/object/public/profile-pictures/{user_id}/avatar_{timestamp}.{ext}
    const urlParts = currentUrl.split(`/storage/v1/object/public/${STORAGE_BUCKET}/`)
    
    if (urlParts.length < 2) {
      // URL doesn't match expected format, might be from album or external
      // Just return success as we can't delete it from profile-pictures bucket
      return { success: true }
    }

    const filePath = urlParts[1]

    // Verify the file belongs to this user (security check)
    if (!filePath.startsWith(`${userId}/`)) {
      return { success: false, error: 'Cannot delete avatar belonging to another user' }
    }

    // Delete from Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath])

    if (deleteError) {
      console.error('Error deleting avatar:', deleteError)
      // Log error but don't fail - the avatar_url will still be cleared
      return { success: true, warning: 'File may not have been deleted from storage' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in deleteAvatar:', error)
    // Return success anyway - we want to allow clearing avatar_url even if storage delete fails
    return { success: true, warning: error.message }
  }
}

/**
 * Get fallback character for avatar display
 * Implements Requirement 3.3 - display first character of user name as fallback
 * 
 * @param {string} name - The user's name
 * @returns {string} First character of name (uppercase) or '?' if no name
 */
export function getAvatarFallback(name) {
  if (!name || typeof name !== 'string') {
    return '?'
  }

  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return '?'
  }

  // Get first character and convert to uppercase
  return trimmed.charAt(0).toUpperCase()
}

// Export constants for testing
export const AVATAR_CONSTANTS = {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  STORAGE_BUCKET
}
