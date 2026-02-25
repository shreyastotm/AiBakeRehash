-- Seed Data: Ingredient Aliases
-- Alternative names, abbreviations, regional variations, and Hindi transliterations
-- Uses ON CONFLICT to skip duplicates (some ingredients share alias names)

-- Clear existing aliases
DELETE FROM ingredient_aliases;

-- Helper: insert alias with conflict handling
-- If alias_name already exists, skip it (first-come wins)

-- FLOUR ALIASES
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'AP flour', 'abbreviation', 'en' FROM ingredient_master WHERE name = 'all-purpose flour'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'APF', 'abbreviation', 'en' FROM ingredient_master WHERE name = 'all-purpose flour'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'plain flour', 'regional', 'en-GB' FROM ingredient_master WHERE name = 'all-purpose flour'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'refined flour', 'common', 'en' FROM ingredient_master WHERE name = 'all-purpose flour'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'white flour', 'common', 'en' FROM ingredient_master WHERE name = 'all-purpose flour'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'मैदा', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'all-purpose flour'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'strong flour', 'regional', 'en-GB' FROM ingredient_master WHERE name = 'bread flour'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'high protein flour', 'common', 'en' FROM ingredient_master WHERE name = 'bread flour'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'soft flour', 'common', 'en' FROM ingredient_master WHERE name = 'cake flour'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'pastry flour', 'regional', 'en-US' FROM ingredient_master WHERE name = 'cake flour'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'wholemeal flour', 'regional', 'en-GB' FROM ingredient_master WHERE name = 'whole wheat flour'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'whole meal', 'common', 'en' FROM ingredient_master WHERE name = 'whole wheat flour'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'brown flour', 'common', 'en' FROM ingredient_master WHERE name = 'whole wheat flour'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'आटा', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'whole wheat flour'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'chapati flour', 'common', 'en' FROM ingredient_master WHERE name = 'atta'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'gram flour', 'common', 'en' FROM ingredient_master WHERE name = 'besan'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'chickpea flour', 'common', 'en' FROM ingredient_master WHERE name = 'besan'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'bengal gram flour', 'regional', 'en' FROM ingredient_master WHERE name = 'besan'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'बेसन', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'besan'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'semolina', 'common', 'en' FROM ingredient_master WHERE name = 'sooji'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'suji', 'common', 'en' FROM ingredient_master WHERE name = 'sooji'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'rava', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'sooji'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'सूजी', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'sooji'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'rice powder', 'common', 'en' FROM ingredient_master WHERE name = 'rice flour'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'ground rice', 'common', 'en' FROM ingredient_master WHERE name = 'rice flour'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'corn flour', 'regional', 'en-GB' FROM ingredient_master WHERE name = 'cornstarch'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'maize starch', 'common', 'en' FROM ingredient_master WHERE name = 'cornstarch'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'cornflour', 'common', 'en' FROM ingredient_master WHERE name = 'cornstarch'
  ON CONFLICT (alias_name) DO NOTHING;

-- FAT ALIASES
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'unsalted butter', 'common', 'en' FROM ingredient_master WHERE name = 'butter'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'salted butter', 'common', 'en' FROM ingredient_master WHERE name = 'butter'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'मक्खन', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'butter'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'clarified butter', 'common', 'en' FROM ingredient_master WHERE name = 'ghee'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'pure ghee', 'common', 'en' FROM ingredient_master WHERE name = 'ghee'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'घी', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'ghee'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'देसी घी', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'desi ghee'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'cooking oil', 'common', 'en' FROM ingredient_master WHERE name = 'vegetable oil'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'neutral oil', 'common', 'en' FROM ingredient_master WHERE name = 'vegetable oil'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'virgin coconut oil', 'common', 'en' FROM ingredient_master WHERE name = 'coconut oil'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'VCO', 'abbreviation', 'en' FROM ingredient_master WHERE name = 'coconut oil'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'नारियल का तेल', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'coconut oil'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'extra virgin olive oil', 'common', 'en' FROM ingredient_master WHERE name = 'olive oil'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'EVOO', 'abbreviation', 'en' FROM ingredient_master WHERE name = 'olive oil'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'dried milk solids', 'common', 'en' FROM ingredient_master WHERE name = 'mawa'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'मावा', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'mawa'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'खोया', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'mawa'
  ON CONFLICT (alias_name) DO NOTHING;

