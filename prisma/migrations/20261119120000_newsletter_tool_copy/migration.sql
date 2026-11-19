-- Race Map and parkrun Statistics show Stephen's own runs; readers can't add theirs. Copy said they could.
UPDATE newsletter_content_pool SET body = 'Every marathon and ultra I''ve run, on one map. Click any route to see the race details.'
WHERE category = 'tool' AND title = 'Race Map';
UPDATE newsletter_content_pool SET body = 'Every parkrun I''ve run, from my first to my latest: the times, the venues and how my 5K has changed over the years.'
WHERE category = 'tool' AND title = 'parkrun Statistics';
