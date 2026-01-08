import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current timestamp
    const now = new Date()
    const currentDate = now.toISOString().split('T')[0]
    const currentTime = now.toTimeString().split(' ')[0]

    // Find confirmed jobs where job_date < today, OR job_date = today AND end_time <= current time
    const { data: jobsToComplete, error: fetchError } = await supabase
      .from('jobs')
      .select('id, job_number, job_date, end_time')
      .eq('status', 'confirmed')
      .or(`job_date.lt.${currentDate},and(job_date.eq.${currentDate},end_time.lte.${currentTime})`)

    if (fetchError) {
      console.error('Error fetching jobs:', fetchError)
      throw fetchError
    }

    if (!jobsToComplete || jobsToComplete.length === 0) {
      console.log('No jobs to auto-complete')
      return new Response(
        JSON.stringify({ message: 'No jobs to auto-complete', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const jobIds = jobsToComplete.map(job => job.id)
    console.log(`Auto-completing ${jobIds.length} jobs:`, jobsToComplete.map(j => j.job_number))

    // Update jobs to complete status
    const { error: updateError } = await supabase
      .from('jobs')
      .update({ status: 'complete' })
      .in('id', jobIds)

    if (updateError) {
      console.error('Error updating jobs:', updateError)
      throw updateError
    }

    return new Response(
      JSON.stringify({ 
        message: `Auto-completed ${jobIds.length} jobs`, 
        updated: jobIds.length,
        jobs: jobsToComplete.map(j => j.job_number)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    console.error('Error in auto-complete-jobs:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
