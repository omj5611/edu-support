import { createClient } from '@supabase/supabase-js'

function getScopedStorageKey() {
    // 브라우저 환경이 아니면 기본 키 사용
    if (typeof window === 'undefined') return 'edu-support-auth-default'

    const TAB_ID_KEY = 'edu_support_tab_id'
    const BRAND_SCOPE_KEY = 'edu_support_brand_scope'

    // 탭 단위 식별자 (탭별 세션 분리)
    let tabId = window.sessionStorage.getItem(TAB_ID_KEY)
    if (!tabId) {
        tabId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
        window.sessionStorage.setItem(TAB_ID_KEY, tabId)
    }

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
    return `edu-support-auth-${scope}-${tabId}`
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
