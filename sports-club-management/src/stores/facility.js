import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'

/**
 * Facility Store - จัดการข้อมูลสถานที่และการจอง
 * Requirements: 1.1, 2.1, 3.1, 4.1, 5.1
 */
export const useFacilityStore = defineStore('facility', () => {
  const authStore = useAuthStore()

  // State
  const facilities = ref([])
  const bookings = ref([])
  const myBookings = ref([])
  const pendingBookings = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Getters
  const activeFacilities = computed(() => 
    facilities.value.filter(f => f.is_active)
  )

  const upcomingBookings = computed(() => 
    myBookings.value.filter(b => 
      b.status === 'approved' && 
      new Date(b.booking_date) >= new Date().setHours(0, 0, 0, 0)
    ).sort((a, b) => new Date(a.booking_date) - new Date(b.booking_date))
  )

  const pendingMyBookings = computed(() => 
    myBookings.value.filter(b => b.status === 'pending')
  )

  const pastBookings = computed(() => 
    myBookings.value.filter(b => 
      new Date(b.booking_date) < new Date().setHours(0, 0, 0, 0) ||
      b.status === 'rejected' || 
      b.status === 'cancelled'
    ).sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date))
  )

  // Actions

  /**
   * ดึงรายการสถานที่ทั้งหมด
   * @param {boolean} includeInactive - รวมสถานที่ที่ปิดใช้งาน (สำหรับ admin)
   */
  async function fetchFacilities(includeInactive = false) {
    loading.value = true
    error.value = null

    try {
      let query = supabase
        .from('facilities')
        .select(`
          *,
          time_slots:facility_time_slots(*)
        `)
        .order('name')

      // ถ้าไม่ใช่ admin หรือไม่ต้องการดูที่ปิดใช้งาน ให้กรองเฉพาะ active
      if (!includeInactive) {
        query = query.eq('is_active', true)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      facilities.value = data || []
      return { success: true, data }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching facilities:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * ดึงข้อมูลสถานที่ตาม ID
   */
  async function fetchFacilityById(id) {
    try {
      const { data, error: fetchError } = await supabase
        .from('facilities')
        .select(`
          *,
          time_slots:facility_time_slots(*)
        `)
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      return { success: true, data }
    } catch (err) {
      console.error('Error fetching facility:', err)
      return { success: false, message: err.message }
    }
  }

  /**
   * ดึงการจองของสถานที่ในช่วงวันที่
   */
  async function fetchFacilityBookings(facilityId, startDate, endDate) {
    try {
      const { data, error: fetchError } = await supabase
        .from('facility_bookings')
        .select(`
          *,
          athlete:user_profiles!facility_bookings_athlete_id_fkey(id, name)
        `)
        .eq('facility_id', facilityId)
        .gte('booking_date', startDate)
        .lte('booking_date', endDate)
        .in('status', ['pending', 'approved'])
        .order('booking_date')
        .order('start_time')

      if (fetchError) throw fetchError
      return { success: true, data: data || [] }
    } catch (err) {
      console.error('Error fetching facility bookings:', err)
      return { success: false, message: err.message }
    }
  }

  /**
   * สร้างการจองใหม่
   * - Admin/Coach: อนุมัติอัตโนมัติ (status = 'approved')
   * - Athlete: รออนุมัติ (status = 'pending')
   */
  async function createBooking(bookingData) {
    loading.value = true
    error.value = null

    try {
      // ตรวจสอบว่าช่วงเวลาว่างหรือไม่
      const { data: isAvailable } = await supabase.rpc('check_slot_availability', {
        p_facility_id: bookingData.facility_id,
        p_date: bookingData.booking_date,
        p_start_time: bookingData.start_time,
        p_end_time: bookingData.end_time
      })

      if (!isAvailable) {
        return { success: false, message: 'ช่วงเวลานี้ถูกจองแล้ว' }
      }

      // ตรวจสอบ role ของผู้ใช้
      const userRole = authStore.profile?.role
      const isAdminOrCoach = userRole === 'admin' || userRole === 'coach'

      // สร้าง payload เฉพาะ fields ที่มีใน database (ไม่รวม isRecurring, weeks)
      const bookingPayload = {
        facility_id: bookingData.facility_id,
        booking_date: bookingData.booking_date,
        start_time: bookingData.start_time,
        end_time: bookingData.end_time,
        purpose: bookingData.purpose || null,
        athlete_id: authStore.user?.id,
        status: isAdminOrCoach ? 'approved' : 'pending'
      }

      // ถ้าเป็น Admin/Coach ให้บันทึกผู้อนุมัติด้วย
      if (isAdminOrCoach) {
        bookingPayload.approved_by = authStore.user?.id
        bookingPayload.approved_at = new Date().toISOString()
      }

      const { data, error: insertError } = await supabase
        .from('facility_bookings')
        .insert(bookingPayload)
        .select()
        .single()

      if (insertError) throw insertError

      // รีโหลด myBookings
      await fetchMyBookings()

      return { 
        success: true, 
        data,
        message: isAdminOrCoach ? 'จองสำเร็จ (อนุมัติอัตโนมัติ)' : 'ส่งคำขอจองสำเร็จ รออนุมัติ'
      }
    } catch (err) {
      error.value = err.message
      console.error('Error creating booking:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * สร้างการจองซ้ำ (recurring)
   * - Admin/Coach: อนุมัติอัตโนมัติ (status = 'approved')
   * - Athlete: รออนุมัติ (status = 'pending')
   */
  async function createRecurringBooking(bookingData, weeks) {
    loading.value = true
    error.value = null

    try {
      const seriesId = crypto.randomUUID()
      const bookingsToCreate = []
      const conflicts = []
      const startDate = new Date(bookingData.booking_date)

      // ตรวจสอบ role ของผู้ใช้
      const userRole = authStore.profile?.role
      const isAdminOrCoach = userRole === 'admin' || userRole === 'coach'

      for (let i = 0; i < weeks; i++) {
        const bookingDate = new Date(startDate)
        bookingDate.setDate(bookingDate.getDate() + (i * 7))
        const dateStr = bookingDate.toISOString().split('T')[0]

        // ตรวจสอบว่าช่วงเวลาว่างหรือไม่
        const { data: isAvailable } = await supabase.rpc('check_slot_availability', {
          p_facility_id: bookingData.facility_id,
          p_date: dateStr,
          p_start_time: bookingData.start_time,
          p_end_time: bookingData.end_time
        })

        if (isAvailable) {
          // สร้าง payload เฉพาะ fields ที่มีใน database (ไม่รวม isRecurring, weeks)
          const booking = {
            facility_id: bookingData.facility_id,
            booking_date: dateStr,
            start_time: bookingData.start_time,
            end_time: bookingData.end_time,
            purpose: bookingData.purpose || null,
            athlete_id: authStore.user?.id,
            status: isAdminOrCoach ? 'approved' : 'pending',
            series_id: seriesId
          }

          // ถ้าเป็น Admin/Coach ให้บันทึกผู้อนุมัติด้วย
          if (isAdminOrCoach) {
            booking.approved_by = authStore.user?.id
            booking.approved_at = new Date().toISOString()
          }

          bookingsToCreate.push(booking)
        } else {
          conflicts.push(dateStr)
        }
      }

      if (bookingsToCreate.length === 0) {
        return { success: false, message: 'ทุกช่วงเวลาถูกจองแล้ว' }
      }

      const { data, error: insertError } = await supabase
        .from('facility_bookings')
        .insert(bookingsToCreate)
        .select()

      if (insertError) throw insertError

      await fetchMyBookings()

      // สร้างข้อความตาม role
      const statusText = isAdminOrCoach ? '(อนุมัติอัตโนมัติ)' : '(รออนุมัติ)'
      
      return { 
        success: true, 
        data, 
        conflicts,
        message: conflicts.length > 0 
          ? `สร้างการจอง ${data.length} รายการ ${statusText} (ข้าม ${conflicts.length} วันที่ถูกจองแล้ว)`
          : `สร้างการจอง ${data.length} รายการ ${statusText}`
      }
    } catch (err) {
      error.value = err.message
      console.error('Error creating recurring booking:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * ยกเลิกการจอง
   */
  async function cancelBooking(bookingId) {
    try {
      const { error: updateError } = await supabase
        .from('facility_bookings')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .eq('athlete_id', authStore.user?.id)

      if (updateError) throw updateError

      await fetchMyBookings()
      return { success: true }
    } catch (err) {
      console.error('Error cancelling booking:', err)
      return { success: false, message: err.message }
    }
  }

  /**
   * ยกเลิกการจองทั้ง series
   */
  async function cancelRecurringSeries(seriesId) {
    try {
      const { error: updateError } = await supabase
        .from('facility_bookings')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('series_id', seriesId)
        .eq('athlete_id', authStore.user?.id)
        .eq('status', 'pending')

      if (updateError) throw updateError

      await fetchMyBookings()
      return { success: true }
    } catch (err) {
      console.error('Error cancelling series:', err)
      return { success: false, message: err.message }
    }
  }

  /**
   * ดึงการจองของตัวเอง
   */
  async function fetchMyBookings() {
    try {
      const { data, error: fetchError } = await supabase
        .from('facility_bookings')
        .select(`
          *,
          facility:facilities(id, name, image_url)
        `)
        .eq('athlete_id', authStore.user?.id)
        .order('booking_date', { ascending: false })

      if (fetchError) throw fetchError
      myBookings.value = data || []
      return { success: true, data }
    } catch (err) {
      console.error('Error fetching my bookings:', err)
      return { success: false, message: err.message }
    }
  }

  /**
   * ดึงคำขอที่รออนุมัติ (สำหรับ Coach/Admin)
   */
  async function fetchPendingBookings() {
    try {
      const { data, error: fetchError } = await supabase
        .from('facility_bookings')
        .select(`
          *,
          facility:facilities(id, name, image_url),
          athlete:user_profiles!facility_bookings_athlete_id_fkey(id, name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError
      pendingBookings.value = data || []
      return { success: true, data }
    } catch (err) {
      console.error('Error fetching pending bookings:', err)
      return { success: false, message: err.message }
    }
  }

  /**
   * อนุมัติการจอง
   */
  async function approveBooking(bookingId) {
    try {
      const { error: updateError } = await supabase
        .from('facility_bookings')
        .update({ 
          status: 'approved',
          approved_by: authStore.user?.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)

      if (updateError) throw updateError

      await fetchPendingBookings()
      return { success: true }
    } catch (err) {
      console.error('Error approving booking:', err)
      return { success: false, message: err.message }
    }
  }

  /**
   * อนุมัติการจองทั้ง series
   */
  async function approveRecurringSeries(seriesId) {
    try {
      const { error: updateError } = await supabase
        .from('facility_bookings')
        .update({ 
          status: 'approved',
          approved_by: authStore.user?.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('series_id', seriesId)
        .eq('status', 'pending')

      if (updateError) throw updateError

      await fetchPendingBookings()
      return { success: true }
    } catch (err) {
      console.error('Error approving series:', err)
      return { success: false, message: err.message }
    }
  }

  /**
   * ปฏิเสธการจอง
   */
  async function rejectBooking(bookingId, reason) {
    if (!reason || reason.trim() === '') {
      return { success: false, message: 'กรุณาระบุเหตุผลในการปฏิเสธ' }
    }

    try {
      const { error: updateError } = await supabase
        .from('facility_bookings')
        .update({ 
          status: 'rejected',
          rejection_reason: reason,
          rejected_by: authStore.user?.id,
          rejected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)

      if (updateError) throw updateError

      await fetchPendingBookings()
      return { success: true }
    } catch (err) {
      console.error('Error rejecting booking:', err)
      return { success: false, message: err.message }
    }
  }

  // Admin Actions

  /**
   * สร้างสถานที่ใหม่
   */
  async function createFacility(facilityData) {
    try {
      const { data, error: insertError } = await supabase
        .from('facilities')
        .insert({
          ...facilityData,
          club_id: authStore.profile?.club_id
        })
        .select()
        .single()

      if (insertError) throw insertError

      await fetchFacilities()
      return { success: true, data }
    } catch (err) {
      console.error('Error creating facility:', err)
      return { success: false, message: err.message }
    }
  }

  /**
   * อัปเดตสถานที่
   */
  async function updateFacility(id, facilityData) {
    try {
      const { data, error: updateError } = await supabase
        .from('facilities')
        .update({
          ...facilityData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      await fetchFacilities()
      return { success: true, data }
    } catch (err) {
      console.error('Error updating facility:', err)
      return { success: false, message: err.message }
    }
  }

  /**
   * ปิดใช้งานสถานที่
   */
  async function deactivateFacility(id) {
    try {
      const { error: updateError } = await supabase
        .from('facilities')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) throw updateError

      await fetchFacilities()
      return { success: true }
    } catch (err) {
      console.error('Error deactivating facility:', err)
      return { success: false, message: err.message }
    }
  }

  /**
   * จัดการ time slots
   */
  async function saveTimeSlots(facilityId, timeSlots) {
    try {
      // ลบ slots เดิม
      await supabase
        .from('facility_time_slots')
        .delete()
        .eq('facility_id', facilityId)

      // เพิ่ม slots ใหม่
      if (timeSlots.length > 0) {
        const slotsToInsert = timeSlots.map(slot => ({
          ...slot,
          facility_id: facilityId
        }))

        const { error: insertError } = await supabase
          .from('facility_time_slots')
          .insert(slotsToInsert)

        if (insertError) throw insertError
      }

      return { success: true }
    } catch (err) {
      console.error('Error saving time slots:', err)
      return { success: false, message: err.message }
    }
  }

  return {
    // State
    facilities,
    bookings,
    myBookings,
    pendingBookings,
    loading,
    error,
    
    // Getters
    activeFacilities,
    upcomingBookings,
    pendingMyBookings,
    pastBookings,
    
    // Actions
    fetchFacilities,
    fetchFacilityById,
    fetchFacilityBookings,
    createBooking,
    createRecurringBooking,
    cancelBooking,
    cancelRecurringSeries,
    fetchMyBookings,
    fetchPendingBookings,
    approveBooking,
    approveRecurringSeries,
    rejectBooking,
    
    // Admin Actions
    createFacility,
    updateFacility,
    deactivateFacility,
    saveTimeSlots
  }
})
