import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
// Phiên đăng nhập chỉ lưu trong sessionStorage: đóng tab/trình duyệt là phải đăng nhập lại (tải lại trang thì vẫn giữ).
// Muốn bắt đăng nhập lại cả khi tải lại trang: đổi thành  auth: { persistSession: false }
export const supabase = url && key ? createClient(url, key, { auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true } }) : null
