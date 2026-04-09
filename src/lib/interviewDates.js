import { supabase } from './supabase'

export async function syncInterviewDates(programId, startDate, endDate, excludeWeekends = true) {
  void excludeWeekends
  if (!programId) return

  const { data: existing, error: findError } = await supabase
    .from('interview_date')
    .select('id')
    .eq('program_id', programId)
    .maybeSingle()

  if (findError) throw findError

  if (existing?.id) {
    const { error } = await supabase
      .from('interview_date')
      .update({
        start_date: startDate || null,
        end_date: endDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('interview_date')
    .insert({
      program_id: programId,
      start_date: startDate || null,
      end_date: endDate || null,
    })
  if (error) throw error
}
