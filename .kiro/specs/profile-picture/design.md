# Design Document: Profile Picture

## Overview

ฟีเจอร์ Profile Picture ช่วยให้ผู้ใช้สามารถอัปโหลดและจัดการรูปโปรไฟล์ของตนเอง รูปจะแสดงในหน้า Profile และ NavBar แทนที่ตัวอักษรตัวแรกของชื่อ ระบบรองรับการอัปโหลดรูปใหม่หรือเลือกจากอัลบั้มที่มีอยู่ผ่าน MediaPicker component

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
├─────────────────────────────────────────────────────────────┤
│  Profile.vue          NavBar.vue          AthleteList.vue   │
│       │                   │                     │           │
│       └───────────────────┼─────────────────────┘           │
│                           │                                  │
│                    UserAvatar.vue                           │
│                    (Reusable Component)                     │
│                           │                                  │
│              ┌────────────┴────────────┐                    │
│              │                         │                    │
│       ProfilePictureModal.vue    MediaPicker.vue            │
│              │                         │                    │
└──────────────┼─────────────────────────┼────────────────────┘
               │                         │
┌──────────────┼─────────────────────────┼────────────────────┐
│              │      Supabase           │                    │
├──────────────┼─────────────────────────┼────────────────────┤
│              ▼                         ▼                    │
│    Storage Bucket              user_profiles table          │
│   (profile-pictures)           (avatar_url column)          │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. UserAvatar.vue (New Component)

Reusable avatar component ที่แสดงรูปโปรไฟล์หรือ fallback character

```typescript
interface UserAvatarProps {
  avatarUrl: string | null
  userName: string
  size: 'sm' | 'md' | 'lg' | 'xl'  // 32px, 48px, 64px, 96px
  editable?: boolean
  onClick?: () => void
}
```

### 2. ProfilePictureModal.vue (New Component)

Modal สำหรับจัดการรูปโปรไฟล์

```typescript
interface ProfilePictureModalProps {
  isOpen: boolean
  currentAvatarUrl: string | null
  userId: string
}

interface ProfilePictureModalEmits {
  close: () => void
  updated: (newAvatarUrl: string | null) => void
}
```

### 3. Auth Store Extensions

```typescript
// เพิ่มใน auth.js store
interface ProfileUpdate {
  avatar_url?: string | null
  // ... existing fields
}

async function updateAvatar(avatarUrl: string | null): Promise<{success: boolean, message?: string}>
async function removeAvatar(): Promise<{success: boolean, message?: string}>
```

## Data Models

### Database Schema Change

เพิ่ม column `avatar_url` ในตาราง `user_profiles`:

```sql
ALTER TABLE user_profiles 
ADD COLUMN avatar_url TEXT;
```

### Storage Bucket

สร้าง bucket ใหม่ `profile-pictures` พร้อม policies:

```sql
-- Storage bucket: profile-pictures
-- Path format: {user_id}/avatar_{timestamp}.{ext}

-- Policy: Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Anyone can view avatars (public)
CREATE POLICY "Avatars are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');
```

### File Validation Rules

| Rule | Value |
|------|-------|
| Allowed Types | image/jpeg, image/png, image/webp |
| Max File Size | 2MB (2,097,152 bytes) |
| Storage Path | `{user_id}/avatar_{timestamp}.{ext}` |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: File type validation accepts only allowed types
*For any* file input, the validation function SHALL accept only files with MIME type image/jpeg, image/png, or image/webp, and reject all other types.
**Validates: Requirements 1.2**

### Property 2: File size validation enforces 2MB limit
*For any* file input, the validation function SHALL accept files with size ≤ 2,097,152 bytes and reject files exceeding this limit.
**Validates: Requirements 1.3**

### Property 3: Avatar URL persistence round-trip
*For any* valid image upload or album selection, after the operation completes, querying the user_profiles table SHALL return the same avatar_url that was set.
**Validates: Requirements 1.5, 2.3**

### Property 4: Fallback display when no avatar
*For any* user with avatar_url = null or empty string, the UserAvatar component SHALL display the first character of the user's name.
**Validates: Requirements 3.3, 4.4**

### Property 5: Avatar removal cleanup
*For any* avatar removal operation, the system SHALL delete the file from storage AND set avatar_url to null in the database.
**Validates: Requirements 4.2, 4.3**

### Property 6: Storage path format correctness
*For any* uploaded avatar, the storage path SHALL follow the format `{user_id}/avatar_{timestamp}.{extension}` where user_id matches the authenticated user.
**Validates: Requirements 1.4**

## Error Handling

| Error Case | Handling |
|------------|----------|
| Invalid file type | Show error message, reject upload |
| File too large | Show error message with size limit |
| Upload failed | Show error, allow retry |
| Image load failed | Display fallback character avatar |
| Storage delete failed | Log error, still update avatar_url to null |
| Network error | Show error message, allow retry |

## Testing Strategy

### Unit Tests
- File validation functions (type and size)
- Avatar URL generation
- Fallback character extraction

### Property-Based Tests
- Use **fast-check** library for property-based testing
- Each property test runs minimum 100 iterations
- Tests tagged with format: `**Feature: profile-picture, Property {number}: {property_text}**`

### Integration Tests
- Upload flow end-to-end
- Album selection flow
- Removal flow
- Cross-component avatar display

## Role Matrix

| การกระทำ | Admin | Coach | Athlete |
|----------|-------|-------|---------|
| ดูรูปโปรไฟล์ทั้งหมด | ✅ | ❌ | ❌ |
| ดูรูปโปรไฟล์ในชมรม | ✅ | ✅ | ❌ |
| ดูรูปโปรไฟล์ตัวเอง | ✅ | ✅ | ✅ |
| อัปโหลด/เปลี่ยนรูปตัวเอง | ✅ | ✅ | ✅ |
| ลบรูปตัวเอง | ✅ | ✅ | ✅ |
| ลบรูปผู้อื่น | ✅ | ❌ | ❌ |

## UI/UX Design

### Avatar Sizes
- **sm (32px)**: NavBar, lists
- **md (48px)**: Cards, compact views
- **lg (64px)**: Profile sections
- **xl (96px)**: Profile hero

### Design Theme (Black & White)
- Avatar border: 2px solid #E5E5E5
- Hover state: border-color #171717
- Edit icon: Black background, white icon
- Modal: White background, black text

### Profile Picture Modal Options
1. **อัปโหลดรูปใหม่** - File picker
2. **เลือกจากอัลบั้ม** - MediaPicker component
3. **ลบรูปโปรไฟล์** - (แสดงเมื่อมีรูปอยู่แล้ว)
