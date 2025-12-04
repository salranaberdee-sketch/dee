import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

/**
 * แปลงขนาดไฟล์เป็นรูปแบบที่อ่านง่าย (B, KB, MB, GB)
 * Property 11: Storage size formatting is correct
 * @param {number} bytes - ขนาดไฟล์ในหน่วย bytes
 * @returns {string} - ขนาดไฟล์ในรูปแบบที่อ่านง่าย
 */
export function formatStorageSize(bytes) {
  // จัดการกรณี edge cases
  if (bytes === null || bytes === undefined || isNaN(bytes)) {
    return '0 B'
  }
  
  // แปลงเป็นตัวเลข
  const numBytes = Number(bytes)
  
  // จัดการกรณีค่าติดลบหรือ 0
  if (numBytes <= 0) {
    return '0 B'
  }
  
  // หน่วยและขนาด
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  
  // หาหน่วยที่เหมาะสม
  const i = Math.min(Math.floor(Math.log(numBytes) / Math.log(k)), units.length - 1)
  
  // คำนวณค่าในหน่วยที่เลือก
  const value = numBytes / Math.pow(k, i)
  
  // จัดรูปแบบตัวเลข (ทศนิยม 2 ตำแหน่งถ้าไม่ใช่จำนวนเต็ม)
  const formatted = value % 1 === 0 ? value.toString() : value.toFixed(2)
  
  return `${formatted} ${units[i]}`
}

