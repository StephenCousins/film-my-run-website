-- 19 more running-shoe/sandal brands, researched storefronts. Data only,
-- idempotent: a conflict on the name updates aliases and domain instead of
-- failing. Each row is preceded by the probe result (HTTP status of the
-- storefront root, then whether /search/suggest.json returned Shopify's
-- resources.results.products shape) using a Chrome UA per docs/shoe-finder.md.
INSERT INTO "shoe_brands" ("name","aliases","domain") VALUES
 -- atreyurunning.com redirects to atreyu.com (canonical); 200; shopify yes
 ('Atreyu','{atreyu,"atreyu running","atreyu shoes"}','atreyu.com'),
 -- bedrocksandals.com; 200; shopify yes
 ('Bedrock Sandals','{bedrock,"bedrock sandals"}','bedrocksandals.com'),
 -- diadora.com redirects to www.diadora.com; 200; shopify yes
 ('Diadora','{diadora}','diadora.com'),
 -- erke.com has no working storefront in English; en.erke.com is the
 -- English international site; 200; shopify no (custom platform, not a store)
 ('Erke','{erke,"erke sports"}','en.erke.com'),
 -- freetbarefoot.com; 200; shopify yes
 ('Freet','{freet,"freet barefoot"}','freetbarefoot.com'),
 -- karhu.com; 200; shopify yes
 ('Karhu','{karhu}','karhu.com'),
 -- lemsshoes.com redirects to www.lemsshoes.com; 200; shopify yes
 ('Lems','{lems,"lems shoes"}','lemsshoes.com'),
 -- lunasandals.com; 200; shopify yes
 ('Luna Sandals','{luna,"luna sandals"}','lunasandals.com'),
 -- mounttocoast.com (not mount2coast.com, which is unrelated); 200; shopify yes
 ('Mount to Coast','{"mount to coast","mount 2 coast",mtc}','mounttocoast.com'),
 -- newtonrunning.com redirects to www.newtonrunning.com; 200; shopify yes
 ('Newton','{newton,"newton running"}','newtonrunning.com'),
 -- raidlight.com; 200; shopify yes
 ('RaidLight','{raidlight,"raid light"}','raidlight.com'),
 -- scarpa.com is the official store (scarpa.net redirects here too); 200; shopify yes
 ('Scarpa','{scarpa,"scarpa running"}','scarpa.com'),
 -- shammasandals.com; 200; shopify yes
 ('Shamma Sandals','{shamma,"shamma sandals"}','shammasandals.com'),
 -- skechers.com redirects to www.skechers.com; 200; shopify no (custom/Demandware platform)
 ('Skechers','{skechers}','skechers.com'),
 -- speedland.us does not resolve; the real domain is runspeedland.com; 200; shopify yes
 ('Speedland','{speedland}','runspeedland.com'),
 -- tracksmith.com redirects to www.tracksmith.com; 200; shopify no (custom Astro storefront)
 ('Tracksmith','{tracksmith}','tracksmith.com'),
 -- vibram.com redirects to www.vibram.com and sells FiveFingers; 200; shopify no (Salesforce Commerce Cloud)
 ('Vibram FiveFingers','{vibram,"five fingers",fivefingers,"vibram five fingers"}','vibram.com'),
 -- vivobarefoot.com redirects to www.vivobarefoot.com; blocked by bot
 -- protection on every fetch (403, Cloudflare challenge page), so shopify
 -- status could not be determined; domain confirmed correct via search
 ('Vivobarefoot','{vivobarefoot,"vivo barefoot",vivo}','vivobarefoot.com'),
 -- walsh-shoes.co.uk does not resolve; the real brand site is
 -- normanwalsh.com; 200; shopify yes
 ('Walsh','{walsh,"walsh sports","norman walsh","walsh pb"}','normanwalsh.com')
ON CONFLICT ("name") DO UPDATE SET "aliases" = EXCLUDED."aliases", "domain" = EXCLUDED."domain";