-- SUGAR ALIASES
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'white sugar', 'common', 'en' FROM ingredient_master WHERE name = 'granulated sugar'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'caster sugar', 'regional', 'en-GB' FROM ingredient_master WHERE name = 'granulated sugar'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'sugar', 'common', 'en' FROM ingredient_master WHERE name = 'granulated sugar'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'चीनी', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'granulated sugar'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'dark brown sugar', 'common', 'en' FROM ingredient_master WHERE name = 'brown sugar'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'muscovado sugar', 'common', 'en' FROM ingredient_master WHERE name = 'brown sugar'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'icing sugar', 'regional', 'en-GB' FROM ingredient_master WHERE name = 'powdered sugar'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'confectioners sugar', 'regional', 'en-US' FROM ingredient_master WHERE name = 'powdered sugar'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'शहद', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'honey'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'gur', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'jaggery'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'गुड़', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'jaggery'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'treacle', 'regional', 'en-GB' FROM ingredient_master WHERE name = 'molasses'
  ON CONFLICT (alias_name) DO NOTHING;

-- LEAVENING ALIASES
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'bicarbonate of soda', 'regional', 'en-GB' FROM ingredient_master WHERE name = 'baking soda'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'मीठा सोडा', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'baking soda'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'rapid rise yeast', 'common', 'en' FROM ingredient_master WHERE name = 'instant yeast'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'SAF yeast', 'brand', 'en' FROM ingredient_master WHERE name = 'instant yeast'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'dry yeast', 'common', 'en' FROM ingredient_master WHERE name = 'active dry yeast'
  ON CONFLICT (alias_name) DO NOTHING;

-- DAIRY ALIASES
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'whole milk', 'common', 'en' FROM ingredient_master WHERE name = 'milk'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'दूध', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'milk'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'छाछ', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'buttermilk'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'curd', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'yogurt'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'दही', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'yogurt'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'पनीर', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'paneer'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'cottage cheese', 'common', 'en' FROM ingredient_master WHERE name = 'paneer'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'sweetened condensed milk', 'common', 'en' FROM ingredient_master WHERE name = 'condensed milk'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'large egg', 'common', 'en' FROM ingredient_master WHERE name = 'egg'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'अंडा', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'egg'
  ON CONFLICT (alias_name) DO NOTHING;

-- SPICE ALIASES
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'elaichi', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'cardamom'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'इलायची', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'cardamom'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'dalchini', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'cinnamon'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'दालचीनी', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'cinnamon'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'vanilla essence', 'common', 'en' FROM ingredient_master WHERE name = 'vanilla extract'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'kesar', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'saffron'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'केसर', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'saffron'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'jaiphal', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'nutmeg'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'जायफल', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'nutmeg'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'sonth', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'ginger powder'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'सोंठ', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'ginger powder'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'haldi', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'turmeric'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'हल्दी', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'turmeric'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'laung', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'clove'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'लौंग', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'clove'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'kali mirch', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'black pepper'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'काली मिर्च', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'black pepper'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'नमक', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'salt'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'sea salt', 'common', 'en' FROM ingredient_master WHERE name = 'salt'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'dark chocolate', 'common', 'en' FROM ingredient_master WHERE name = 'baking chocolate'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'unsweetened cocoa', 'common', 'en' FROM ingredient_master WHERE name = 'cocoa powder'
  ON CONFLICT (alias_name) DO NOTHING;

-- NUT ALIASES
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'ground almonds', 'common', 'en' FROM ingredient_master WHERE name = 'almond flour'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'almond meal', 'common', 'en' FROM ingredient_master WHERE name = 'almond flour'
  ON CONFLICT (alias_name) DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'बादाम', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'almond'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'काजू', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'cashew'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'अखरोट', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'walnut'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'मूंगफली', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'peanut'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'groundnut', 'regional', 'en' FROM ingredient_master WHERE name = 'peanut'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'desiccated coconut', 'common', 'en' FROM ingredient_master WHERE name = 'coconut'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'नारियल', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'coconut'
  ON CONFLICT (alias_name) DO NOTHING;

-- FRUIT ALIASES
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'किशमिश', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'raisin'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'खजूर', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'date'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'केला', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'banana'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'सेब', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'apple'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'नींबू', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'lemon'
  ON CONFLICT (alias_name) DO NOTHING;

-- LIQUID ALIASES
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'पानी', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'water'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'gulab jal', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'rose water'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'गुलाब जल', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'rose water'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'नींबू का रस', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'lemon juice'
  ON CONFLICT (alias_name) DO NOTHING;

-- OTHER ALIASES
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'vanilla pod', 'common', 'en' FROM ingredient_master WHERE name = 'vanilla bean'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'gelatin powder', 'common', 'en' FROM ingredient_master WHERE name = 'gelatin'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'polenta', 'common', 'en' FROM ingredient_master WHERE name = 'cornmeal'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'tapioca flour', 'common', 'en' FROM ingredient_master WHERE name = 'tapioca starch'
  ON CONFLICT (alias_name) DO NOTHING;
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
  SELECT id, 'साबूदाना', 'regional', 'hi-IN' FROM ingredient_master WHERE name = 'tapioca starch'
  ON CONFLICT (alias_name) DO NOTHING;

-- Verify
SELECT COUNT(*) as total_aliases FROM ingredient_aliases;
