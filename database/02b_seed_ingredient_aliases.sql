-- Seed Data: Ingredient Aliases
-- This script populates the ingredient_aliases table with alternative names,
-- abbreviations, regional variations, brand names, and Hindi transliterations
-- for common baking ingredients

-- Disable triggers temporarily for faster insertion
ALTER TABLE ingredient_aliases DISABLE TRIGGER ALL;

-- Clear existing data (if any)
DELETE FROM ingredient_aliases;

-- Insert ingredient aliases
-- Format: (ingredient_master_id, alias_name, alias_type, locale)
-- Note: ingredient_master_id will be resolved via subquery using ingredient name

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
SELECT im.id, alias_name, alias_type, locale FROM (
  VALUES
  -- FLOUR ALIASES
  -- All-purpose flour
  ((SELECT id FROM ingredient_master WHERE name = 'all-purpose flour'), 'AP flour', 'abbreviation', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'all-purpose flour'), 'APF', 'abbreviation', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'all-purpose flour'), 'plain flour', 'regional', 'en-GB'),
  ((SELECT id FROM ingredient_master WHERE name = 'all-purpose flour'), 'maida', 'regional', 'hi-IN'),
  ((SELECT id FROM ingredient_master WHERE name = 'all-purpose flour'), 'refined flour', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'all-purpose flour'), 'white flour', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'all-purpose flour'), 'मैदा', 'regional', 'hi-IN'),
  
  -- Bread flour
  ((SELECT id FROM ingredient_master WHERE name = 'bread flour'), 'strong flour', 'regional', 'en-GB'),
  ((SELECT id FROM ingredient_master WHERE name = 'bread flour'), 'high protein flour', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'bread flour'), 'bread making flour', 'common', 'en'),
  
  -- Cake flour
  ((SELECT id FROM ingredient_master WHERE name = 'cake flour'), 'soft flour', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'cake flour'), 'pastry flour', 'regional', 'en-US'),
  
  -- Whole wheat flour
  ((SELECT id FROM ingredient_master WHERE name = 'whole wheat flour'), 'wholemeal flour', 'regional', 'en-GB'),
  ((SELECT id FROM ingredient_master WHERE name = 'whole wheat flour'), 'atta', 'regional', 'hi-IN'),
  ((SELECT id FROM ingredient_master WHERE name = 'whole wheat flour'), 'whole meal', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'whole wheat flour'), 'brown flour', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'whole wheat flour'), 'आटा', 'regional', 'hi-IN'),
  
  -- Maida (already in master, but adding aliases)
  ((SELECT id FROM ingredient_master WHERE name = 'maida'), 'refined flour', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'maida'), 'all-purpose flour', 'regional', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'maida'), 'plain flour', 'regional', 'en-GB'),
  
  -- Atta (already in master, but adding aliases)
  ((SELECT id FROM ingredient_master WHERE name = 'atta'), 'whole wheat flour', 'regional', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'atta'), 'wholemeal flour', 'regional', 'en-GB'),
  ((SELECT id FROM ingredient_master WHERE name = 'atta'), 'chapati flour', 'common', 'en'),
  
  -- Besan
  ((SELECT id FROM ingredient_master WHERE name = 'besan'), 'gram flour', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'besan'), 'chickpea flour', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'besan'), 'chick pea flour', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'besan'), 'bengal gram flour', 'regional', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'besan'), 'बेसन', 'regional', 'hi-IN'),
  
  -- Sooji
  ((SELECT id FROM ingredient_master WHERE name = 'sooji'), 'semolina', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'sooji'), 'suji', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'sooji'), 'rava', 'regional', 'hi-IN'),
  ((SELECT id FROM ingredient_master WHERE name = 'sooji'), 'सूजी', 'regional', 'hi-IN'),
  
  -- Rice flour
  ((SELECT id FROM ingredient_master WHERE name = 'rice flour'), 'rice powder', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'rice flour'), 'ground rice', 'common', 'en'),
  
  -- Cornstarch
  ((SELECT id FROM ingredient_master WHERE name = 'cornstarch'), 'corn flour', 'regional', 'en-GB'),
  ((SELECT id FROM ingredient_master WHERE name = 'cornstarch'), 'maize starch', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'cornstarch'), 'cornflour', 'common', 'en'),
  
  -- FAT ALIASES
  -- Butter
  ((SELECT id FROM ingredient_master WHERE name = 'butter'), 'unsalted butter', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'butter'), 'salted butter', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'butter'), 'sweet butter', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'butter'), 'मक्खन', 'regional', 'hi-IN'),
  
  -- Ghee
  ((SELECT id FROM ingredient_master WHERE name = 'ghee'), 'clarified butter', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'ghee'), 'pure ghee', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'ghee'), 'घी', 'regional', 'hi-IN'),
  
  -- Desi ghee
  ((SELECT id FROM ingredient_master WHERE name = 'desi ghee'), 'desi clarified butter', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'desi ghee'), 'देसी घी', 'regional', 'hi-IN'),
  ((SELECT id FROM ingredient_master WHERE name = 'desi ghee'), 'ghee', 'common', 'en'),
  
  -- Vegetable oil
  ((SELECT id FROM ingredient_master WHERE name = 'vegetable oil'), 'cooking oil', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'vegetable oil'), 'neutral oil', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'vegetable oil'), 'oil', 'common', 'en'),
  
  -- Coconut oil
  ((SELECT id FROM ingredient_master WHERE name = 'coconut oil'), 'virgin coconut oil', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'coconut oil'), 'VCO', 'abbreviation', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'coconut oil'), 'नारियल का तेल', 'regional', 'hi-IN'),
  
  -- Olive oil
  ((SELECT id FROM ingredient_master WHERE name = 'olive oil'), 'extra virgin olive oil', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'olive oil'), 'EVOO', 'abbreviation', 'en'),
  
  -- Shortening
  ((SELECT id FROM ingredient_master WHERE name = 'shortening'), 'vegetable shortening', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'shortening'), 'baking shortening', 'common', 'en'),
  
  -- Mawa
  ((SELECT id FROM ingredient_master WHERE name = 'mawa'), 'khoya', 'regional', 'hi-IN'),
  ((SELECT id FROM ingredient_master WHERE name = 'mawa'), 'dried milk solids', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'mawa'), 'मावा', 'regional', 'hi-IN'),
  ((SELECT id FROM ingredient_master WHERE name = 'mawa'), 'खोया', 'regional', 'hi-IN'),
  
  -- SUGAR ALIASES
  -- Granulated sugar
  ((SELECT id FROM ingredient_master WHERE name = 'granulated sugar'), 'white sugar', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'granulated sugar'), 'caster sugar', 'regional', 'en-GB'),
  ((SELECT id FROM ingredient_master WHERE name = 'granulated sugar'), 'superfine sugar', 'regional', 'en-US'),
  ((SELECT id FROM ingredient_master WHERE name = 'granulated sugar'), 'sugar', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'granulated sugar'), 'चीनी', 'regional', 'hi-IN'),
  
  -- Brown sugar
  ((SELECT id FROM ingredient_master WHERE name = 'brown sugar'), 'soft brown sugar', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'brown sugar'), 'muscovado sugar', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'brown sugar'), 'dark brown sugar', 'common', 'en'),
  
  -- Powdered sugar
  ((SELECT id FROM ingredient_master WHERE name = 'powdered sugar'), 'icing sugar', 'regional', 'en-GB'),
  ((SELECT id FROM ingredient_master WHERE name = 'powdered sugar'), 'confectioners sugar', 'regional', 'en-US'),
  ((SELECT id FROM ingredient_master WHERE name = 'powdered sugar'), 'icing powder', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'powdered sugar'), 'powdered icing sugar', 'common', 'en'),
  
  -- Honey
  ((SELECT id FROM ingredient_master WHERE name = 'honey'), 'raw honey', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'honey'), 'pure honey', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'honey'), 'शहद', 'regional', 'hi-IN'),
  
  -- Jaggery
  ((SELECT id FROM ingredient_master WHERE name = 'jaggery'), 'gur', 'regional', 'hi-IN'),
  ((SELECT id FROM ingredient_master WHERE name = 'jaggery'), 'unrefined sugar', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'jaggery'), 'गुड़', 'regional', 'hi-IN'),
  
  -- Molasses
  ((SELECT id FROM ingredient_master WHERE name = 'molasses'), 'blackstrap molasses', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'molasses'), 'treacle', 'regional', 'en-GB'),
  
  -- LEAVENING ALIASES
  -- Baking powder
  ((SELECT id FROM ingredient_master WHERE name = 'baking powder'), 'BP', 'abbreviation', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'baking powder'), 'double acting baking powder', 'common', 'en'),
  
  -- Baking soda
  ((SELECT id FROM ingredient_master WHERE name = 'baking soda'), 'bicarbonate of soda', 'regional', 'en-GB'),
  ((SELECT id FROM ingredient_master WHERE name = 'baking soda'), 'sodium bicarbonate', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'baking soda'), 'BS', 'abbreviation', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'baking soda'), 'मीठा सोडा', 'regional', 'hi-IN'),
  
  -- Instant yeast
  ((SELECT id FROM ingredient_master WHERE name = 'instant yeast'), 'rapid rise yeast', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'instant yeast'), 'bread machine yeast', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'instant yeast'), 'SAF yeast', 'brand', 'en'),
  
  -- Active dry yeast
  ((SELECT id FROM ingredient_master WHERE name = 'active dry yeast'), 'dry yeast', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'active dry yeast'), 'ADY', 'abbreviation', 'en'),
  
  -- Cream of tartar
  ((SELECT id FROM ingredient_master WHERE name = 'cream of tartar'), 'potassium bitartrate', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'cream of tartar'), 'tartar', 'common', 'en'),
  
  -- DAIRY ALIASES
  -- Milk
  ((SELECT id FROM ingredient_master WHERE name = 'milk'), 'whole milk', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'milk'), 'fresh milk', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'milk'), 'दूध', 'regional', 'hi-IN'),
  
  -- Buttermilk
  ((SELECT id FROM ingredient_master WHERE name = 'buttermilk'), 'cultured buttermilk', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'buttermilk'), 'छाछ', 'regional', 'hi-IN'),
  
  -- Yogurt
  ((SELECT id FROM ingredient_master WHERE name = 'yogurt'), 'curd', 'regional', 'hi-IN'),
  ((SELECT id FROM ingredient_master WHERE name = 'yogurt'), 'plain yogurt', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'yogurt'), 'दही', 'regional', 'hi-IN'),
  
  -- Sour cream
  ((SELECT id FROM ingredient_master WHERE name = 'sour cream'), 'soured cream', 'regional', 'en-GB'),
  
  -- Cream cheese
  ((SELECT id FROM ingredient_master WHERE name = 'cream cheese'), 'Philadelphia cream cheese', 'brand', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'cream cheese'), 'soft cheese', 'common', 'en'),
  
  -- Paneer
  ((SELECT id FROM ingredient_master WHERE name = 'paneer'), 'cottage cheese', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'paneer'), 'Indian cheese', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'paneer'), 'पनीर', 'regional', 'hi-IN'),
  
  -- Khoya
  ((SELECT id FROM ingredient_master WHERE name = 'khoya'), 'mawa', 'regional', 'hi-IN'),
  ((SELECT id FROM ingredient_master WHERE name = 'khoya'), 'dried milk solids', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'khoya'), 'खोया', 'regional', 'hi-IN'),
  
  -- Condensed milk
  ((SELECT id FROM ingredient_master WHERE name = 'condensed milk'), 'sweetened condensed milk', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'condensed milk'), 'SCM', 'abbreviation', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'condensed milk'), 'मीठा दूध', 'regional', 'hi-IN'),
  
  -- Egg
  ((SELECT id FROM ingredient_master WHERE name = 'egg'), 'large egg', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'egg'), 'अंडा', 'regional', 'hi-IN'),
  
  -- LIQUID ALIASES
  -- Water
  ((SELECT id FROM ingredient_master WHERE name = 'water'), 'filtered water', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'water'), 'पानी', 'regional', 'hi-IN'),
  
  -- Apple juice
  ((SELECT id FROM ingredient_master WHERE name = 'apple juice'), 'fresh apple juice', 'common', 'en'),
  
  -- Orange juice
  ((SELECT id FROM ingredient_master WHERE name = 'orange juice'), 'fresh orange juice', 'common', 'en'),
  
  -- Lemon juice
  ((SELECT id FROM ingredient_master WHERE name = 'lemon juice'), 'fresh lemon juice', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'lemon juice'), 'नींबू का रस', 'regional', 'hi-IN'),
  
  -- Rose water
  ((SELECT id FROM ingredient_master WHERE name = 'rose water'), 'gulab jal', 'regional', 'hi-IN'),
  ((SELECT id FROM ingredient_master WHERE name = 'rose water'), 'rose essence', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'rose water'), 'गुलाब जल', 'regional', 'hi-IN'),
  
  -- NUT ALIASES
  -- Almond flour
  ((SELECT id FROM ingredient_master WHERE name = 'almond flour'), 'ground almonds', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'almond flour'), 'almond meal', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'almond flour'), 'बादाम का आटा', 'regional', 'hi-IN'),
  
  -- Almond
  ((SELECT id FROM ingredient_master WHERE name = 'almond'), 'almonds', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'almond'), 'बादाम', 'regional', 'hi-IN'),
  
  -- Walnut
  ((SELECT id FROM ingredient_master WHERE name = 'walnut'), 'walnuts', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'walnut'), 'अखरोट', 'regional', 'hi-IN'),
  
  -- Cashew
  ((SELECT id FROM ingredient_master WHERE name = 'cashew'), 'cashews', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'cashew'), 'काजू', 'regional', 'hi-IN'),
  
  -- Peanut
  ((SELECT id FROM ingredient_master WHERE name = 'peanut'), 'peanuts', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'peanut'), 'groundnut', 'regional', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'peanut'), 'मूंगफली', 'regional', 'hi-IN'),
  
  -- Coconut
  ((SELECT id FROM ingredient_master WHERE name = 'coconut'), 'shredded coconut', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'coconut'), 'desiccated coconut', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'coconut'), 'नारियल', 'regional', 'hi-IN'),
  
  -- SPICE ALIASES
  -- Cardamom
  ((SELECT id FROM ingredient_master WHERE name = 'cardamom'), 'elaichi', 'regional', 'hi-IN'),
  ((SELECT id FROM ingredient_master WHERE name = 'cardamom'), 'green cardamom', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'cardamom'), 'इलायची', 'regional', 'hi-IN'),
  
  -- Cinnamon
  ((SELECT id FROM ingredient_master WHERE name = 'cinnamon'), 'dalchini', 'regional', 'hi-IN'),
  ((SELECT id FROM ingredient_master WHERE name = 'cinnamon'), 'ground cinnamon', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'cinnamon'), 'दालचीनी', 'regional', 'hi-IN'),
  
  -- Vanilla extract
  ((SELECT id FROM ingredient_master WHERE name = 'vanilla extract'), 'pure vanilla extract', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'vanilla extract'), 'vanilla essence', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'vanilla extract'), 'वनीला', 'regional', 'hi-IN'),
  
  -- Saffron
  ((SELECT id FROM ingredient_master WHERE name = 'saffron'), 'kesar', 'regional', 'hi-IN'),
  ((SELECT id FROM ingredient_master WHERE name = 'saffron'), 'zafran', 'regional', 'hi-IN'),
  ((SELECT id FROM ingredient_master WHERE name = 'saffron'), 'केसर', 'regional', 'hi-IN'),
  ((SELECT id FROM ingredient_master WHERE name = 'saffron'), 'ज़ाफ़रान', 'regional', 'hi-IN'),
  
  -- Nutmeg
  ((SELECT id FROM ingredient_master WHERE name = 'nutmeg'), 'jaiphal', 'regional', 'hi-IN'),
  ((SELECT id FROM ingredient_master WHERE name = 'nutmeg'), 'ground nutmeg', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'nutmeg'), 'जायफल', 'regional', 'hi-IN'),
  
  -- Ginger powder
  ((SELECT id FROM ingredient_master WHERE name = 'ginger powder'), 'dried ginger', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'ginger powder'), 'sonth', 'regional', 'hi-IN'),
  ((SELECT id FROM ingredient_master WHERE name = 'ginger powder'), 'सोंठ', 'regional', 'hi-IN'),
  
  -- Turmeric
  ((SELECT id FROM ingredient_master WHERE name = 'turmeric'), 'haldi', 'regional', 'hi-IN'),
  ((SELECT id FROM ingredient_master WHERE name = 'turmeric'), 'turmeric powder', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'turmeric'), 'हल्दी', 'regional', 'hi-IN'),
  
  -- Clove
  ((SELECT id FROM ingredient_master WHERE name = 'clove'), 'laung', 'regional', 'hi-IN'),
  ((SELECT id FROM ingredient_master WHERE name = 'clove'), 'cloves', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'clove'), 'लौंग', 'regional', 'hi-IN'),
  
  -- Black pepper
  ((SELECT id FROM ingredient_master WHERE name = 'black pepper'), 'kali mirch', 'regional', 'hi-IN'),
  ((SELECT id FROM ingredient_master WHERE name = 'black pepper'), 'ground black pepper', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'black pepper'), 'काली मिर्च', 'regional', 'hi-IN'),
  
  -- Salt
  ((SELECT id FROM ingredient_master WHERE name = 'salt'), 'table salt', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'salt'), 'sea salt', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'salt'), 'नमक', 'regional', 'hi-IN'),
  
  -- Baking chocolate
  ((SELECT id FROM ingredient_master WHERE name = 'baking chocolate'), 'unsweetened chocolate', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'baking chocolate'), 'dark chocolate', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'baking chocolate'), 'चॉकलेट', 'regional', 'hi-IN'),
  
  -- Cocoa powder
  ((SELECT id FROM ingredient_master WHERE name = 'cocoa powder'), 'unsweetened cocoa powder', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'cocoa powder'), 'dutch cocoa', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'cocoa powder'), 'कोको पाउडर', 'regional', 'hi-IN'),
  
  -- FRUIT ALIASES
  -- Raisin
  ((SELECT id FROM ingredient_master WHERE name = 'raisin'), 'dried grapes', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'raisin'), 'किशमिश', 'regional', 'hi-IN'),
  
  -- Date
  ((SELECT id FROM ingredient_master WHERE name = 'date'), 'dates', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'date'), 'खजूर', 'regional', 'hi-IN'),
  
  -- Banana
  ((SELECT id FROM ingredient_master WHERE name = 'banana'), 'bananas', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'banana'), 'केला', 'regional', 'hi-IN'),
  
  -- Apple
  ((SELECT id FROM ingredient_master WHERE name = 'apple'), 'apples', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'apple'), 'सेब', 'regional', 'hi-IN'),
  
  -- Blueberry
  ((SELECT id FROM ingredient_master WHERE name = 'blueberry'), 'blueberries', 'common', 'en'),
  
  -- Strawberry
  ((SELECT id FROM ingredient_master WHERE name = 'strawberry'), 'strawberries', 'common', 'en'),
  
  -- Cranberry
  ((SELECT id FROM ingredient_master WHERE name = 'cranberry'), 'cranberries', 'common', 'en'),
  
  -- Lemon
  ((SELECT id FROM ingredient_master WHERE name = 'lemon'), 'lemons', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'lemon'), 'नींबू', 'regional', 'hi-IN'),
  
  -- OTHER ALIASES
  -- Vanilla bean
  ((SELECT id FROM ingredient_master WHERE name = 'vanilla bean'), 'vanilla pod', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'vanilla bean'), 'vanilla beans', 'common', 'en'),
  
  -- Gelatin
  ((SELECT id FROM ingredient_master WHERE name = 'gelatin'), 'powdered gelatin', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'gelatin'), 'gelatin powder', 'common', 'en'),
  
  -- Cornmeal
  ((SELECT id FROM ingredient_master WHERE name = 'cornmeal'), 'polenta', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'cornmeal'), 'corn meal', 'common', 'en'),
  
  -- Tapioca starch
  ((SELECT id FROM ingredient_master WHERE name = 'tapioca starch'), 'tapioca flour', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'tapioca starch'), 'tapioca powder', 'common', 'en'),
  ((SELECT id FROM ingredient_master WHERE name = 'tapioca starch'), 'sabudana', 'regional', 'hi-IN'),
  ((SELECT id FROM ingredient_master WHERE name = 'tapioca starch'), 'साबूदाना', 'regional', 'hi-IN')
) AS alias_data(ingredient_id, alias_name, alias_type, locale)
JOIN ingredient_master im ON im.id = alias_data.ingredient_id;

-- Re-enable triggers
ALTER TABLE ingredient_aliases ENABLE TRIGGER ALL;

-- Verify insertion
SELECT COUNT(*) as total_aliases FROM ingredient_aliases;

-- Display sample aliases for verification
SELECT 
  im.name as ingredient_name,
  ia.alias_name,
  ia.alias_type,
  ia.locale
FROM ingredient_aliases ia
JOIN ingredient_master im ON im.id = ia.ingredient_master_id
ORDER BY im.name, ia.alias_type, ia.locale
LIMIT 50;
