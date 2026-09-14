-- Chinese running-shoe brands, added by hand rather than by discovery (their
-- English product pages are thin or block server fetches; see
-- docs/shoe-finder.md, "Brands without a findable English product page").
-- Data only, and idempotent: Li-Ning already exists from the pipeline
-- migration and Peak/Kailas may have been auto-created from shoes rows, so
-- a conflict on the name updates aliases and domain instead of failing.
INSERT INTO "shoe_brands" ("name","aliases","domain") VALUES
 ('Li-Ning','{li-ning,"li ning",lining,"li-ning official"}','en.lining.com'),
 ('Anta','{anta,"anta sports"}','anta.com'),
 ('Xtep','{xtep}','xtep.com'),
 ('361°','{361,"361°","361 degrees","361 degree","361sport"}','361europe.com'),
 ('Qiaodan','{qiaodan,"qiao dan","jordan china"}','qiaodan.asia'),
 ('Bmai','{bmai,"bi mai"}','bmai.com.cn'),
 ('Dynafish','{dynafish,"dyna fish"}','dynafish.us'),
 ('Do-Win','{do-win,dowin,"do win",duowei}','dowin.com.cn'),
 ('Runsifly','{runsifly,"runs i fly"}','runsifly.com'),
 ('Peak','{peak,"peak sport"}','peaksport.com'),
 ('Kailas','{kailas}','kailasgear.com')
ON CONFLICT ("name") DO UPDATE SET "aliases" = EXCLUDED."aliases", "domain" = EXCLUDED."domain";
