import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { unsubscribeFromPush, isPushSupported } from '@/lib/pushNotification'

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
    fetchProfile
  }
})
