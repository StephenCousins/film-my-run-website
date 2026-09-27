-- Three brands the 27 Sep 2026 weekly run held as brand_unresolved
-- (tarkine-trail-devil-3, fila-speedtempo-plus, tyr-valkyrie-elite-2).
-- Data only, idempotent like 20260914150000. Probed 27 Sep with a Chrome UA:
INSERT INTO "shoe_brands" ("name","aliases","domain") VALUES
 -- tarkine.com redirects to www.tarkine.com; shopify yes (Trail Devil 3 listed)
 ('Tarkine','{tarkine}','tarkine.com'),
 -- fila.com 200, no store search (404); fila.co.uk is Shopify but carries no running shoes
 ('Fila','{fila}','fila.com'),
 -- www.tyr.com redirects to tyr.com; shopify yes (Valkyrie line listed)
 ('TYR','{tyr,"tyr sport"}','tyr.com')
ON CONFLICT ("name") DO UPDATE SET "aliases" = EXCLUDED."aliases", "domain" = EXCLUDED."domain";
