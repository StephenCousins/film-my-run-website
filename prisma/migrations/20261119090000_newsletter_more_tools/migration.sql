-- Newsletter Tool of the Week had only 5 tools, each repeated 8 times. Add the games, the quiz and Shoe Finder.
-- Data only; NOT EXISTS keeps it safe to re-run against a database that already has them.
INSERT INTO newsletter_content_pool (category, title, body, url)
SELECT v.category, v.title, v.body, v.url FROM (VALUES
  ('tool', 'Fartlex', 'Speed play with words: a new running word every day. Four letters early in the week, building to a seven-letter long run on Sunday.', '/games/fartlex'),
  ('tool', 'RunGuessr', 'Guess the race from a photo, an elevation profile or a course map. Five races a day, from Western States to the Great North Run.', '/games/runguessr'),
  ('tool', 'What Kind of Runner Are You?', 'Twelve situations, two minutes. Find out which of twelve runner types you are, from Fell Runner to Lab Rat, and see your Runner DNA.', '/tools/runner-quiz'),
  ('tool', 'Shoe Finder', 'The best running shoes for trail and road, ranked from review scores across RunRepeat, Runner''s World, iRunFar and more.', '/tools/shoe-finder')
) AS v(category, title, body, url)
WHERE NOT EXISTS (SELECT 1 FROM newsletter_content_pool p WHERE p.category = v.category AND p.title = v.title);
