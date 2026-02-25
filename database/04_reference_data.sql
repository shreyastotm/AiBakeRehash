-- Reference Data Seed Script
-- Seeds common_issues and water_activity_reference tables
-- Requirements: 14.2, 15.5, 75.5

-- ============================================================================
-- COMMON ISSUES TABLE - Emergency Help Database
-- ============================================================================
-- Seed common baking problems with solutions and prevention tips

INSERT INTO common_issues (issue_type, symptoms, solution, prevention_tip) VALUES

-- Cookies Issues
('flat_cookies', 
 'Cookies spread too much and become thin and crispy instead of chewy',
 'Chill dough for at least 30 minutes before baking. Use less butter or increase flour slightly. Ensure oven temperature is accurate (use oven thermometer). Reduce baking soda/powder by 1/4 tsp.',
 'Always chill cookie dough before baking. Use room temperature ingredients. Measure flour by weight, not volume. Verify oven temperature with a thermometer.'),

('dense_cookies',
 'Cookies are hard, dense, and cake-like instead of tender',
 'Reduce mixing time - overmixing develops gluten. Use less flour (measure by weight). Add 1 tbsp of liquid (milk/water). Reduce baking time by 1-2 minutes. Use brown sugar instead of white sugar.',
 'Mix dough just until combined. Do not overmix. Use correct flour measurement. Use a combination of white and brown sugar for moisture.'),

('crumbly_cookies',
 'Cookies fall apart or crumble when removed from baking sheet',
 'Add 1-2 tbsp of liquid (egg, milk, or water). Increase butter slightly. Reduce baking time - cookies should be slightly underbaked. Use more brown sugar for moisture.',
 'Ensure adequate fat and moisture in dough. Do not overbake. Remove cookies from oven when edges are set but center is still soft.'),

('burnt_edges',
 'Cookie edges are dark brown or black while centers are underbaked',
 'Lower oven temperature by 25°F. Reduce baking time. Use parchment paper or silicone mat. Rotate baking sheet halfway through. Use lighter colored baking sheets.',
 'Verify oven temperature accuracy. Use parchment paper. Rotate sheet halfway through baking. Use aluminum baking sheets (not dark ones).'),

-- Bread Issues
('dense_bread',
 'Bread is heavy, compact, and does not rise properly',
 'Check yeast expiration date and viability (proof yeast in warm water). Increase kneading time to develop gluten. Ensure proper rise time (dough should double). Use bread flour instead of all-purpose. Check water temperature (should be 110°F/43°C).',
 'Use fresh yeast. Knead dough adequately (8-10 minutes by hand). Allow proper rise time. Use bread flour for better gluten development. Maintain correct water temperature.'),

('gummy_bread',
 'Bread interior is wet, sticky, and undercooked despite baking',
 'Increase baking time by 5-10 minutes. Lower oven temperature by 25°F and bake longer. Ensure oven is preheated fully. Use instant yeast instead of active dry. Reduce water slightly.',
 'Bake until internal temperature reaches 190-210°F. Preheat oven fully. Use instant yeast for faster fermentation. Do not add excess water.'),

('bread_not_rising',
 'Bread does not rise during proofing or in oven',
 'Check yeast expiration and viability. Ensure water temperature is correct (110°F/43°C). Increase rise time. Use warmer environment for proofing. Add 1 tsp sugar to activate yeast.',
 'Use fresh yeast. Maintain correct water temperature. Proof in warm, draft-free location. Allow adequate rise time (1-2 hours).'),

-- Cake Issues
('cracked_cakes',
 'Cake surface has large cracks or splits during baking',
 'Lower oven temperature by 25°F. Reduce baking time. Use less baking soda/powder. Ensure oven is not too hot. Do not open oven door during first 25 minutes.',
 'Verify oven temperature. Do not overbake. Use correct leavening amounts. Avoid opening oven door during baking. Use room temperature ingredients.'),

('sunken_center',
 'Cake center sinks or collapses after baking',
 'Reduce baking soda/powder by 1/4 tsp. Reduce sugar slightly. Ensure oven temperature is accurate. Bake longer at lower temperature. Do not open oven door early.',
 'Use correct leavening amounts. Verify oven temperature. Do not overbake. Avoid opening oven door during baking. Use room temperature ingredients.'),

