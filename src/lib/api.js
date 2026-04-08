import { supabase } from './supabase'

// ─── Programs ──────────────────────────────────
export async function getPrograms(brand) {
    const q = supabase.from('programs').select('*').eq('is_archived', false).order('created_at', { ascending: false })
    if (brand) q.eq('brand', brand)
    const { data, error } = await q
    if (error) throw error
    return data
}

export async function updateProgram(id, updates) {
    const { data, error } = await supabase.from('programs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id).select().single()
    if (error) throw error
    return data
}

// ─── Applications (면접자) ──────────────────────
export async function getApplicationsByProgram(programId) {
    const { data, error } = await supabase.from('applications')
        .select('*, users(id, name, email, phone, metadata, resume_url, portfolio_url)')
        .eq('program_id', programId).order('created_at', { ascending: false })
    if (error) throw error
    return data
}

export async function updateApplicationStage(id, stage) {
    const { data, error } = await supabase.from('applications')
        .update({ stage }).eq('id', id).select().single()
    if (error) throw error
    return data
}

// ─── Company Applications (기업) ────────────────
export async function getCompanyApplicationsByProgram(programId) {
    const { data, error } = await supabase.from('company_applications')
        .select('*').eq('program_id', programId).order('created_at', { ascending: false })
    if (error) throw error
    return data
}

export async function upsertCompanyApplication(payload) {
    const { data, error } = await supabase.from('company_applications')
        .upsert(payload, { onConflict: 'id' }).select().single()
    if (error) throw error
    return data
}

// ─── Interviews ─────────────────────────────────
export async function getInterviewsByProgram(programId) {
    const { data, error } = await supabase.from('interviews')
        .select('*').eq('program_id', programId).order('date', { ascending: true })
    if (error) throw error
    return data
}

export async function createInterview(payload) {
    const { data, error } = await supabase.from('interviews').insert(payload).select().single()
    if (error) throw error
    return data
}

export async function updateInterview(id, updates) {
    const { data, error } = await supabase.from('interviews')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id).select().single()
    if (error) throw error
    return data
}

export async function deleteInterview(id) {
    const { error } = await supabase.from('interviews').delete().eq('id', id)
    if (error) throw error
}

// ─── Notices ────────────────────────────────────
export async function getNotices(brand, filters = {}) {
    let query = supabase.from('notices').select('*')
        .eq('brand', brand).eq('is_archived', false)
    if (filters.search) query = query.ilike('title', `%${filters.search}%`)
    if (filters.is_hidden !== undefined) query = query.eq('is_hidden', filters.is_hidden)
    query = query.order('is_fixed', { ascending: false }).order('created_at', { ascending: false })
    const { data, error } = await query
    if (error) throw error
    return data
}

export async function getNoticeById(id) {
    const { data, error } = await supabase.from('notices').select('*').eq('id', id).single()
    if (error) throw error
    return data
}

export async function createNotice(payload) {
    const { data, error } = await supabase.from('notices').insert(payload).select().single()
    if (error) throw error
    return data
}

export async function updateNotice(id, updates) {
    const { data, error } = await supabase.from('notices')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id).select().single()
    if (error) throw error
    return data
}

export async function deleteNotice(id) {
    const { error } = await supabase.from('notices').update({ is_archived: true }).eq('id', id)
    if (error) throw error
}

export async function incrementNoticeView(id, currentCount) {
    await supabase.from('notices').update({ view_count: (currentCount || 0) + 1 }).eq('id', id)
}

// ─── Users ──────────────────────────────────────
export async function getUserById(id) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single()
    if (error) throw error
    return data
}