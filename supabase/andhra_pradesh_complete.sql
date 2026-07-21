-- ============================================================
--  CROPGUARD AI — Andhra Pradesh Complete Database
--  Run this ENTIRELY in Supabase SQL Editor
--  Safe to run multiple times
-- ============================================================

-- ── CREATE TABLES IF NOT EXISTS ─────────────────────────────
CREATE TABLE IF NOT EXISTS crops (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    scientific_name VARCHAR(150),
    category        VARCHAR(100),
    growing_season  VARCHAR(100),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pests (
    id                   SERIAL PRIMARY KEY,
    name                 VARCHAR(150) NOT NULL UNIQUE,
    scientific_name      VARCHAR(200),
    pest_type            VARCHAR(50),
    symptoms             TEXT,
    causes               TEXT,
    favorable_conditions TEXT,
    affected_crop_parts  VARCHAR(200),
    severity_level       VARCHAR(20) DEFAULT 'moderate',
    created_at           TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pesticides (
    id                   SERIAL PRIMARY KEY,
    name                 VARCHAR(200) NOT NULL UNIQUE,
    trade_name           VARCHAR(200),
    type                 VARCHAR(50),
    active_ingredient    VARCHAR(200),
    dosage               VARCHAR(200),
    application_method   VARCHAR(200),
    safety_interval_days INTEGER,
    is_organic           BOOLEAN DEFAULT FALSE,
    precautions          TEXT,
    created_at           TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crop_pests (
    id                 SERIAL PRIMARY KEY,
    crop_id            INTEGER REFERENCES crops(id) ON DELETE CASCADE,
    pest_id            INTEGER REFERENCES pests(id) ON DELETE CASCADE,
    occurrence_season  VARCHAR(200),
    spread_method      VARCHAR(200),
    UNIQUE(crop_id, pest_id)
);

CREATE TABLE IF NOT EXISTS pest_pesticides (
    id                 SERIAL PRIMARY KEY,
    pest_id            INTEGER REFERENCES pests(id) ON DELETE CASCADE,
    pesticide_id       INTEGER REFERENCES pesticides(id) ON DELETE CASCADE,
    effectiveness      VARCHAR(20),
    application_stage  VARCHAR(200),
    notes              TEXT,
    UNIQUE(pest_id, pesticide_id)
);

-- ── CLEAR OLD DATA SAFELY ────────────────────────────────────
DELETE FROM pest_pesticides;
DELETE FROM crop_pests;
DELETE FROM pesticides;
DELETE FROM pests;
DELETE FROM crops;

-- Reset sequences
ALTER SEQUENCE crops_id_seq RESTART WITH 1;
ALTER SEQUENCE pests_id_seq RESTART WITH 1;
ALTER SEQUENCE pesticides_id_seq RESTART WITH 1;

-- ── ANDHRA PRADESH CROPS ─────────────────────────────────────
INSERT INTO crops (name, scientific_name, category, growing_season) VALUES
('Coconut',       'Cocos nucifera',           'Plantation',  'Year-round'),
('Banana',        'Musa paradisiaca',          'Fruit',       'Year-round'),
('Sugarcane',     'Saccharum officinarum',     'Cash Crop',   'Year-round'),
('Sunflower',     'Helianthus annuus',         'Oilseed',     'Rabi / Kharif'),
('Tobacco',       'Nicotiana tabacum',         'Cash Crop',   'Rabi'),
('Turmeric',      'Curcuma longa',             'Spice',       'Kharif'),
('Cashewnut',     'Anacardium occidentale',    'Plantation',  'Year-round'),
('Black Pepper',  'Piper nigrum',              'Spice',       'Year-round'),
('Arecanut',      'Areca catechu',             'Plantation',  'Year-round'),
('Tapioca',       'Manihot esculenta',         'Tuber',       'Year-round'),
('Potato',        'Solanum tuberosum',         'Vegetable',   'Rabi'),
('Ginger',        'Zingiber officinale',       'Spice',       'Kharif'),
('Garlic',        'Allium sativum',            'Vegetable',   'Rabi'),
('Coriander',     'Coriandrum sativum',        'Spice',       'Rabi'),
('Sweet Potato',  'Ipomoea batatas',           'Tuber',       'Kharif'),
('Sannhemp',      'Crotalaria juncea',         'Fibre',       'Kharif'),
('Paddy',         'Oryza sativa',              'Cereal',      'Kharif / Rabi'),
('Maize',         'Zea mays',                  'Cereal',      'Kharif'),
('Groundnut',     'Arachis hypogaea',          'Oilseed',     'Kharif'),
('Chilli',        'Capsicum annuum',           'Vegetable',   'Kharif / Rabi'),
('Tomato',        'Solanum lycopersicum',      'Vegetable',   'Year-round'),
('Cotton',        'Gossypium hirsutum',        'Cash Crop',   'Kharif'),
('Mango',         'Mangifera indica',          'Fruit',       'Year-round'),
('Papaya',        'Carica papaya',             'Fruit',       'Year-round');

-- ── ANDHRA PRADESH PESTS ─────────────────────────────────────
INSERT INTO pests (name, scientific_name, pest_type, symptoms, causes, favorable_conditions, affected_crop_parts, severity_level) VALUES
-- COCONUT
('Rhinoceros Beetle',        'Oryctes rhinoceros',         'insect',  'Holes in crown, spear leaves cut, oozing from trunk',           'Decaying organic matter nearby, poor sanitation',                   'Warm humid conditions, temp 25-32C',                        'Crown, spear leaves',   'critical'),
('Red Palm Weevil',          'Rhynchophorus ferrugineus',  'insect',  'Wilting of crown, yellowing fronds, fermented smell from trunk', 'Injuries to palm trunk, nearby infected palms',                     'Temp 28-35C, high humidity, AP coastal areas',              'Trunk, crown',          'critical'),
('Coconut Leaf Caterpillar', 'Opisina arenosella',         'insect',  'Pale streaks on leaflets, brown papery appearance of fronds',   'Dry weather, dense planting',                                       'Temp 25-35C, low rainfall, dry coastal areas',              'Leaves, fronds',        'high'),
('Coconut Eriophyid Mite',   'Aceria guerreronis',         'insect',  'Pale triangular patches on coconuts, stunted nut development',  'Hot dry weather, low humidity',                                     'Temp 28-38C, low rainfall, AP coastal belt',                'Nuts, perianth',        'high'),
('Coconut Bud Rot',          'Phytophthora palmivora',     'fungus',  'Crown leaves wilt, rotting of spear leaf with foul smell',      'Excess rain, waterlogging, poor drainage',                          'High rainfall, temp 20-28C, monsoon season',                'Crown bud, spear leaf', 'critical'),
-- BANANA
('Panama Wilt',              'Fusarium oxysporum',         'fungus',  'Yellowing of lower leaves, brown vascular discolouration inside pseudostem', 'Infected soil, poor drainage, monoculture farming',    'Temp 24-30C, high soil moisture',                           'Roots, pseudostem',     'critical'),
('Banana Bunchy Top Virus',  'Banana bunchy top virus',    'virus',   'Narrow upright leaves, dark green streaks on midrib, stunted growth', 'Aphid transmission, infected planting material',            'Year-round in AP, coastal and delta districts',             'Leaves, whole plant',   'critical'),
('Sigatoka Leaf Spot',       'Mycosphaerella fijiensis',   'fungus',  'Yellow-brown streaks on leaves enlarging to dark necrotic patches', 'High humidity, dense planting, poor air circulation',        'Humidity above 80%, temp 25-30C, post-monsoon',             'Leaves',                'high'),
('Banana Stem Weevil',       'Odoiporus longicollis',      'insect',  'Tunnels in pseudostem, yellowing of leaves, plant collapse',    'Infected planting suckers, wounds on stem',                         'Temp 25-32C, humid conditions, year-round',                 'Pseudostem, corm',      'high'),
('Banana Aphid',             'Pentalonia nigronervosa',    'insect',  'Curling leaves, sticky honeydew, spreads bunchy top virus',     'Warm dry weather, water stress',                                    'Temp 22-30C, low rainfall periods',                         'Leaves, stem',          'moderate'),
-- SUGARCANE
('Early Shoot Borer',        'Chilo infuscatellus',        'insect',  'Dead hearts in young shoots, holes in stem base with frass',    'Dry weather after planting, ratoon crops',                          'Temp 28-35C, low rainfall, April-June in AP',               'Shoots, stem base',     'high'),
('Top Borer',                'Scirpophaga excerptalis',    'insect',  'Dead hearts in grand growth stage, holes in top internodes',    'Dry spell during grand growth phase',                               'Temp 26-32C, hot dry conditions, May-July',                 'Top internodes, shoots', 'high'),
('Sugarcane Pyrilla',        'Pyrilla perpusilla',         'insect',  'Hopperburn, sooty mould on leaves, honeydew deposits',         'Dense crop canopy, high nitrogen application, monsoon',             'Humidity above 75%, temp 25-30C, July-October',             'Leaves',                'moderate'),
('Sugarcane Red Rot',        'Colletotrichum falcatum',    'fungus',  'Red discolouration inside stalk, white patches with red margin, sour smell', 'Infected seed cane, waterlogging, stem borer wounds',   'Temp 28-32C, high humidity, post-monsoon',                  'Stalk, internodes',     'critical'),
('Sugarcane Grassy Shoot',   'Phytoplasma',                'bacteria','Excessive tillering, pale yellow narrow leaves, no economic yield', 'Infected seed cane, leafhopper vectors',                     'Year-round, all AP sugarcane areas',                        'Whole plant',           'critical'),
-- SUNFLOWER
('Sunflower Head Borer',     'Helicoverpa armigera',       'insect',  'Holes in capitulum, frass on head, damaged developing seeds',   'Warm dry weather, carryover from cotton and tomato crops',          'Temp 25-35C, Rabi season Jan-March in AP',                  'Head, seeds',           'high'),
('Alternaria Blight',        'Alternaria helianthi',       'fungus',  'Dark brown circular spots on leaves and stem, head and stem rot', 'High humidity, dense planting, overhead irrigation',            'Temp 25-30C, humidity above 80%, post-monsoon',             'Leaves, head, stem',    'high'),
('Sunflower Charcoal Rot',   'Macrophomina phaseolina',    'fungus',  'Grey-black discolouration at stem base, wilting and plant death', 'Drought stress, high temperature, infected soil',               'Temp 30-38C, dry sandy soils of Kurnool and Anantapur',     'Stem base, roots',      'high'),
-- TOBACCO
('Tobacco Caterpillar',      'Spodoptera litura',          'insect',  'Gregarious larval feeding on leaves, skeletonized leaves, mass defoliation', 'Warm humid weather, monoculture cropping system',      'Temp 25-32C, post-monsoon Sep-Nov, Guntur and Prakasam',    'Leaves',                'critical'),
('Tobacco Aphid',            'Myzus persicae',             'insect',  'Curling and puckering of leaves, virus transmission, stunted plants', 'Mild temperatures, dry weather conditions',               'Temp 18-25C, Rabi season Dec-Feb',                          'Leaves',                'high'),
('Tobacco Mosaic Virus',     'Tobacco mosaic virus',       'virus',   'Mosaic discolouration on leaves, leaf distortion, stunted growth', 'Infected transplants, aphid vectors, contact transmission',   'Year-round, highest in Rabi tobacco season',                'Whole plant',           'high'),
('Root Knot Nematode',       'Meloidogyne incognita',      'nematode','Root galls, yellowing of leaves, stunted growth, wilting',      'Infected soil, sandy soils, repeated tobacco cropping',             'Temp 25-30C, light sandy soils of AP tobacco belt',         'Roots',                 'high'),
-- TURMERIC
('Turmeric Leaf Blotch',     'Taphrina maculans',          'fungus',  'Rectangular brown blotches on leaves with yellow margin',       'High humidity, poor drainage, dense planting',                      'Humidity above 85%, temp 25-30C, monsoon July-Sep',         'Leaves',                'moderate'),
('Rhizome Rot',              'Pythium aphanidermatum',     'fungus',  'Yellowing of leaves, soft rotting of rhizomes with foul smell', 'Waterlogging, infected planting material, heavy rain',              'Temp 25-32C, heavy rainfall, monsoon season',               'Rhizomes, roots',       'critical'),
('Turmeric Shoot Borer',     'Conogethes punctiferalis',   'insect',  'Central shoot wilts and dries, frass at base, dead heart',      'Warm humid conditions, dense crop stand',                           'Temp 25-32C, humidity above 75%, Kharif season',            'Shoot, pseudostem',     'high'),
-- CHILLI
('Chilli Thrips',            'Scirtothrips dorsalis',      'insect',  'Upward curling of leaves, silvery streaks, scarring of fruits', 'Dry hot weather, dusty field conditions',                           'Temp 28-35C, low humidity, Guntur chilli belt',             'Leaves, fruits',        'high'),
('Chilli Fruit Borer',       'Helicoverpa armigera',       'insect',  'Circular holes in fruits, frass inside fruit, premature drop',  'Carry-over population from cotton, warm dry weather',               'Temp 25-32C, Kharif to Rabi transition Oct-Dec',            'Fruits',                'high'),
('Chilli Leaf Curl Virus',   'Chilli leaf curl virus',     'virus',   'Curling and puckering of leaves upward, stunted plant growth',  'Whitefly transmission, infected seedlings from nursery',            'Year-round, worst Oct-Jan in AP chilli belt',               'Leaves, whole plant',   'high'),
('Chilli Powdery Mildew',    'Leveillula taurica',         'fungus',  'White powdery coating on lower leaf surface, premature leaf fall', 'Dry weather with cool nights, dense planting',                  'Temp 20-28C, low humidity, Rabi season',                    'Leaves',                'moderate'),
-- PADDY
('Brown Plant Hopper',       'Nilaparvata lugens',         'insect',  'Yellowing in circular patches called hopperburn, complete plant death', 'High nitrogen fertilizer, dense planting, stagnant water', 'Humidity above 80%, temp 25-30C, monsoon Kharif season',    'Leaves, stem base',     'critical'),
('Rice Blast',               'Magnaporthe oryzae',         'fungus',  'Diamond-shaped grey lesions with brown border on leaves, neck rot at panicle stage', 'Excess nitrogen, drought stress, susceptible variety', 'Temp 24-28C, leaf wetness above 10 hours, post-monsoon',  'Leaves, neck, panicle', 'critical'),
('Paddy Stem Borer',         'Scirpophaga incertulas',     'insect',  'Dead heart in vegetative stage, white ear head in reproductive stage', 'Ratooning, high nitrogen application, continuous cropping',  'Temp 26-32C, Kharif and Rabi seasons AP',                   'Stem, tiller',          'high'),
('Paddy Gall Midge',         'Orseolia oryzae',            'insect',  'Onion-leaf or silver shoot formation, complete yield loss in affected tillers', 'Ratooning, water stagnation, susceptible varieties',  'Temp 25-30C, high humidity, early Kharif June-Aug',         'Tillers',               'high'),
('Bacterial Leaf Blight',    'Xanthomonas oryzae',         'bacteria','Water-soaked lesions on leaf margins turning yellow to white straw colour', 'Infected irrigation water, flood water, wounds on leaves', 'Temp 25-30C, high humidity, monsoon flooding',              'Leaves',                'high'),
-- GROUNDNUT
('Tikka Leaf Spot',          'Cercospora arachidicola',    'fungus',  'Circular brown spots with distinct yellow halo on leaves',      'High humidity, dense canopy, post-monsoon conditions',              'Humidity above 80%, temp 25-30C, Aug-Oct',                  'Leaves',                'high'),
('Groundnut Bud Necrosis',   'Groundnut bud necrosis tospovirus','virus','Necrosis of growing buds, ring spots on leaves, distorted growth', 'Thrips transmission, infected weed hosts nearby',           'Temp 22-30C, Kharif season, dry spells',                    'Buds, leaves',          'high'),
('White Grub',               'Holotrichia consanguinea',   'insect',  'Sudden wilting and yellowing, roots eaten, plant lifted easily', 'Sandy loam soils, adult beetles appearing June-July after rains', 'Temp 25-32C, Kharif onset after first rains',               'Roots',                 'high'),
-- COTTON
('Pink Bollworm',            'Pectinophora gossypiella',   'insect',  'Rosette flower formation, damaged bolls with pink larvae inside', 'Late sown cotton, ratooning, warm conditions',                    'Temp 25-35C, post-monsoon Oct-Dec',                         'Bolls, flowers',        'critical'),
('Cotton Whitefly',          'Bemisia tabaci',             'insect',  'Yellowing of leaves, thick honeydew deposits, sooty mould, virus transmission', 'High temperature, dry weather, pesticide resistance',  'Temp 28-38C, low humidity, Oct-Jan AP cotton belt',         'Leaves',                'high'),
('Thrips on Cotton',         'Thrips tabaci',              'insect',  'Silvery crinkled leaves, upward curling, distorted leaf growth', 'Dry weather, water stress, early sown crop',                       'Temp 28-35C, low humidity, June-Aug',                       'Leaves',                'moderate'),
-- CASHEWNUT
('Tea Mosquito Bug',         'Helopeltis antonii',         'insect',  'Dark brown necrotic spots on tender shoots and fruits, die-back', 'High humidity, shade, dense canopy',                              'Temp 25-32C, post-monsoon, Srikakulam and East Godavari',   'Tender shoots, fruits', 'high'),
('Cashew Stem and Root Borer','Plocaederus ferrugineus',   'insect',  'Gum exudation from trunk, bark cracking, plant wilting',        'Old orchards, bark injuries, stressed trees',                        'Year-round, peak dry season',                               'Stem, roots',           'high'),
-- MANGO
('Mango Hopper',             'Idioscopus clypealis',       'insect',  'Drying of inflorescences, honeydew deposits, sooty mould',      'Dense canopy, high humidity during flowering season',               'Temp 20-28C, flowering season Jan-Mar',                     'Inflorescence, leaves', 'high'),
('Mango Powdery Mildew',     'Oidium mangiferae',          'fungus',  'White powdery coating on flowers and young fruits, fruit drop',  'Cool nights with warm days, high humidity at night',               'Temp 18-28C, Jan-Mar flowering season',                     'Flowers, young fruits', 'high'),
('Anthracnose',              'Colletotrichum gloeosporioides','fungus','Dark sunken spots on fruits, blossom blight, post-harvest rot', 'High humidity, rain during flowering, warm conditions',             'Temp 25-30C, high rainfall, monsoon',                       'Fruits, flowers',       'high');

-- ── PESTICIDES (Indian brands, AP market available) ──────────
INSERT INTO pesticides (name, trade_name, type, active_ingredient, dosage, application_method, safety_interval_days, is_organic, precautions) VALUES
('Chlorpyrifos 20% EC',             'Durmet / Lorsban',       'chemical',   'Chlorpyrifos',           '2.5ml per litre',     'Foliar spray',             28, FALSE, 'Avoid near water bodies. Wear protective gear.'),
('Imidacloprid 17.8% SL',          'Confidor / Admire',      'chemical',   'Imidacloprid',           '0.5ml per litre',     'Foliar spray or drench',   21, FALSE, 'Toxic to bees. Max 2 sprays per season.'),
('Fipronil 5% SC',                  'Regent',                 'chemical',   'Fipronil',               '1.5ml per litre',     'Soil drench or spray',     30, FALSE, 'Highly toxic to fish. Avoid near ponds.'),
('Lambda-cyhalothrin 5% EC',        'Karate / Warrior',       'chemical',   'Lambda-cyhalothrin',     '1ml per litre',       'Foliar spray',             14, FALSE, 'Wear gloves and mask. Toxic to aquatic life.'),
('Spinosad 45% SC',                 'Tracer',                 'biological', 'Spinosad',               '0.3ml per litre',     'Foliar spray',             3,  FALSE, 'Low mammalian toxicity. Safe for beneficial insects.'),
('Thiamethoxam 25% WG',             'Actara',                 'chemical',   'Thiamethoxam',           '0.5g per litre',      'Foliar spray or drench',   14, FALSE, 'Toxic to bees. Do not spray on open flowers.'),
('Profenofos 50% EC',               'Curacron',               'chemical',   'Profenofos',             '2ml per litre',       'Foliar spray',             14, FALSE, 'Do not mix with alkaline pesticides.'),
('Emamectin Benzoate 5% SG',        'Proclaim / Denim',       'chemical',   'Emamectin Benzoate',     '0.5g per litre',      'Foliar spray',             5,  FALSE, 'Very effective against borers. Apply at early infestation.'),
('Neem Oil 1500 PPM',               'Neemazal / Econeem',     'organic',    'Azadirachtin',           '3-5ml per litre',     'Foliar spray',             0,  TRUE,  'Safe for humans and animals. Best applied in evening hours.'),
('Beauveria bassiana 1.15% WP',     'BioMagic / Myco-Jaal',   'biological', 'Beauveria bassiana',     '5g per litre',        'Foliar spray',             0,  FALSE, 'Do not mix with fungicides. Apply in evening.'),
('Acetamiprid 20% SP',              'Pride / Mospilan',       'chemical',   'Acetamiprid',            '0.3g per litre',      'Foliar spray',             7,  FALSE, 'Effective against sucking pests. Rotate with other groups.'),
('Spiromesifen 22.9% SC',           'Oberon',                 'chemical',   'Spiromesifen',           '1ml per litre',       'Foliar spray',             7,  FALSE, 'Excellent for mite and whitefly nymphs.'),
('Carbofuran 3% CG',                'Furadan',                'chemical',   'Carbofuran',             '25kg per hectare',    'Soil incorporation',       60, FALSE, 'Highly toxic. Full PPE required. Keep away from water.'),
('Mancozeb 75% WP',                 'Dithane M-45 / Indofil', 'chemical',   'Mancozeb',               '2.5g per litre',      'Foliar spray',             7,  FALSE, 'Wear mask during spraying. Avoid inhalation.'),
('Metalaxyl 8% + Mancozeb 64% WP', 'Ridomil Gold',           'chemical',   'Metalaxyl + Mancozeb',   '2.5g per litre',      'Foliar spray or drench',   14, FALSE, 'Best for downy mildew and damping off diseases.'),
('Tricyclazole 75% WP',             'Beam / Tilt',            'chemical',   'Tricyclazole',           '0.6g per litre',      'Foliar spray',             14, FALSE, 'Most effective for rice blast. Apply at first symptom.'),
('Hexaconazole 5% EC',              'Contaf / Hexadhan',      'chemical',   'Hexaconazole',           '2ml per litre',       'Foliar spray',             15, FALSE, 'Systemic fungicide. Effective against stem rot.'),
('Carbendazim 50% WP',              'Bavistin / Derosal',     'chemical',   'Carbendazim',            '1g per litre',        'Foliar spray or drench',   7,  FALSE, 'Broad spectrum. Max 3 sprays per season.'),
('Propiconazole 25% EC',            'Tilt / Bumper',          'chemical',   'Propiconazole',          '1ml per litre',       'Foliar spray',             14, FALSE, 'Systemic. Effective against rusts and leaf spots.'),
('Copper Oxychloride 50% WP',       'Blitox / Fytolan',       'chemical',   'Copper Oxychloride',     '3g per litre',        'Foliar spray',             7,  FALSE, 'Broad spectrum. Avoid use in heat above 35C.'),
('Tebuconazole 25.9% EC',           'Folicur',                'chemical',   'Tebuconazole',           '1ml per litre',       'Foliar spray',             14, FALSE, 'Systemic. Excellent for smuts and leaf spots.'),
('Trichoderma viride 1% WP',        'Bioderma / Trichorich',  'biological', 'Trichoderma viride',     '4g per litre water or 4kg per acre soil', 'Seed treatment or soil drench', 0, TRUE, 'Safe for soil microbiome. Best biocontrol agent.'),
('Streptomycin Sulfate 90% SP',     'Agrimycin',              'chemical',   'Streptomycin Sulfate',   '0.5g per litre',      'Foliar spray',             7,  FALSE, 'Use only when bacterial infection confirmed.'),
('Paecilomyces lilacinus 1% WP',    'Bionem / MeloCon',       'biological', 'Paecilomyces lilacinus', '4kg per acre',        'Soil incorporation',       0,  TRUE,  'Excellent bioagent for nematode management in AP soils.'),
('Pongamia Oil 3%',                 'Karanj Oil',             'organic',    'Karanjin',               '10ml per litre',      'Foliar spray',             0,  TRUE,  'Traditional AP organic pesticide. Eco-friendly.'),
('Pseudomonas fluorescens',         'Biofit / Pseufit',       'biological', 'Pseudomonas fluorescens','10g per litre',       'Seed treatment or drench', 0,  TRUE,  'Promotes plant growth and suppresses soil diseases.');

-- ── CROP-PEST MAPPINGS ────────────────────────────────────────
INSERT INTO crop_pests (crop_id, pest_id, occurrence_season, spread_method)
SELECT c.id, p.id, v.season, v.spread
FROM (VALUES
  ('Coconut',      'Rhinoceros Beetle',         'Year-round, peak Mar-Jun',        'Adult flight, movement of infested organic matter'),
  ('Coconut',      'Red Palm Weevil',            'Year-round, peak May-Sep',        'Adult flight, infected planting material'),
  ('Coconut',      'Coconut Leaf Caterpillar',   'Nov-Feb dry season',              'Moth flight from nearby infested palms'),
  ('Coconut',      'Coconut Eriophyid Mite',     'Mar-Jun hot dry season',          'Wind dispersal, infested plant material'),
  ('Coconut',      'Coconut Bud Rot',            'Monsoon Jul-Oct',                 'Rainwater splash, infected cutting tools'),
  ('Banana',       'Panama Wilt',                'Year-round, peak Kharif',         'Infected soil, irrigation water, planting material'),
  ('Banana',       'Banana Bunchy Top Virus',    'Year-round',                      'Aphid vectors, infected suckers'),
  ('Banana',       'Sigatoka Leaf Spot',         'Post-monsoon Sep-Jan',            'Wind-borne spores, rain splash'),
  ('Banana',       'Banana Stem Weevil',         'Year-round, peak May-Aug',        'Infested planting material, movement of corms'),
  ('Banana',       'Banana Aphid',               'Dec-Mar dry cool season',         'Wind dispersal, ant vectors'),
  ('Sugarcane',    'Early Shoot Borer',          'Apr-Jul post planting',           'Moth flight, egg masses on leaves'),
  ('Sugarcane',    'Top Borer',                  'May-Aug',                         'Moth flight from neighbouring fields'),
  ('Sugarcane',    'Sugarcane Pyrilla',          'Jul-Oct monsoon',                 'Adult flight, wind dispersal'),
  ('Sugarcane',    'Sugarcane Red Rot',          'Post-monsoon Aug-Nov',            'Infected seed cane, irrigation water'),
  ('Sugarcane',    'Sugarcane Grassy Shoot',     'Year-round',                      'Infected seed cane, leafhopper vectors'),
  ('Sunflower',    'Sunflower Head Borer',       'Jan-Mar Rabi season',             'Moth migration from cotton and tomato fields'),
  ('Sunflower',    'Alternaria Blight',          'Post-monsoon Oct-Dec',            'Wind-borne spores, rain splash on leaves'),
  ('Sunflower',    'Sunflower Charcoal Rot',     'Mar-May summer',                  'Infected soil, drought stress'),
  ('Tobacco',      'Tobacco Caterpillar',        'Sep-Nov post-monsoon',            'Moth flight, mass migration'),
  ('Tobacco',      'Tobacco Aphid',              'Dec-Feb Rabi',                    'Wind dispersal, planting material'),
  ('Tobacco',      'Tobacco Mosaic Virus',       'Year-round',                      'Contact transmission, aphid vectors'),
  ('Tobacco',      'Root Knot Nematode',         'Year-round',                      'Infected soil, irrigation water movement'),
  ('Turmeric',     'Turmeric Leaf Blotch',       'Jul-Sep monsoon',                 'Wind spores, rain splash'),
  ('Turmeric',     'Rhizome Rot',                'Jul-Sep heavy rain',              'Infected rhizomes, waterlogging'),
  ('Turmeric',     'Turmeric Shoot Borer',       'Jun-Sep Kharif',                  'Moth flight from nearby fields'),
  ('Chilli',       'Chilli Thrips',              'Oct-Jan Rabi onset',              'Wind, infested planting material from nursery'),
  ('Chilli',       'Chilli Fruit Borer',         'Sep-Dec',                         'Moth migration from cotton fields'),
  ('Chilli',       'Chilli Leaf Curl Virus',     'Oct-Jan',                         'Whitefly vectors, infected seedlings'),
  ('Chilli',       'Chilli Powdery Mildew',      'Dec-Feb cool dry season',         'Wind-borne spores from infected plants'),
  ('Paddy',        'Brown Plant Hopper',         'Jul-Oct Kharif monsoon',          'Wind migration from distant areas'),
  ('Paddy',        'Rice Blast',                 'Aug-Nov',                         'Wind-borne spores, infected seed'),
  ('Paddy',        'Paddy Stem Borer',           'Jun-Oct Kharif',                  'Moth flight, egg laying on leaves'),
  ('Paddy',        'Paddy Gall Midge',           'Jun-Aug early Kharif',            'Adult fly movement between fields'),
  ('Paddy',        'Bacterial Leaf Blight',      'Jul-Sep monsoon',                 'Flood water, rain splash, pruning wounds'),
  ('Groundnut',    'Tikka Leaf Spot',            'Aug-Oct',                         'Wind-borne spores, rain splash'),
  ('Groundnut',    'Groundnut Bud Necrosis',     'Jun-Sep Kharif',                  'Thrips vectors, infected weed hosts'),
  ('Groundnut',    'White Grub',                 'Jun-Aug after first rains',        'Adult beetle flight after monsoon onset'),
  ('Cotton',       'Pink Bollworm',              'Oct-Dec',                         'Moth flight, infested seed cotton'),
  ('Cotton',       'Cotton Whitefly',            'Oct-Jan',                         'Wind dispersal, plant movement'),
  ('Cotton',       'Thrips on Cotton',           'Jun-Aug early Kharif',            'Wind dispersal, planting material'),
  ('Cashewnut',    'Tea Mosquito Bug',           'Post-monsoon Oct-Feb',            'Adult flight from nearby plantations'),
  ('Cashewnut',    'Cashew Stem and Root Borer', 'Year-round, peak dry season',     'Adult beetle flight, bark injuries'),
  ('Mango',        'Mango Hopper',               'Flowering Jan-Mar',               'Adult flight, wind dispersal'),
  ('Mango',        'Mango Powdery Mildew',       'Jan-Mar flowering season',        'Wind-borne spores'),
  ('Mango',        'Anthracnose',                'Monsoon and post-monsoon',        'Rain splash, infected fruit contact')
) AS v(crop_name, pest_name, season, spread)
JOIN crops c ON c.name = v.crop_name
JOIN pests  p ON p.name = v.pest_name;

-- ── PEST-PESTICIDE MAPPINGS ───────────────────────────────────
INSERT INTO pest_pesticides (pest_id, pesticide_id, effectiveness, application_stage, notes)
SELECT p.id, pe.id, v.eff, v.stage, v.notes
FROM (VALUES
  ('Rhinoceros Beetle',        'Chlorpyrifos 20% EC',             'high',   'Active infestation',    'Fill crown with chlorpyrifos mixed sand'),
  ('Rhinoceros Beetle',        'Fipronil 5% SC',                  'high',   'Active infestation',    'Apply in leaf axils of crown'),
  ('Rhinoceros Beetle',        'Neem Oil 1500 PPM',               'medium', 'Preventive',            'Fill crown with neem oil mixed sand as preventive'),
  ('Red Palm Weevil',          'Chlorpyrifos 20% EC',             'high',   'Active infestation',    'Inject into trunk holes, seal after injection'),
  ('Red Palm Weevil',          'Fipronil 5% SC',                  'high',   'Early detection',       'Trunk injection method, most effective'),
  ('Coconut Leaf Caterpillar', 'Chlorpyrifos 20% EC',             'high',   'Early infestation',     'Spray on leaflets covering both surfaces'),
  ('Coconut Leaf Caterpillar', 'Beauveria bassiana 1.15% WP',     'medium', 'Early infestation',     'Biological option, spray in evening'),
  ('Coconut Eriophyid Mite',   'Spiromesifen 22.9% SC',           'high',   'Active mite infestation','Spray on developing bunches and perianth area'),
  ('Coconut Bud Rot',          'Copper Oxychloride 50% WP',       'high',   'Early symptoms',        'Remove affected parts first, then spray'),
  ('Coconut Bud Rot',          'Metalaxyl 8% + Mancozeb 64% WP', 'high',   'Active disease',        'Drench crown area thoroughly'),
  ('Panama Wilt',              'Trichoderma viride 1% WP',        'medium', 'Preventive at planting', 'Soil application around roots at planting'),
  ('Panama Wilt',              'Carbendazim 50% WP',              'medium', 'Early wilt symptoms',   'Drench 2 litres per plant around pseudostem'),
  ('Banana Bunchy Top Virus',  'Imidacloprid 17.8% SL',           'high',   'Preventive',            'Control aphid vector, remove infected plants'),
  ('Sigatoka Leaf Spot',       'Propiconazole 25% EC',            'high',   'Early spots',           'Spray covering both leaf surfaces'),
  ('Sigatoka Leaf Spot',       'Mancozeb 75% WP',                 'medium', 'Preventive',            'Protectant spray at 15-day intervals'),
  ('Banana Stem Weevil',       'Chlorpyrifos 20% EC',             'high',   'Active infestation',    'Apply at base of pseudostem and in leaf axils'),
  ('Banana Aphid',             'Acetamiprid 20% SP',              'high',   'Active infestation',    'Thorough coverage of undersurface of leaves'),
  ('Early Shoot Borer',        'Chlorpyrifos 20% EC',             'high',   'At first dead heart',   'Pour into leaf whorl, 5ml per plant'),
  ('Early Shoot Borer',        'Carbofuran 3% CG',                'high',   'At planting',           'Soil application at planting time'),
  ('Early Shoot Borer',        'Emamectin Benzoate 5% SG',        'high',   'Active borer',          'Spray in leaf whorl for good control'),
  ('Top Borer',                'Emamectin Benzoate 5% SG',        'high',   'Active borer',          'Apply in leaf whorl of growing point'),
  ('Sugarcane Pyrilla',        'Profenofos 50% EC',               'high',   'Active hopper',         'Spray in evening for best effect'),
  ('Sugarcane Pyrilla',        'Thiamethoxam 25% WG',             'high',   'Heavy infestation',     'Systemic action, single spray effective'),
  ('Sugarcane Red Rot',        'Carbendazim 50% WP',              'high',   'Sett treatment',        'Soak seed cane in solution before planting'),
  ('Sunflower Head Borer',     'Emamectin Benzoate 5% SG',        'high',   'At bud stage',          'Spray before head formation for best control'),
  ('Sunflower Head Borer',     'Spinosad 45% SC',                 'high',   'Active borer',          'Biological insecticide, safe option'),
  ('Alternaria Blight',        'Mancozeb 75% WP',                 'high',   'First symptoms',        'Spray at 10-day intervals in monsoon'),
  ('Alternaria Blight',        'Hexaconazole 5% EC',              'high',   'Active disease',        'Systemic action, good curative effect'),
  ('Sunflower Charcoal Rot',   'Trichoderma viride 1% WP',        'medium', 'Preventive',            'Seed treatment plus soil application'),
  ('Tobacco Caterpillar',      'Spinosad 45% SC',                 'high',   'Early instar larvae',   'Most effective biological option for AP'),
  ('Tobacco Caterpillar',      'Chlorpyrifos 20% EC',             'high',   'Active feeding',        'Spray in evening when larvae are active'),
  ('Tobacco Caterpillar',      'Profenofos 50% EC',               'high',   'Heavy infestation',     'For large larvae use profenofos'),
  ('Tobacco Aphid',            'Imidacloprid 17.8% SL',           'high',   'Active infestation',    'Systemic action, single spray effective'),
  ('Tobacco Aphid',            'Acetamiprid 20% SP',              'high',   'Active infestation',    'Alternate with imidacloprid to prevent resistance'),
  ('Root Knot Nematode',       'Carbofuran 3% CG',                'high',   'Before planting',       'Soil incorporation 15 days before transplanting'),
  ('Root Knot Nematode',       'Paecilomyces lilacinus 1% WP',    'medium', 'Preventive',            'Biological nematicide, safe for soil health'),
  ('Rhizome Rot',              'Metalaxyl 8% + Mancozeb 64% WP', 'high',   'Early rot symptoms',    'Drench soil around plants plus foliar spray'),
  ('Turmeric Shoot Borer',     'Chlorpyrifos 20% EC',             'high',   'Active borer',          'Spray in leaf whorl thoroughly'),
  ('Turmeric Leaf Blotch',     'Mancozeb 75% WP',                 'high',   'First symptoms',        'Preventive spray from monsoon onset'),
  ('Chilli Thrips',            'Spinosad 45% SC',                 'high',   'Active thrips',         'Best option for thrips in Guntur AP'),
  ('Chilli Thrips',            'Fipronil 5% SC',                  'high',   'Heavy infestation',     'Rotate with spinosad to prevent resistance'),
  ('Chilli Fruit Borer',       'Emamectin Benzoate 5% SG',        'high',   'Active borer',          'Spray covering fruits thoroughly'),
  ('Chilli Leaf Curl Virus',   'Imidacloprid 17.8% SL',           'high',   'Preventive',            'Control whitefly vector before virus spreads'),
  ('Chilli Powdery Mildew',    'Hexaconazole 5% EC',              'high',   'First symptoms',        'Spray covering lower surface of leaves'),
  ('Brown Plant Hopper',       'Fipronil 5% SC',                  'high',   'At first hopper',       'Spray at base of rice plants'),
  ('Brown Plant Hopper',       'Thiamethoxam 25% WG',             'high',   'Active hopper',         'Rotate with fipronil to prevent resistance'),
  ('Brown Plant Hopper',       'Neem Oil 1500 PPM',               'medium', 'Early stage',           'Organic option for AP organic farmers'),
  ('Rice Blast',               'Tricyclazole 75% WP',             'high',   'First lesions appear',  'Most effective fungicide for AP rice blast'),
  ('Rice Blast',               'Hexaconazole 5% EC',              'high',   'Active disease',        'Systemic action, good curative effect'),
  ('Paddy Stem Borer',         'Carbofuran 3% CG',                'high',   'At transplanting',      'Soil application for early protection'),
  ('Paddy Stem Borer',         'Chlorpyrifos 20% EC',             'high',   'Active borer',          'Spray in leaf whorl area of plants'),
  ('Paddy Gall Midge',         'Carbofuran 3% CG',                'high',   'At transplanting',      'Most effective at gall midge prone areas'),
  ('Bacterial Leaf Blight',    'Streptomycin Sulfate 90% SP',     'high',   'First symptoms',        'Mix with copper oxychloride for best effect'),
  ('Bacterial Leaf Blight',    'Copper Oxychloride 50% WP',       'medium', 'Preventive',            'Protectant spray before flood season'),
  ('Tikka Leaf Spot',          'Mancozeb 75% WP',                 'high',   'First spots appear',    'Spray at 10-day intervals'),
  ('Tikka Leaf Spot',          'Tebuconazole 25.9% EC',           'high',   'Active disease',        'Systemic action, good curative effect'),
  ('Groundnut Bud Necrosis',   'Thiamethoxam 25% WG',             'high',   'Preventive',            'Control thrips vector early in season'),
  ('White Grub',               'Chlorpyrifos 20% EC',             'high',   'At grub stage',         'Soil drench or furrow irrigation application'),
  ('White Grub',               'Fipronil 5% SC',                  'high',   'At planting',           'Seed treatment or soil application'),
  ('Pink Bollworm',            'Emamectin Benzoate 5% SG',        'high',   'At boll formation',     'Spray on bolls from 60 DAS'),
  ('Pink Bollworm',            'Spinosad 45% SC',                 'high',   'Active borer',          'Biological option for AP cotton farmers'),
  ('Cotton Whitefly',          'Spiromesifen 22.9% SC',           'high',   'Active whitefly',       'Targets nymphs, spray undersurface of leaves'),
  ('Cotton Whitefly',          'Acetamiprid 20% SP',              'high',   'Active infestation',    'Spray lower surface of leaves'),
  ('Thrips on Cotton',         'Spinosad 45% SC',                 'high',   'Active thrips',         'Best thrips control option'),
  ('Tea Mosquito Bug',         'Thiamethoxam 25% WG',             'high',   'Active bug',            'Spray on tender shoots and young fruits'),
  ('Tea Mosquito Bug',         'Lambda-cyhalothrin 5% EC',        'high',   'Heavy infestation',     'Knockdown effect, spray in cool hours'),
  ('Mango Hopper',             'Imidacloprid 17.8% SL',           'high',   'Pre-flowering',         'Spray before flowering starts'),
  ('Mango Hopper',             'Lambda-cyhalothrin 5% EC',        'high',   'Active hopper',         'Two sprays at 15-day interval'),
  ('Mango Powdery Mildew',     'Hexaconazole 5% EC',              'high',   'First symptoms',        'Two sprays at 15-day interval from flowering'),
  ('Mango Powdery Mildew',     'Tebuconazole 25.9% EC',           'high',   'Active disease',        'Systemic action, best for AP mango'),
  ('Anthracnose',              'Copper Oxychloride 50% WP',       'high',   'Pre-monsoon',           'Spray before monsoon onset'),
  ('Anthracnose',              'Carbendazim 50% WP',              'high',   'Active disease',        'Post-harvest dip treatment for mango')
) AS v(pest_name, pesticide_name, eff, stage, notes)
JOIN pests      p  ON p.name  = v.pest_name
JOIN pesticides pe ON pe.name = v.pesticide_name;

-- Verify
SELECT 'Crops' as table_name, COUNT(*) as rows FROM crops
UNION ALL SELECT 'Pests', COUNT(*) FROM pests
UNION ALL SELECT 'Pesticides', COUNT(*) FROM pesticides
UNION ALL SELECT 'Crop-Pest mappings', COUNT(*) FROM crop_pests
UNION ALL SELECT 'Pest-Pesticide mappings', COUNT(*) FROM pest_pesticides;
