/**
 * Storage Size Formatting Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับฟังก์ชัน formatStorageSize
 * 
 * **Feature: album-individual-view, Property 11: Storage size formatting is correct**
 * **Validates: Requirements 6.4**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { formatStorageSize } from '@/stores/albumManagement'

// ============================================================================
// Constants
// ============================================================================

const BYTES_PER_KB = 1024
const BYTES_PER_MB = 1024 * 1024
const BYTES_PER_GB = 1024 * 1024 * 1024

// ============================================================================
// Property Tests
// ============================================================================

describe('Storage Size Formatting Property Tests', () => {

  /**
   * **Feature: album-individual-view, Property 11: Storage size formatting is correct**
   * **Validates: Requirements 6.4**
   * 
   * For any byte value, the formatStorageSize function should return a 
   * human-readable string with correct unit (B, KB, MB, GB) and value.
   */
  describe('Property 11: Storage size formatting is correct', () => {

    it('should return "0 B" for zero, negative, null, undefined, or NaN values', () => {
      // ทดสอบ edge cases
      expect(formatStorageSize(0)).toBe('0 B')
      expect(formatStorageSize(-1)).toBe('0 B')
      expect(formatStorageSize(-100)).toBe('0 B')
      expect(formatStorageSize(null)).toBe('0 B')
      expect(formatStorageSize(undefined)).toBe('0 B')
      expect(formatStorageSize(NaN)).toBe('0 B')
    })

    it('should format bytes (0-1023) with B unit', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: BYTES_PER_KB - 1 }),
          (bytes) => {
            const result = formatStorageSize(bytes)
            
            // ต้องลงท้ายด้วย " B"
            expect(result).toMatch(/ B$/)
            
            // ค่าต้องตรงกับ bytes
            const value = parseFloat(result.replace(' B', ''))
            expect(value).toBe(bytes)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should format kilobytes (1024-1048575) with KB unit', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: BYTES_PER_KB, max: BYTES_PER_MB - 1 }),
          (bytes) => {
            const result = formatStorageSize(bytes)
            
            // ต้องลงท้ายด้วย " KB"
            expect(result).toMatch(/ KB$/)
            
            // ค่าต้องอยู่ในช่วงที่ถูกต้อง (1-1024 KB)
            // หมายเหตุ: ค่าที่ใกล้ 1MB มากๆ อาจปัดเศษเป็น 1024.00 KB
            const value = parseFloat(result.replace(' KB', ''))
            expect(value).toBeGreaterThanOrEqual(1)
            expect(value).toBeLessThanOrEqual(1024)
            
            // ตรวจสอบความถูกต้องของการคำนวณ
            const expectedValue = bytes / BYTES_PER_KB
            const expectedFormatted = expectedValue % 1 === 0 
              ? expectedValue.toString() 
              : expectedValue.toFixed(2)
            expect(result).toBe(`${expectedFormatted} KB`)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should format megabytes (1MB-1GB) with MB unit', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: BYTES_PER_MB, max: BYTES_PER_GB - 1 }),
          (bytes) => {
            const result = formatStorageSize(bytes)
            
            // ต้องลงท้ายด้วย " MB"
            expect(result).toMatch(/ MB$/)
            
            // ค่าต้องอยู่ในช่วงที่ถูกต้อง (1-1024 MB)
            // หมายเหตุ: ค่าที่ใกล้ 1GB มากๆ อาจปัดเศษเป็น 1024.00 MB
            const value = parseFloat(result.replace(' MB', ''))
            expect(value).toBeGreaterThanOrEqual(1)
            expect(value).toBeLessThanOrEqual(1024)
            
            // ตรวจสอบความถูกต้องของการคำนวณ
            const expectedValue = bytes / BYTES_PER_MB
            const expectedFormatted = expectedValue % 1 === 0 
              ? expectedValue.toString() 
              : expectedValue.toFixed(2)
            expect(result).toBe(`${expectedFormatted} MB`)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should format gigabytes (>=1GB) with GB unit', () => {
      fc.assert(
        fc.property(
          // ใช้ช่วง 1GB ถึง 100GB เพื่อหลีกเลี่ยงปัญหา integer overflow
          fc.integer({ min: BYTES_PER_GB, max: BYTES_PER_GB * 100 }),
          (bytes) => {
            const result = formatStorageSize(bytes)
            
            // ต้องลงท้ายด้วย " GB"
            expect(result).toMatch(/ GB$/)
            
            // ค่าต้องมากกว่าหรือเท่ากับ 1
            const value = parseFloat(result.replace(' GB', ''))
            expect(value).toBeGreaterThanOrEqual(1)
            
            // ตรวจสอบความถูกต้องของการคำนวณ
            const expectedValue = bytes / BYTES_PER_GB
            const expectedFormatted = expectedValue % 1 === 0 
              ? expectedValue.toString() 
              : expectedValue.toFixed(2)
            expect(result).toBe(`${expectedFormatted} GB`)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should always return a string with format "value unit"', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: BYTES_PER_GB * 10 }),
          (bytes) => {
            const result = formatStorageSize(bytes)
            
            // ต้องเป็น string
            expect(typeof result).toBe('string')
            
            // ต้องมีรูปแบบ "value unit"
            expect(result).toMatch(/^[\d.]+ (B|KB|MB|GB)$/)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should format exact unit boundaries correctly', () => {
      // ทดสอบค่าที่ตรงกับขอบเขตหน่วย
      expect(formatStorageSize(1)).toBe('1 B')
      expect(formatStorageSize(BYTES_PER_KB)).toBe('1 KB')
      expect(formatStorageSize(BYTES_PER_MB)).toBe('1 MB')
      expect(formatStorageSize(BYTES_PER_GB)).toBe('1 GB')
      
      // ทดสอบค่าที่เป็นทวีคูณ
      expect(formatStorageSize(BYTES_PER_KB * 2)).toBe('2 KB')
      expect(formatStorageSize(BYTES_PER_MB * 5)).toBe('5 MB')
      expect(formatStorageSize(BYTES_PER_GB * 10)).toBe('10 GB')
    })

    it('should show 2 decimal places for non-integer values', () => {
      fc.assert(
        fc.property(
          // สร้างค่าที่ไม่ใช่จำนวนเต็มเมื่อแปลงหน่วย
          fc.integer({ min: BYTES_PER_KB + 1, max: BYTES_PER_KB * 2 - 1 })
            .filter(b => (b / BYTES_PER_KB) % 1 !== 0),
          (bytes) => {
            const result = formatStorageSize(bytes)
            
            // ต้องมีทศนิยม 2 ตำแหน่ง
            const valueStr = result.replace(/ (B|KB|MB|GB)$/, '')
            expect(valueStr).toMatch(/^\d+\.\d{2}$/)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not show decimal places for integer values', () => {
      // ทดสอบค่าที่เป็นจำนวนเต็มเมื่อแปลงหน่วย
      const integerValues = [
        BYTES_PER_KB,           // 1 KB
        BYTES_PER_KB * 2,       // 2 KB
        BYTES_PER_KB * 512,     // 512 KB
        BYTES_PER_MB,           // 1 MB
        BYTES_PER_MB * 100,     // 100 MB
        BYTES_PER_GB,           // 1 GB
        BYTES_PER_GB * 5        // 5 GB
      ]
      
      for (const bytes of integerValues) {
        const result = formatStorageSize(bytes)
        const valueStr = result.replace(/ (B|KB|MB|GB)$/, '')
        
        // ไม่ควรมีจุดทศนิยม
        expect(valueStr).not.toContain('.')
      }
    })

    it('should handle string input that can be converted to number', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: BYTES_PER_GB }),
          (bytes) => {
            const stringInput = bytes.toString()
            const result = formatStorageSize(stringInput)
            const expectedResult = formatStorageSize(bytes)
            
            // ผลลัพธ์ควรเหมือนกัน
            expect(result).toBe(expectedResult)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return correct unit for values just below boundaries', () => {
      // ค่าที่น้อยกว่า 1KB ควรเป็น B
      expect(formatStorageSize(BYTES_PER_KB - 1)).toMatch(/ B$/)
      
      // ค่าที่น้อยกว่า 1MB ควรเป็น KB
      expect(formatStorageSize(BYTES_PER_MB - 1)).toMatch(/ KB$/)
      
      // ค่าที่น้อยกว่า 1GB ควรเป็น MB
      expect(formatStorageSize(BYTES_PER_GB - 1)).toMatch(/ MB$/)
    })

    it('should preserve monotonicity - larger bytes should result in larger or equal formatted values within same unit', () => {
      fc.assert(
        fc.property(
          // สร้างคู่ของค่าในช่วง KB
          fc.integer({ min: BYTES_PER_KB, max: BYTES_PER_MB - 1 }),
          fc.integer({ min: BYTES_PER_KB, max: BYTES_PER_MB - 1 }),
          (bytes1, bytes2) => {
            const result1 = formatStorageSize(bytes1)
            const result2 = formatStorageSize(bytes2)
            
            const value1 = parseFloat(result1.replace(/ KB$/, ''))
            const value2 = parseFloat(result2.replace(/ KB$/, ''))
            
            // ถ้า bytes1 > bytes2 แล้ว value1 >= value2
            if (bytes1 > bytes2) {
              expect(value1).toBeGreaterThanOrEqual(value2)
            } else if (bytes1 < bytes2) {
              expect(value1).toBeLessThanOrEqual(value2)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
