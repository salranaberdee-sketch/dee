import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { unsubscribeFromPush, isPushSupported } from '@/lib/pushNotification'
import { deleteAvatar } from '@/lib/avatar'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)
  const loading = ref(true)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => profile.value?.role === 'admin')
  const isCoach = computed(() => profile.value?.role === 'coach')
  const isAthlete = computed(() => profile.value?.role === 'athlete')

  // Initialize auth state
  async function init() {
    loading.value = true
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        user.value = session.user
        await fetchProfile()
      }
    } catch (error) {
      console.error('Auth init error:', error)
    } finally {
      loading.value = false
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      user.value = session?.user || null
      if (session?.user) {
        await fetchProfile()
      } else {
        profile.value = null
      }
    })
  }

  async function fetchProfile() {
    if (!user.value) return
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.value.id)
      .single()
    
    if (!error && data) {
      profile.value = data
    }
  }

  async function login(credentials) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      })
      
      if (error) {
        return { success: false, message: error.message }
      }
      
      user.value = data.user
      await fetchProfile()
      return { success: true }
    } catch (error) {
      return { success: false, message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' }
    }
  }

  async function register(userData) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password
      })
      
      if (error) {
        return { success: false, message: error.message }
      }

      // Create user profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            email: userData.email,
            name: userData.name,
            role: userData.role || 'athlete',
            phone: userData.phone,
            club_id: userData.clubId
          })
        
        if (profileError) {
          console.error('Profile creation error:', profileError)
        }
      }
      
      return { success: true, message: 'ลงทะเบียนสำเร็จ กรุณายืนยันอีเมล' }
    } catch (error) {
      return { success: false, message: 'เกิดข้อผิดพลาดในการลงทะเบียน' }
    }
  }

  async function logout() {
    // Remove push subscription for this device before logout (Requirement 4.2)
    if (user.value && isPushSupported()) {
      try {
        await unsubscribeFromPush(user.value.id)
      } catch (error) {
        console.error('Error removing push subscription on logout:', error)
        // Continue with logout even if unsubscribe fails
      }
    }
    
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
  }

  async function updateProfile(data) {
    if (!user.value) return { success: false }
    
    const { error } = await supabase
      .from('user_profiles')
      .update(data)
      .eq('id', user.value.id)
    
    if (!error) {
      profile.value = { ...profile.value, ...data }
      return { success: true }
    }
    return { success: false, message: error.message }
  }

  /**
   * Update avatar URL in user profile
   * Implements Requirement 1.5 - update avatar_url field in User_Profile
   * 
   * @param {string|null} avatarUrl - The new avatar URL or null to clear
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async function updateAvatar(avatarUrl) {
    if (!user.value) {
      return { success: false, message: 'User not authenticated' }
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.value.id)

      if (error) {
        console.error('Error updating avatar:', error)
        return { success: false, message: error.message || 'Failed to update avatar' }
      }

      // Update local profile state
      profile.value = { ...profile.value, avatar_url: avatarUrl }
      return { success: true }
    } catch (error) {
      console.error('Error in updateAvatar:', error)
      return { success: false, message: error.message || 'Failed to update avatar' }
    }
  }

  /**
   * Remove avatar - delete file from storage and set avatar_url to null
   * Implements Requirements 4.2 (delete from storage) and 4.3 (set avatar_url to null)
   * 
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async function removeAvatar() {
    if (!user.value) {
      return { success: false, message: 'User not authenticated' }
    }

    const currentAvatarUrl = profile.value?.avatar_url

    try {
      // Delete file from storage if exists (Requirement 4.2)
      if (currentAvatarUrl) {
        const deleteResult = await deleteAvatar(user.value.id, currentAvatarUrl)
        if (!deleteResult.success && !deleteResult.warning) {
          // Only fail if there's a real error, not just a warning
          return { success: false, message: deleteResult.error || 'Failed to delete avatar file' }
        }
      }

      // Set avatar_url to null in database (Requirement 4.3)
      const { error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: null })
        .eq('id', user.value.id)

      if (error) {
        console.error('Error removing avatar from profile:', error)
        return { success: false, message: error.message || 'Failed to remove avatar' }
      }

      // Update local profile state
      profile.value = { ...profile.value, avatar_url: null }
      return { success: true }
    } catch (error) {
      console.error('Error in removeAvatar:', error)
      return { success: false, message: error.message || 'Failed to remove avatar' }
    }
  }

  /**
   * Admin function to remove another user's avatar
   * Implements Requirement 6.2 - admin can remove user's profile picture
   * 
   * @param {string} targetUserId - The user ID whose avatar should be removed
   * @param {string} currentAvatarUrl - The current avatar URL to delete from storage
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async function adminRemoveUserAvatar(targetUserId, currentAvatarUrl) {
    if (!user.value) {
      return { success: false, message: 'User not authenticated' }
    }

    // Verify current user is admin
    if (profile.value?.role !== 'admin') {
      return { success: false, message: 'Only admins can remove other users\' avatars' }
    }

    if (!targetUserId) {
      return { success: false, message: 'Target user ID is required' }
    }

    try {
      // Delete file from storage if exists
      if (currentAvatarUrl) {
        // Extract file path and delete from storage
        const STORAGE_BUCKET = 'profile-pictures'
        const urlParts = currentAvatarUrl.split(`/storage/v1/object/public/${STORAGE_BUCKET}/`)
        
        if (urlParts.length >= 2) {
          const filePath = urlParts[1]
          // Admin can delete any user's avatar
          const { error: deleteError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .remove([filePath])
          
          if (deleteError) {
            console.warn('Warning: Could not delete avatar file from storage:', deleteError)
            // Continue anyway - we still want to clear the avatar_url
          }
        }
      }

      // Set avatar_url to null in database
      const { error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: null })
        .eq('id', targetUserId)

      if (error) {
        console.error('Error removing avatar from profile:', error)
        return { success: false, message: error.message || 'Failed to remove avatar' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in adminRemoveUserAvatar:', error)
      return { success: false, message: error.message || 'Failed to remove avatar' }
    }
  }

  return { 
    user, 
    profile, 
    loading,
    isAuthenticated, 
    isAdmin, 
    isCoach, 
    isAthlete, 
    init,
    login, 
    register,
    logout, 
    updateProfile,
    fetchProfile,
    updateAvatar,
    removeAvatar,
    adminRemoveUserAvatar
  }
})
