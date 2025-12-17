import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gkmuuezbookloryibbgr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrbXV1ZXpib29rbG9yeWliYmdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMjY5NDQsImV4cCI6MjA3ODgwMjk0NH0.6i-WXEakMaOE9sQoeE1Rj18N8YmMsKdYFspP_lITvNk';

// Cliente principal de supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