('dry_cake',
 'Cake is dry, crumbly, and lacks moisture',
 'Reduce baking time by 2-3 minutes. Add 1-2 tbsp of liquid (milk, oil, or applesauce). Use oil instead of butter (oil keeps cakes moister). Add sour cream or yogurt. Brush cake with simple syrup after baking.',
 'Do not overbake. Use oil for moisture. Add sour cream or yogurt to batter. Brush with simple syrup. Store in airtight container with bread slice.'),

-- Pastry Issues
('soggy_bottoms',
 'Pastry bottom crust is wet, soggy, and undercooked',
 'Preheat baking sheet in oven. Place pie on preheated sheet. Bake on lowest oven rack. Increase oven temperature by 25°F. Reduce filling moisture by cooking filling first.',
 'Preheat baking sheet. Bake on lowest rack. Use precooked filling. Brush crust with egg wash or oil to seal. Ensure oven temperature is accurate.'),

('tough_pastry',
 'Pastry crust is hard, tough, and difficult to bite',
 'Use less water - add just enough to bring dough together. Do not overwork dough. Use cold butter and keep dough cold. Reduce kneading/mixing time. Use pastry flour instead of all-purpose.',
 'Minimize mixing and handling. Keep all ingredients cold. Use cold water. Chill dough before rolling. Use pastry flour for tender crust.'),

('shrinking_pastry',
 'Pastry shrinks significantly during baking, reducing size',
 'Chill dough for at least 30 minutes before rolling. Do not stretch dough when placing in pan. Let dough rest 15 minutes after rolling. Use less water in dough. Prick bottom with fork.',
 'Chill dough adequately. Do not stretch when placing in pan. Let dough rest after rolling. Prick bottom to prevent puffing. Use correct water amount.');

-- ============================================================================
-- WATER ACTIVITY REFERENCE TABLE
-- ============================================================================
-- Seed typical water activity ranges for different product categories
-- Used for shelf life prediction and food safety

INSERT INTO water_activity_reference (product_category, typical_aw_min, typical_aw_max, shelf_life_days) VALUES

-- Crackers - Very low water activity, long shelf life
('crackers', 0.30, 0.45, 180),

-- Cookies - Low to moderate water activity
('cookies', 0.40, 0.65, 90),

-- Cakes - Moderate water activity
('cakes', 0.60, 0.75, 14),

-- Breads - Higher water activity, shorter shelf life
('breads', 0.70, 0.85, 7),

-- Pastries - Moderate to high water activity
('pastries', 0.55, 0.75, 21),

-- Confections - Variable depending on type
('confections', 0.35, 0.70, 60),

-- Donuts - Moderate water activity
('donuts', 0.65, 0.80, 3),

-- Brownies - Moderate water activity
('brownies', 0.60, 0.75, 14),

-- Muffins - Moderate to high water activity
('muffins', 0.65, 0.80, 7),

-- Biscuits - Low to moderate water activity
('biscuits', 0.45, 0.65, 60),

-- Scones - Moderate water activity
('scones', 0.60, 0.75, 3),

-- Macarons - Very low water activity
('macarons', 0.25, 0.40, 90),

-- Meringues - Very low water activity
('meringues', 0.20, 0.35, 180),

-- Tarts - Moderate water activity
('tarts', 0.55, 0.75, 14),

-- Cheesecake - High water activity
('cheesecake', 0.75, 0.90, 7),

-- Brownies/Fudge - Low to moderate water activity
('fudge', 0.35, 0.55, 90),

-- Granola - Very low water activity
('granola', 0.30, 0.45, 120),

-- Bread pudding - High water activity
('bread_pudding', 0.80, 0.95, 3),

-- Custard tarts - High water activity
('custard_tarts', 0.75, 0.90, 2),

-- Soufflé - High water activity
('souffle', 0.80, 0.95, 1);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Uncomment to verify data was inserted correctly

-- SELECT COUNT(*) as common_issues_count FROM common_issues;
-- SELECT COUNT(*) as water_activity_count FROM water_activity_reference;
-- SELECT * FROM common_issues ORDER BY issue_type;
-- SELECT * FROM water_activity_reference ORDER BY product_category;
