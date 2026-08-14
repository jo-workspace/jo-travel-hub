import { supabase } from './supabase';

async function checkAllSettings() {
  const { data, error } = await supabase.from('trip_settings').select('*');
  console.log('Error:', error);
  console.log('All rows in trip_settings:');
  data?.forEach(row => {
    console.log(`\n--- trip_id: ${row.trip_id} ---`);
    console.log('trip_note:', JSON.stringify(row.trip_note));
    console.log('svg_icon:', JSON.stringify(row.svg_icon));
  });
}

checkAllSettings().then(() => process.exit(0));
