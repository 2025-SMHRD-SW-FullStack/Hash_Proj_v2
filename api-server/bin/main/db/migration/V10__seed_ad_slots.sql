-- MAIN_ROLLING 1~10 (category = NULL)
INSERT IGNORE INTO ad_slots(type, position, category) VALUES
('MAIN_ROLLING',1,NULL),('MAIN_ROLLING',2,NULL),('MAIN_ROLLING',3,NULL),('MAIN_ROLLING',4,NULL),
('MAIN_ROLLING',5,NULL),('MAIN_ROLLING',6,NULL),('MAIN_ROLLING',7,NULL),('MAIN_ROLLING',8,NULL),
('MAIN_ROLLING',9,NULL),('MAIN_ROLLING',10,NULL);

-- MAIN_SIDE 1~3
INSERT IGNORE INTO ad_slots(type, position, category) VALUES
('MAIN_SIDE',1,NULL),('MAIN_SIDE',2,NULL),('MAIN_SIDE',3,NULL);

-- CATEGORY_TOP 각 1~5
INSERT IGNORE INTO ad_slots(type, position, category) VALUES
('CATEGORY_TOP',1,'beauty'),('CATEGORY_TOP',2,'beauty'),('CATEGORY_TOP',3,'beauty'),('CATEGORY_TOP',4,'beauty'),('CATEGORY_TOP',5,'beauty'),
('CATEGORY_TOP',1,'electronics'),('CATEGORY_TOP',2,'electronics'),('CATEGORY_TOP',3,'electronics'),('CATEGORY_TOP',4,'electronics'),('CATEGORY_TOP',5,'electronics'),
('CATEGORY_TOP',1,'meal-kit'),('CATEGORY_TOP',2,'meal-kit'),('CATEGORY_TOP',3,'meal-kit'),('CATEGORY_TOP',4,'meal-kit'),('CATEGORY_TOP',5,'meal-kit'),
('CATEGORY_TOP',1,'platform'),('CATEGORY_TOP',2,'platform'),('CATEGORY_TOP',3,'platform'),('CATEGORY_TOP',4,'platform'),('CATEGORY_TOP',5,'platform');
