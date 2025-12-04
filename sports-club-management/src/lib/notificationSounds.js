/**
 * Notification Sounds Library
 * สร้างเสียงแจ้งเตือนโดยใช้ Web Audio API
 * ไม่ต้องใช้ไฟล์เสียงภายนอก ทำงานได้แบบ offline
 * 
 * Requirements: 2.1, 2.2, 2.5
 */

// AudioContext singleton
let audioContext = null

/**
 * สร้าง AudioContext (lazy initialization)
 * @returns {AudioContext|null}
 */
function getAudioContext() {
  if (!audioContext && typeof AudioContext !== 'undefined') {
    audioContext = new AudioContext()
  }
  return audioContext
}

/**
 * เล่นโน้ตเสียงด้วยความถี่และระยะเวลาที่กำหนด
 * @param {number} frequency - ความถี่ (Hz)
 * @param {number} duration - ระยะเวลา (วินาที)
 * @param {string} type - ประเภทคลื่นเสียง ('sine', 'square', 'triangle', 'sawtooth')
 * @param {number} volume - ระดับเสียง (0-1)
 * @param {number} delay - หน่วงเวลาก่อนเล่น (วินาที)
 */
function playTone(frequency, duration, type = 'sine', volume = 0.3, delay = 0) {
  const ctx = getAudioContext()
  if (!ctx) return

  // Resume context if suspended (required for autoplay policy)
  if (ctx.state === 'suspended') {
    ctx.resume()
  }

  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.type = type
  oscillator.frequency.value = frequency

  const startTime = ctx.currentTime + delay
  const endTime = startTime + duration

  // Envelope: fade in and fade out เพื่อไม่ให้เสียงกระตุก
  gainNode.gain.setValueAtTime(0, startTime)
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01)
  gainNode.gain.linearRampToValueAtTime(volume, endTime - 0.05)
  gainNode.gain.linearRampToValueAtTime(0, endTime)

  oscillator.start(startTime)
  oscillator.stop(endTime)
}

/**
 * เสียงเริ่มต้น - เสียงแจ้งเตือนมาตรฐาน
 * สองโน้ตขึ้น (C5 -> E5)
 */
export function playDefaultSound() {
  playTone(523.25, 0.15, 'sine', 0.3, 0)      // C5
  playTone(659.25, 0.2, 'sine', 0.3, 0.15)    // E5
}

/**
 * เสียงระฆัง - เสียงใสคล้ายระฆัง
 * ใช้ sine wave หลายความถี่ซ้อนกัน
 */
export function playChimeSound() {
  // เสียงระฆังใช้ harmonic overtones
  playTone(880, 0.4, 'sine', 0.2, 0)          // A5
  playTone(1760, 0.3, 'sine', 0.1, 0)         // A6 (overtone)
  playTone(1108.73, 0.35, 'sine', 0.15, 0.1)  // C#6
}

/**
 * เสียงกระดิ่ง - เสียงกระดิ่งสั้นๆ
 * โน้ตสูงสั้นๆ หลายตัว
 */
export function playBellSound() {
  playTone(1318.51, 0.1, 'sine', 0.25, 0)     // E6
  playTone(1567.98, 0.1, 'sine', 0.2, 0.08)   // G6
  playTone(1318.51, 0.15, 'sine', 0.25, 0.16) // E6
}

/**
 * เสียงนุ่มนวล - เสียงเบาๆ ไม่รบกวน
 * โน้ตต่ำ fade in/out ช้าๆ
 */
export function playSoftSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  if (ctx.state === 'suspended') {
    ctx.resume()
  }

  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.type = 'sine'
  oscillator.frequency.value = 440 // A4

  const startTime = ctx.currentTime
  const duration = 0.5

  // Soft envelope - fade in/out ช้ากว่าปกติ
  gainNode.gain.setValueAtTime(0, startTime)
  gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.1)
  gainNode.gain.linearRampToValueAtTime(0.15, startTime + duration - 0.2)
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration)

  oscillator.start(startTime)
  oscillator.stop(startTime + duration)
}

/**
 * เล่นเสียงตามชื่อที่กำหนด
 * @param {string} soundKey - ชื่อเสียง ('default', 'chime', 'bell', 'soft', 'none')
 * @returns {boolean} true ถ้าเล่นสำเร็จ
 */
export function playNotificationSound(soundKey) {
  if (soundKey === 'none') {
    return true // ไม่เล่นเสียง
  }

  try {
    switch (soundKey) {
      case 'default':
        playDefaultSound()
        break
      case 'chime':
        playChimeSound()
        break
      case 'bell':
        playBellSound()
        break
      case 'soft':
        playSoftSound()
        break
      default:
        playDefaultSound()
    }
    return true
  } catch (err) {
    console.warn('ไม่สามารถเล่นเสียงแจ้งเตือนได้:', err)
    return false
  }
}

/**
 * ตรวจสอบว่า browser รองรับ Web Audio API หรือไม่
 * @returns {boolean}
 */
export function isAudioSupported() {
  return typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined'
}

/**
 * ตัวเลือกเสียงแจ้งเตือนพร้อมฟังก์ชันเล่นเสียง
 * ใช้แทน SOUND_OPTIONS ใน store เมื่อต้องการเล่นเสียง
 */
export const NOTIFICATION_SOUNDS = {
  default: {
    key: 'default',
    label: 'เสียงเริ่มต้น',
    play: playDefaultSound
  },
  chime: {
    key: 'chime',
    label: 'เสียงระฆัง',
    play: playChimeSound
  },
  bell: {
    key: 'bell',
    label: 'เสียงกระดิ่ง',
    play: playBellSound
  },
  soft: {
    key: 'soft',
    label: 'เสียงนุ่มนวล',
    play: playSoftSound
  },
  none: {
    key: 'none',
    label: 'ไม่มีเสียง',
    play: () => {}
  }
}

export default {
  playNotificationSound,
  playDefaultSound,
  playChimeSound,
  playBellSound,
  playSoftSound,
  isAudioSupported,
  NOTIFICATION_SOUNDS
}