export const useAlbumManagementStore = defineStore('albumManagement', () => {
  // ============ STATE ============
  // รายการชมรม (สำหรับ Admin)
  const clubs = ref([])
  
  // รายการนักกีฬา
  const athletes = ref([])
  
  // ชมรมที่เลือก (สำหรับ Admin)
  const selectedClub = ref(null)
  
  // นักกีฬาที่เลือก
  const selectedAthlete = ref(null)
  
  // คำค้นหา
  const searchQuery = ref('')
  
  // สถานะการโหลด
  const loading = ref(false)
  
  // ข้อผิดพลาด
  const error = ref(null)

  // ============ GETTERS ============
  
  /**
   * กรองนักกีฬาตามคำค้นหา
   * Property 4: Search filter returns only matching athletes
   */
  const filteredAthletes = computed(() => {
    if (!searchQuery.value || searchQuery.value.trim() === '') {
      return athletes.value
    }
    
    const query = searchQuery.value.toLowerCase().trim()
    // รองรับทั้ง full_name และ name field
    return athletes.value.filter(athlete => {
      const athleteName = athlete.full_name || athlete.name || ''
      return athleteName.toLowerCase().includes(query)
    })
  })

  // ============ ACTIONS ============

  /**
   * ดึงรายการนักกีฬาในชมรมของโค้ช
   * Property 1: Coach sees only athletes from their club
   * Requirements: 1.1, 1.4, 6.1, 6.2, 6.3
   */
  async function fetchAthletesInMyClub() {
    const authStore = useAuthStore()
    
    if (!authStore.profile?.club_id) {
      error.value = 'ไม่พบข้อมูลชมรม'
      return []
    }

    loading.value = true
    error.value = null

    try {
      // ดึงนักกีฬาในชมรมเดียวกับโค้ช พร้อมสถิติอัลบั้ม
      const { data, error: err } = await supabase
        .from('user_profiles')
        .select(`
          id,
          name,
          avatar_url,
          club_id
        `)
        .eq('club_id', authStore.profile.club_id)
        .eq('role', 'athlete')
        .order('name', { ascending: true })

      if (err) throw err

      // ดึงสถิติอัลบั้มสำหรับแต่ละนักกีฬา และแปลง name เป็น full_name สำหรับ UI
      const athletesWithStats = await Promise.all(
        (data || []).map(async (athlete) => {
          const stats = await getAthleteStats(athlete.id)
          return { 
            ...athlete, 
            full_name: athlete.name, // แปลงชื่อ field สำหรับ UI
            ...stats 
          }
        })
      )

      athletes.value = athletesWithStats
      return athletesWithStats
    } catch (err) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * ค้นหานักกีฬาตามชื่อ
   * Property 4: Search filter returns only matching athletes
   * Requirements: 2.2, 2.3
   */
  function searchAthletes(query) {
    searchQuery.value = query
    return filteredAthletes.value
  }

  /**
   * ดึงอัลบั้มของนักกีฬาที่เลือก
   * Property 2: Athlete album filtering returns only that athlete's albums
   * Requirements: 1.2
   */
  async function fetchAthleteAlbums(userId) {
    if (!userId) {
      error.value = 'ไม่ระบุรหัสนักกีฬา'
      return []
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('user_albums')
        .select(`
          id,
          name,
          description,
          album_type,
          cover_image_url,
          created_at,
          updated_at,
          user_id
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (err) throw err

      return data || []
    } catch (err) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการโหลดอัลบั้ม'
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * ดึงรายการชมรมทั้งหมดพร้อมสถิติ (สำหรับ Admin)
   * Property 5: Admin sees all clubs with accurate statistics
   * Property 6: Club list is sorted by storage used descending
   * Requirements: 3.1, 3.2, 3.4
   */
  async function fetchAllClubsWithStats() {
    loading.value = true
    error.value = null

    try {
      // ดึงรายการชมรมทั้งหมด
      const { data: clubsData, error: clubsErr } = await supabase
        .from('clubs')
        .select('id, name')

      if (clubsErr) throw clubsErr

      // คำนวณสถิติสำหรับแต่ละชมรม
      const clubsWithStats = await Promise.all(
        (clubsData || []).map(async (club) => {
          // ดึง user_ids ของนักกีฬาในชมรม
          const { data: athleteProfiles } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('club_id', club.id)
            .eq('role', 'athlete')

          const userIds = (athleteProfiles || []).map(p => p.id)

          if (userIds.length === 0) {
            return {
              ...club,
              total_albums: 0,
              total_media: 0,
              total_storage: 0
            }
          }

          // ดึงจำนวนอัลบั้ม
          const { count: albumCount } = await supabase
            .from('user_albums')
            .select('id', { count: 'exact', head: true })
            .in('user_id', userIds)

          // ดึงจำนวนไฟล์และขนาดรวม
          const { data: mediaData } = await supabase
            .from('album_media')
            .select('file_size')
            .in('user_id', userIds)

          const totalMedia = mediaData?.length || 0
          const totalStorage = mediaData?.reduce((sum, m) => sum + (m.file_size || 0), 0) || 0

          return {
            ...club,
            total_albums: albumCount || 0,
            total_media: totalMedia,
            total_storage: totalStorage
          }
        })
      )

      // เรียงตามพื้นที่ใช้งานมากไปน้อย
      clubsWithStats.sort((a, b) => b.total_storage - a.total_storage)

      clubs.value = clubsWithStats
      return clubsWithStats
    } catch (err) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลชมรม'
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * ดึงนักกีฬาในชมรมที่เลือก (สำหรับ Admin)
   * Property 7: Admin club selection returns only athletes from that club
   * Requirements: 3.3
   */
  async function fetchAthletesByClub(clubId) {
    if (!clubId) {
      error.value = 'ไม่ระบุรหัสชมรม'
      return []
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('user_profiles')
        .select(`
          id,
          name,
          avatar_url,
          club_id
        `)
        .eq('club_id', clubId)
        .eq('role', 'athlete')
        .order('name', { ascending: true })

      if (err) throw err

      // ดึงสถิติอัลบั้มสำหรับแต่ละนักกีฬา และแปลง name เป็น full_name สำหรับ UI
      const athletesWithStats = await Promise.all(
        (data || []).map(async (athlete) => {
          const stats = await getAthleteStats(athlete.id)
          return { 
            ...athlete, 
            full_name: athlete.name, // แปลงชื่อ field สำหรับ UI
            ...stats 
          }
        })
      )

      athletes.value = athletesWithStats
      selectedClub.value = clubId
      return athletesWithStats
    } catch (err) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลนักกีฬา'
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * ค้นหาข้ามชมรมและนักกีฬา (สำหรับ Admin)
   * Property 9: Global search returns results from both clubs and athletes
   * Requirements: 5.2, 5.3
   */
  async function globalSearch(query) {
    if (!query || query.trim() === '') {
      return { clubs: [], athletes: [] }
    }

    loading.value = true
    error.value = null

    try {
      const searchTerm = query.toLowerCase().trim()

      // ค้นหาชมรม
      const { data: clubResults } = await supabase
        .from('clubs')
        .select('id, name')
        .ilike('name', `%${searchTerm}%`)

      // ค้นหานักกีฬา (ใช้ name แทน full_name ตาม schema)
      const { data: athleteResults } = await supabase
        .from('user_profiles')
        .select(`
          id,
          name,
          avatar_url,
          club_id,
          clubs:club_id (id, name)
        `)
        .eq('role', 'athlete')
        .ilike('name', `%${searchTerm}%`)

      // จัดกลุ่มนักกีฬาตามชมรม และแปลง name เป็น full_name สำหรับ UI
      const athletesByClub = {}
      for (const athlete of (athleteResults || [])) {
        const clubId = athlete.club_id || 'no_club'
        const clubName = athlete.clubs?.name || 'ไม่มีชมรม'
        
        if (!athletesByClub[clubId]) {
          athletesByClub[clubId] = {
            club_id: clubId,
            club_name: clubName,
            athletes: []
          }
        }
        // แปลง name เป็น full_name สำหรับ UI
        athletesByClub[clubId].athletes.push({
          ...athlete,
          full_name: athlete.name
        })
      }

      return {
        clubs: clubResults || [],
        athletesByClub: Object.values(athletesByClub)
      }
    } catch (err) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการค้นหา'
      return { clubs: [], athletesByClub: [] }
    } finally {
      loading.value = false
    }
  }

  /**
   * ดึงสถิติอัลบั้มของนักกีฬา
   * Property 10: Athlete statistics are complete and accurate
   * Requirements: 6.1, 6.2, 6.3
   */
  async function getAthleteStats(userId) {
    if (!userId) {
      return { album_count: 0, media_count: 0, storage_used: 0 }
    }

    try {
      // นับจำนวนอัลบั้ม
      const { count: albumCount } = await supabase
        .from('user_albums')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)

      // ดึงข้อมูลไฟล์ทั้งหมด
      const { data: mediaData } = await supabase
        .from('album_media')
        .select('file_size')
        .eq('user_id', userId)

      const mediaCount = mediaData?.length || 0
      const storageUsed = mediaData?.reduce((sum, m) => sum + (m.file_size || 0), 0) || 0

      return {
        album_count: albumCount || 0,
        media_count: mediaCount,
        storage_used: storageUsed
      }
    } catch (err) {
      console.error('Error fetching athlete stats:', err)
      return { album_count: 0, media_count: 0, storage_used: 0 }
    }
  }

  /**
   * เลือกนักกีฬา
   */
  function selectAthlete(athlete) {
    selectedAthlete.value = athlete
  }

  /**
   * เลือกชมรม (สำหรับ Admin)
   */
  function selectClub(club) {
    selectedClub.value = club
    athletes.value = []
    selectedAthlete.value = null
  }

  /**
   * ล้างการเลือก
   */
  function clearSelection() {
    selectedClub.value = null
    selectedAthlete.value = null
    searchQuery.value = ''
  }

  /**
   * รีเซ็ต state ทั้งหมด
   */
  function reset() {
    clubs.value = []
    athletes.value = []
    selectedClub.value = null
    selectedAthlete.value = null
    searchQuery.value = ''
    loading.value = false
    error.value = null
  }

  return {
    // State
    clubs,
    athletes,
    selectedClub,
    selectedAthlete,
    searchQuery,
    loading,
    error,
    
    // Getters
    filteredAthletes,
    
    // Actions
    fetchAthletesInMyClub,
    searchAthletes,
    fetchAthleteAlbums,
    fetchAllClubsWithStats,
    fetchAthletesByClub,
    globalSearch,
    getAthleteStats,
    selectAthlete,
    selectClub,
    clearSelection,
    reset
  }
})
