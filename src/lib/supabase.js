import { createClient } from '@supabase/supabase-js'

function getScopedStorageKey() {
    // 브라우저 환경이 아니면 기본 키 사용
    if (typeof window === 'undefined') return 'edu-support-auth-default'

    const BRAND_SCOPE_KEY = 'edu_support_brand_scope'

    // brand 파라미터가 있으면 해당 브랜드 스코프로 갱신
    const params = new URLSearchParams(window.location.search)
    const brand = params.get('brand')
    if (brand === 'INSIDEOUT' || brand === 'SNIPERFACTORY') {
        window.sessionStorage.setItem(BRAND_SCOPE_KEY, brand)
    } else if (window.location.pathname === '/login') {
        // 브랜드 없는 기본 로그인은 공용 스코프 사용
        window.sessionStorage.setItem(BRAND_SCOPE_KEY, 'GLOBAL')
    }

    const scope = window.sessionStorage.getItem(BRAND_SCOPE_KEY) || 'GLOBAL'
    // 탭이 바뀌어도(새 탭/새 창) 동일 세션을 사용하도록 tabId를 제거
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
