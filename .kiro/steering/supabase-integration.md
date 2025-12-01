# ข้อกำหนดการทำงานกับ Supabase

## กฎสำคัญ

เมื่อมีการพัฒนาฟีเจอร์ใหม่ ต้องปฏิบัติตามขั้นตอนนี้เสมอ:

1. **ตรวจสอบ MCP Connection** - ทดสอบการเชื่อมต่อ Supabase MCP ก่อนเริ่มงาน
2. **เชื่อมต่อ Supabase** - ทุกฟีเจอร์ที่เกี่ยวข้องกับข้อมูลต้องใช้ Supabase เป็น Backend
3. **สร้าง Migration** - ใช้ `apply_migration` สำหรับการเปลี่ยนแปลง Database Schema
4. **ตรวจสอบ Security** - รัน `get_advisors` เพื่อตรวจสอบ RLS policies หลังสร้างตาราง

## Project Info

- **Project ID:** augislapwqypxsnnwbot
- **Region:** ap-south-1
- **URL:** https://augislapwqypxsnnwbot.supabase.co

## การตรวจสอบก่อนเริ่มงาน

```
1. mcp_supabase_list_projects - ตรวจสอบการเชื่อมต่อ
2. mcp_supabase_list_tables - ดูตารางที่มีอยู่
3. mcp_supabase_get_advisors - ตรวจสอบ security/performance
```
