import { createClient } from '@supabase/supabase-js'

function detectBrandFromLocation() {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    const brandParam = params.get('brand')
    if (brandParam === 'INSIDEOUT' || brandParam === 'SNIPERFACTORY') return brandParam

    const host = String(window.location.hostname || '').toLowerCase()
    if (host.includes('insideout')) return 'INSIDEOUT'
    if (host.includes('sniperfactory')) return 'SNIPERFACTORY'
    return null
}

function getScopedStorageKey() {
    // 브라우저 환경이 아니면 기본 키 사용
    if (typeof window === 'undefined') return 'edu-support-auth-default'

    const BRAND_SCOPE_KEY = 'edu_support_brand_scope'

    // 탭/창 간 로그인 유지: localStorage를 기준으로 브랜드 스코프를 고정합니다.
    // (로그인 페이지 접근만으로 GLOBAL로 덮어쓰지 않도록 주의)
    const detectedBrand = detectBrandFromLocation()
    if (detectedBrand) {
        window.localStorage.setItem(BRAND_SCOPE_KEY, detectedBrand)
    }

    const scope = window.localStorage.getItem(BRAND_SCOPE_KEY) || 'GLOBAL'
    return `edu-support-auth-${scope}`
}

export const supabase = createClient(
    'https://sisaovjtgjgrfcubweoc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpc2Fvdmp0Z2pncmZjdWJ3ZW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4Nzk3ODAsImV4cCI6MjA4NDQ1NTc4MH0.oMLkYBokgxPe3bo7tD5r0orSblS4F-ivv1NPQ2KmDsY',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storageKey: getScopedStorageKey(),
        },
    }
)
