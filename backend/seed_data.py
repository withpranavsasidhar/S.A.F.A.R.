import os
import sys
import numpy as np

# Ensure backend path is on sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal, engine, Base
from app.db.models import (
    User, Admin, Destination, Attraction, TourismDemand, CostData, Location, Event, Feedback
)
from app.core.security import get_password_hash

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if already seeded with Vijayawada
    existing_vga = db.query(Destination).filter(Destination.name == "Vijayawada").first()
    if existing_vga:
        print("Database already contains Vijayawada and seed data.")
        db.close()
        return

    # Clear old data if missing Vijayawada to re-seed cleanly
    db.query(Attraction).delete()
    db.query(TourismDemand).delete()
    db.query(CostData).delete()
    db.query(Destination).delete()
    db.commit()

    print("Seeding S.A.F.A.R. Prototype Database with Vijayawada & Indian Destinations...")

    # 1. Create Default Users if missing
    if db.query(User).count() == 0:
        admin_pwd = get_password_hash("admin123")
        user_pwd = get_password_hash("user123")

        admin_user = User(
            full_name="Dr. S.A.F.A.R. Administrator",
            email="admin@safar.ai",
            password_hash=admin_pwd,
            role="ADMIN",
            home_location="Vijayawada"
        )
        test_user = User(
            full_name="Review Evaluator",
            email="user@safar.ai",
            password_hash=user_pwd,
            role="USER",
            home_location="Vijayawada"
        )
        db.add(admin_user)
        db.add(test_user)
        db.commit()
        db.refresh(admin_user)
        db.refresh(test_user)

        admin_profile = Admin(user_id=admin_user.id, department="Tourism Research Analytics", is_superadmin=True)
        db.add(admin_profile)
        db.commit()

    # 2. Destinations Data
    destinations_data = [
        {
            "name": "Vijayawada",
            "region": "Krishna River Basin",
            "state": "Andhra Pradesh",
            "category": "Culture",
            "description": "Vibrant cultural capital of Andhra Pradesh nestled on Krishna River banks, renowned for Indrakeeladri hilltop temples, 4th-century rock-cut cave architecture, islands, and iconic river barrages.",
            "rating": 4.8,
            "base_daily_cost": 1800.0,
            "image_url": "https://images.unsplash.com/photo-1627894483216-2138af692e32?q=80&w=1200&auto=format&fit=crop",
            "latitude": 16.5062,
            "longitude": 80.6480,
            "best_months": "Oct, Nov, Dec, Jan, Feb, Mar",
            "tags": "Culture, Nature, Spiritual, River, History"
        },
        {
            "name": "Araku Valley",
            "region": "Eastern Ghats",
            "state": "Andhra Pradesh",
            "category": "Nature",
            "description": "Enchanting hill station in Andhra Pradesh renowned for aromatic coffee plantations, tribal culture, lush valleys, and ancient limestone caves.",
            "rating": 4.7,
            "base_daily_cost": 2200.0,
            "image_url": "https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?q=80&w=1200&auto=format&fit=crop",
            "latitude": 18.3273,
            "longitude": 82.8775,
            "best_months": "Oct, Nov, Dec, Jan, Feb",
            "tags": "Nature, Culture, Hills, Coffee, Waterfall"
        },
        {
            "name": "Munnar",
            "region": "Western Ghats",
            "state": "Kerala",
            "category": "Nature",
            "description": "Mist-covered tea gardens, rolling hills, rare wildlife, and cascading waterfalls in the heart of Kerala's Western Ghats.",
            "rating": 4.9,
            "base_daily_cost": 2800.0,
            "image_url": "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?q=80&w=1200&auto=format&fit=crop",
            "latitude": 10.0889,
            "longitude": 77.0595,
            "best_months": "Sep, Oct, Nov, Dec, Jan, Mar",
            "tags": "Nature, Tea Gardens, Wildlife, Hills"
        },
        {
            "name": "Coorg",
            "region": "Western Ghats",
            "state": "Karnataka",
            "category": "Nature",
            "description": "The Scotland of India, famed for spice scented mountain breeze, coffee estates, cascading waterfalls, and Kodava heritage.",
            "rating": 4.8,
            "base_daily_cost": 2600.0,
            "image_url": "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?q=80&w=1200&auto=format&fit=crop",
            "latitude": 12.3375,
            "longitude": 75.8069,
            "best_months": "Oct, Nov, Dec, Jan, Feb, Mar",
            "tags": "Nature, Coffee, Heritage, Waterfalls"
        },
        {
            "name": "Hampi",
            "region": "Deccan Plateau",
            "state": "Karnataka",
            "category": "Culture",
            "description": "UNESCO World Heritage site showcasing monumental Vijayanagara Empire stone temples, boulder-strewn hills, and ancient river heritage.",
            "rating": 4.8,
            "base_daily_cost": 1900.0,
            "image_url": "https://images.unsplash.com/photo-1600100397608-f010e423b971?q=80&w=1200&auto=format&fit=crop",
            "latitude": 15.3350,
            "longitude": 76.4600,
            "best_months": "Oct, Nov, Dec, Jan, Feb",
            "tags": "Culture, History, UNESCO, Architecture"
        },
        {
            "name": "Ooty",
            "region": "Nilgiri Hills",
            "state": "Tamil Nadu",
            "category": "Nature",
            "description": "Queen of Hill Stations featuring Nilgiri mountain railway, botanical gardens, pine forests, and cool mountain lakes.",
            "rating": 4.6,
            "base_daily_cost": 2700.0,
            "image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1200&auto=format&fit=crop",
            "latitude": 11.4102,
            "longitude": 76.6950,
            "best_months": "Oct, Nov, Dec, Jan, Feb, Mar",
            "tags": "Nature, Hills, Lake, Toy Train"
        },
        {
            "name": "Chikmagalur",
            "region": "Western Ghats",
            "state": "Karnataka",
            "category": "Nature",
            "description": "Birthplace of Indian coffee, surrounded by Mullayanagiri peak, lush valleys, trekking trails, and serene homestays.",
            "rating": 4.7,
            "base_daily_cost": 2400.0,
            "image_url": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?q=80&w=1200&auto=format&fit=crop",
            "latitude": 13.3161,
            "longitude": 75.7720,
            "best_months": "Sep, Oct, Nov, Dec, Jan, Feb",
            "tags": "Nature, Trekking, Coffee, Peaks"
        },
        {
            "name": "Pondicherry",
            "region": "Coromandel Coast",
            "state": "Tamil Nadu / UT",
            "category": "Culture",
            "description": "French colonial architecture, tranquil coastal promenades, spiritual ashrams, and vibrant Bohemian cafes.",
            "rating": 4.6,
            "base_daily_cost": 2300.0,
            "image_url": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?q=80&w=1200&auto=format&fit=crop",
            "latitude": 11.9416,
            "longitude": 79.8083,
            "best_months": "Oct, Nov, Dec, Jan, Feb",
            "tags": "Culture, Beach, Heritage, Food"
        },
        {
            "name": "Goa",
            "region": "Konkan Coast",
            "state": "Goa",
            "category": "Beach",
            "description": "Sun-kissed golden beaches, Portuguese heritage churches, seafood cuisine, and vibrant coastal culture.",
            "rating": 4.7,
            "base_daily_cost": 3200.0,
            "image_url": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=1200&auto=format&fit=crop",
            "latitude": 15.2993,
            "longitude": 74.1240,
            "best_months": "Nov, Dec, Jan, Feb",
            "tags": "Beach, Culture, Nightlife, Heritage"
        }
    ]

    dest_models = []
    for d_data in destinations_data:
        dest = Destination(**d_data)
        db.add(dest)
        dest_models.append(dest)

    db.commit()

    for d in dest_models:
        db.refresh(d)

    # 3. Add Attractions mapping
    attractions_mapping = {
        "Vijayawada": [
            {
                "name": "Kanaka Durga Temple",
                "category": "Culture & Spiritual",
                "description": "Sacred hilltop temple dedicated to Goddess Durga situated on Indrakeeladri hill overlooking the Krishna river.",
                "est_duration_hours": 2.5,
                "entry_fee": 50.0,
                "popularity_score": 4.9,
                "latitude": 16.5161,
                "longitude": 80.6069,
                "image_url": "https://images.unsplash.com/photo-1600100397608-f010e423b971?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Undavalli Rock-Cut Caves",
                "category": "Culture & Architecture",
                "description": "4th to 5th-century monolithic rock-cut cave temples featuring a colossal 5-meter reclining statue of Lord Vishnu carved out of single sandstone.",
                "est_duration_hours": 2.0,
                "entry_fee": 25.0,
                "popularity_score": 4.8,
                "latitude": 16.4975,
                "longitude": 80.5817,
                "image_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Bhavani Island",
                "category": "Nature & Adventure",
                "description": "Sprawling 130-acre river island in Krishna River featuring adventure water sports, boating, rope courses, and peaceful riverfront walks.",
                "est_duration_hours": 3.0,
                "entry_fee": 60.0,
                "popularity_score": 4.7,
                "latitude": 16.5220,
                "longitude": 80.5930,
                "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Prakasam Barrage",
                "category": "Nature & Views",
                "description": "Iconic 1.22 km road bridge barrage constructed across the Krishna river, creating a massive lake reservoir illuminated beautifully at sunset.",
                "est_duration_hours": 1.5,
                "entry_fee": 0.0,
                "popularity_score": 4.8,
                "latitude": 16.5050,
                "longitude": 80.6150,
                "image_url": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Kondapalli Fort & Toy Craft Village",
                "category": "Culture & Heritage",
                "description": "14th-century hill fortress built by Prolaya Vema Reddy, adjacent to the artisan village famed for handcrafted wooden Kondapalli Bommalu toys.",
                "est_duration_hours": 2.5,
                "entry_fee": 30.0,
                "popularity_score": 4.6,
                "latitude": 16.6200,
                "longitude": 80.5400,
                "image_url": "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Mangalagiri Panakala Narasimha Temple",
                "category": "Culture & Spiritual",
                "description": "Ancient sacred hill shrine near Vijayawada renowned for unique offerings of Panakam (sweet jaggery water) to Lord Narasimha.",
                "est_duration_hours": 2.0,
                "entry_fee": 20.0,
                "popularity_score": 4.7,
                "latitude": 16.4400,
                "longitude": 80.5700,
                "image_url": "https://images.unsplash.com/photo-1600100397608-f010e423b971?q=80&w=800&auto=format&fit=crop"
            }
        ],
        "Araku Valley": [
            {
                "name": "Borra Caves",
                "category": "Nature & Geology",
                "description": "Million-year-old limestone caves featuring majestic stalactite and stalagmite formations illuminated by colorful lighting.",
                "est_duration_hours": 2.5,
                "entry_fee": 80.0,
                "popularity_score": 4.9,
                "latitude": 18.2800,
                "longitude": 83.0400,
                "image_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Katiki Waterfalls",
                "category": "Nature & Adventure",
                "description": "50-foot natural waterfall nestled deep in bamboo forests accessible via scenic jeep ride and short forest trek.",
                "est_duration_hours": 2.0,
                "entry_fee": 50.0,
                "popularity_score": 4.7,
                "latitude": 18.2600,
                "longitude": 83.0100,
                "image_url": "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Araku Tribal Museum",
                "category": "Culture & Heritage",
                "description": "Cultural museum showcasing rich heritage, handicrafts, metallic art, and lifestyle of Eastern Ghats indigenous tribes.",
                "est_duration_hours": 1.5,
                "entry_fee": 40.0,
                "popularity_score": 4.6,
                "latitude": 18.3280,
                "longitude": 82.8790,
                "image_url": "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Ananthagiri Coffee Plantations",
                "category": "Nature & Experience",
                "description": "Aromatic shade-grown organic coffee estates offering coffee tasting sessions and scenic valley vistas.",
                "est_duration_hours": 2.0,
                "entry_fee": 0.0,
                "popularity_score": 4.8,
                "latitude": 18.2400,
                "longitude": 83.0100,
                "image_url": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=800&auto=format&fit=crop"
            }
        ],
        "Munnar": [
            {
                "name": "Tata Tea Museum",
                "category": "Culture & Heritage",
                "description": "Historic tea museum at Nallathanni Estate showcasing century-old tea processing machinery and tasting.",
                "est_duration_hours": 1.5,
                "entry_fee": 125.0,
                "popularity_score": 4.7,
                "latitude": 10.0923,
                "longitude": 77.0611,
                "image_url": "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Mattupetty Dam & Lake",
                "category": "Nature & Views",
                "description": "Scenic concrete gravity dam surrounded by lush tea hills offering boating and elephant spotting.",
                "est_duration_hours": 2.0,
                "entry_fee": 20.0,
                "popularity_score": 4.8,
                "latitude": 10.0631,
                "longitude": 77.1131,
                "image_url": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Eravikulam National Park",
                "category": "Nature & Wildlife",
                "description": "UNESCO-listed highland sanctuary home to the endangered Nilgiri Tahr and Anamudi peak views.",
                "est_duration_hours": 3.0,
                "entry_fee": 200.0,
                "popularity_score": 4.9,
                "latitude": 10.1536,
                "longitude": 77.0432,
                "image_url": "https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Top Station Viewpoint",
                "category": "Nature & Views",
                "description": "Highest point in Munnar at 1,700m offering panoramic views of the Western Ghats and Tamil Nadu plains.",
                "est_duration_hours": 2.0,
                "entry_fee": 30.0,
                "popularity_score": 4.8,
                "latitude": 10.1012,
                "longitude": 77.2311,
                "image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=800&auto=format&fit=crop"
            }
        ],
        "Coorg": [
            {
                "name": "Abbey Falls",
                "category": "Nature & Waterfall",
                "description": "Picturesque 70-foot waterfall tucked inside private coffee and spice plantations near Madikeri.",
                "est_duration_hours": 1.5,
                "entry_fee": 30.0,
                "popularity_score": 4.7,
                "latitude": 12.4057,
                "longitude": 75.7481,
                "image_url": "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Raja's Seat",
                "category": "Nature & Views",
                "description": "Historic hilltop garden overlooking misty Coorg valleys, renowned for golden sunsets.",
                "est_duration_hours": 1.5,
                "entry_fee": 20.0,
                "popularity_score": 4.8,
                "latitude": 12.4244,
                "longitude": 75.7382,
                "image_url": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Dubare Elephant Camp",
                "category": "Nature & Wildlife",
                "description": "Riverfront elephant training and conservation camp on the banks of the Kaveri river.",
                "est_duration_hours": 2.5,
                "entry_fee": 100.0,
                "popularity_score": 4.8,
                "latitude": 12.3505,
                "longitude": 75.9227,
                "image_url": "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Namdroling Monastery",
                "category": "Culture & Spiritual",
                "description": "Vibrant Tibetan Buddhist Golden Temple in Bylakuppe featuring 40-foot gilded Buddha statues.",
                "est_duration_hours": 2.0,
                "entry_fee": 0.0,
                "popularity_score": 4.9,
                "latitude": 12.3613,
                "longitude": 75.7290,
                "image_url": "https://images.unsplash.com/photo-1600100397608-f010e423b971?q=80&w=800&auto=format&fit=crop"
            }
        ],
        "Hampi": [
            {
                "name": "Virupaksha Temple",
                "category": "Culture & Spiritual",
                "description": "7th-century UNESCO-listed living temple complex with towering gopurams on the Tungabhadra banks.",
                "est_duration_hours": 2.0,
                "entry_fee": 50.0,
                "popularity_score": 4.9,
                "latitude": 15.3350,
                "longitude": 76.4600,
                "image_url": "https://images.unsplash.com/photo-1600100397608-f010e423b971?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Vittala Temple & Stone Chariot",
                "category": "Culture & Architecture",
                "description": "16th-century Vijayanagara masterpiece famous for its iconic carved Stone Chariot and musical pillars.",
                "est_duration_hours": 2.5,
                "entry_fee": 40.0,
                "popularity_score": 4.9,
                "latitude": 15.3360,
                "longitude": 76.4789,
                "image_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Lotus Mahal",
                "category": "Culture & Heritage",
                "description": "Indo-Islamic royal pavilion inside the Zenana Enclosure featuring symmetrical lotus-like arches.",
                "est_duration_hours": 1.5,
                "entry_fee": 40.0,
                "popularity_score": 4.7,
                "latitude": 15.3302,
                "longitude": 76.4699,
                "image_url": "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Hampi Bazaar & Matanga Hill",
                "category": "Nature & Heritage",
                "description": "Ancient colonnaded street leading to Matanga Hill, the premier sunrise and sunset viewpoint in Hampi.",
                "est_duration_hours": 2.0,
                "entry_fee": 0.0,
                "popularity_score": 4.8,
                "latitude": 15.3350,
                "longitude": 76.4604,
                "image_url": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=800&auto=format&fit=crop"
            }
        ],
        "Ooty": [
            {
                "name": "Ooty Botanical Garden",
                "category": "Nature & Gardens",
                "description": "55-acre terraced garden established in 1848 featuring a 20-million-year-old fossilized tree trunk.",
                "est_duration_hours": 2.0,
                "entry_fee": 50.0,
                "popularity_score": 4.7,
                "latitude": 11.4078,
                "longitude": 76.6950,
                "image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Ooty Lake & Boat House",
                "category": "Nature & Leisure",
                "description": "Artificial mountain lake surrounded by eucalyptus groves offering paddle and motor boating.",
                "est_duration_hours": 2.0,
                "entry_fee": 30.0,
                "popularity_score": 4.6,
                "latitude": 11.3932,
                "longitude": 76.6933,
                "image_url": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Doddabetta Peak",
                "category": "Nature & Views",
                "description": "Highest peak in the Nilgiri Mountains at 2,637m with a telescope house overlooking the plateau.",
                "est_duration_hours": 1.5,
                "entry_fee": 20.0,
                "popularity_score": 4.8,
                "latitude": 11.4073,
                "longitude": 76.7345,
                "image_url": "https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Nilgiri Mountain Railway",
                "category": "Culture & Heritage",
                "description": "UNESCO World Heritage meter-gauge toy train winding through tunnels, tea estates, and bridges.",
                "est_duration_hours": 2.5,
                "entry_fee": 150.0,
                "popularity_score": 4.9,
                "latitude": 11.4093,
                "longitude": 76.6929,
                "image_url": "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?q=80&w=800&auto=format&fit=crop"
            }
        ],
        "Chikmagalur": [
            {
                "name": "Mullayanagiri Peak",
                "category": "Nature & Trekking",
                "description": "Highest peak in Karnataka at 1,930m offering misty cloud-level views and a hilltop shrine.",
                "est_duration_hours": 2.5,
                "entry_fee": 0.0,
                "popularity_score": 4.9,
                "latitude": 13.4921,
                "longitude": 75.7937,
                "image_url": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Hebbe Falls",
                "category": "Nature & Waterfall",
                "description": "Two-tiered 551-foot waterfall inside Bhadra reserve accessible via coffee-estate jeep trails.",
                "est_duration_hours": 3.0,
                "entry_fee": 50.0,
                "popularity_score": 4.8,
                "latitude": 13.2459,
                "longitude": 75.6454,
                "image_url": "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Bhadra Wildlife Sanctuary",
                "category": "Nature & Wildlife",
                "description": "Biodiverse tiger reserve and shola forest sanctuary offering morning jeep safaris.",
                "est_duration_hours": 3.0,
                "entry_fee": 300.0,
                "popularity_score": 4.7,
                "latitude": 13.5145,
                "longitude": 75.6484,
                "image_url": "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Z Point Kemmanagundi",
                "category": "Nature & Trekking",
                "description": "Dramatic ridge trail near Kemmanagundi overlooking deep Western Ghats shola valleys.",
                "est_duration_hours": 2.0,
                "entry_fee": 0.0,
                "popularity_score": 4.7,
                "latitude": 13.3958,
                "longitude": 75.8129,
                "image_url": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=800&auto=format&fit=crop"
            }
        ],
        "Pondicherry": [
            {
                "name": "Auroville Matrimandir",
                "category": "Culture & Spiritual",
                "description": "Iconic golden geodesic meditation dome at the heart of the experimental international township.",
                "est_duration_hours": 2.5,
                "entry_fee": 0.0,
                "popularity_score": 4.8,
                "latitude": 12.0057,
                "longitude": 79.8116,
                "image_url": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "French Quarter & Promenade Beach",
                "category": "Culture & Heritage",
                "description": "Tree-lined colonial boulevards with mustard-yellow villas, cafes, and a 1.5 km coastal promenade.",
                "est_duration_hours": 2.5,
                "entry_fee": 0.0,
                "popularity_score": 4.9,
                "latitude": 11.9340,
                "longitude": 79.8282,
                "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Paradise Beach",
                "category": "Beach & Nature",
                "description": "Pristine golden sandbar beach reached by a short backwater ferry from Chunnambar Boat House.",
                "est_duration_hours": 2.5,
                "entry_fee": 150.0,
                "popularity_score": 4.7,
                "latitude": 11.8900,
                "longitude": 79.8300,
                "image_url": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Sri Aurobindo Ashram",
                "category": "Culture & Spiritual",
                "description": "Serene spiritual community founded in 1926, known for quiet courtyards and library.",
                "est_duration_hours": 1.5,
                "entry_fee": 0.0,
                "popularity_score": 4.7,
                "latitude": 11.9349,
                "longitude": 79.8285,
                "image_url": "https://images.unsplash.com/photo-1600100397608-f010e423b971?q=80&w=800&auto=format&fit=crop"
            }
        ],
        "Goa": [
            {
                "name": "Calangute & Baga Beach",
                "category": "Beach & Leisure",
                "description": "Iconic North Goa coastline famed for golden sands, water sports, and vibrant beach shacks.",
                "est_duration_hours": 3.0,
                "entry_fee": 0.0,
                "popularity_score": 4.7,
                "latitude": 15.5440,
                "longitude": 73.7523,
                "image_url": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Basilica of Bom Jesus",
                "category": "Culture & UNESCO",
                "description": "16th-century Baroque church in Old Goa, a UNESCO World Heritage site housing St. Francis Xavier.",
                "est_duration_hours": 1.5,
                "entry_fee": 0.0,
                "popularity_score": 4.9,
                "latitude": 15.5009,
                "longitude": 73.9315,
                "image_url": "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Fort Aguada",
                "category": "Culture & Views",
                "description": "17th-century Portuguese sea fort and lighthouse overlooking the Mandovi river estuary.",
                "est_duration_hours": 1.5,
                "entry_fee": 25.0,
                "popularity_score": 4.8,
                "latitude": 15.4975,
                "longitude": 73.7726,
                "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop"
            },
            {
                "name": "Dudhsagar Waterfalls",
                "category": "Nature & Adventure",
                "description": "Four-tiered 310-meter waterfall in Bhagwan Mahaveer Sanctuary on the Goa-Karnataka border.",
                "est_duration_hours": 3.5,
                "entry_fee": 100.0,
                "popularity_score": 4.9,
                "latitude": 15.3144,
                "longitude": 74.3144,
                "image_url": "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?q=80&w=800&auto=format&fit=crop"
            }
        ]
    }

    for dest in dest_models:
        attrs = attractions_mapping.get(dest.name, [
            {
                "name": f"{dest.name} Landmark View",
                "category": "Nature",
                "description": f"Beautiful spot in {dest.name}.",
                "est_duration_hours": 2.0,
                "entry_fee": 50.0,
                "popularity_score": 4.6,
                "latitude": dest.latitude + 0.01,
                "longitude": dest.longitude + 0.01,
                "image_url": dest.image_url
            },
            {
                "name": f"{dest.name} Heritage District",
                "category": "Culture",
                "description": f"Historical quarter in {dest.name}.",
                "est_duration_hours": 2.0,
                "entry_fee": 0.0,
                "popularity_score": 4.5,
                "latitude": dest.latitude - 0.01,
                "longitude": dest.longitude - 0.01,
                "image_url": dest.image_url
            }
        ])

        for a_data in attrs:
            attr = Attraction(
                destination_id=dest.id,
                **a_data
            )
            db.add(attr)

        # 4. Add Historical Monthly Demand Data (deterministic per destination & month)
        peak_months = [10, 11, 12, 1, 2]
        dest_offset = (dest.id * 450) % 2500
        for month in range(1, 13):
            if month in peak_months:
                base_count = 19500 + dest_offset + ((month * 370) % 2800)
                crowd = "HIGH" if base_count < 22000 else "PEAK"
                season_idx = round(1.35 + ((month % 5) * 0.09), 2)
            elif month in [6, 7]:
                base_count = 6500 + (dest_offset // 2) + ((month * 190) % 1200)
                crowd = "LOW"
                season_idx = round(0.55 + ((month % 2) * 0.1), 2)
            else:
                base_count = 12000 + (dest_offset // 2) + ((month * 280) % 1800)
                crowd = "MODERATE"
                season_idx = round(0.92 + ((month % 4) * 0.05), 2)

            demand = TourismDemand(
                destination_id=dest.id,
                year=2025,
                month=month,
                tourist_count=base_count,
                seasonality_index=season_idx,
                crowd_level=crowd
            )
            db.add(demand)

        # 5. Cost Data
        cost = CostData(
            destination_id=dest.id,
            avg_hotel_per_night=dest.base_daily_cost * 0.55,
            avg_meal_cost=dest.base_daily_cost * 0.25,
            avg_local_transport=dest.base_daily_cost * 0.12,
            avg_entry_fees=dest.base_daily_cost * 0.08,
            seasonal_multiplier=1.2 if dest.category == "Beach" else 1.1
        )
        db.add(cost)

    # 6. Seed Real Seasonal Events per Destination
    events_mapping = {
        "Vijayawada": [
            ("Dasara Navaratri at Indrakeeladri", "Oct", "Nine-day Teppotsavam and temple festival on Krishna riverfront.", "HIGH_SURGE"),
            ("Krishna Pushkaralu & River Cultural Fest", "Nov", "Evening cultural performances along Prakasam Barrage.", "MODERATE"),
        ],
        "Araku Valley": [
            ("Araku Utsav & Coffee Harvest", "Jan", "Tribal Dhimsa dance, organic coffee tastings, and valley craft fair.", "MODERATE"),
        ],
        "Munnar": [
            ("Munnar Tea & Blossom Season", "Sep", "Post-monsoon misty valleys and tea estate harvest walks.", "MODERATE"),
        ],
        "Coorg": [
            ("Puthari Harvest Festival", "Nov", "Traditional Kodava rice harvest celebration with folk music.", "MODERATE"),
        ],
        "Hampi": [
            ("Hampi Utsav Heritage Festival", "Nov", "Illuminated Vijayanagara ruins, classical dance, and craft bazaar.", "HIGH_SURGE"),
        ],
        "Ooty": [
            ("Nilgiri Summer Flower Show", "May", "Annual botanical exhibition at Ooty Botanical Gardens.", "HIGH_SURGE"),
        ],
        "Chikmagalur": [
            ("Coffee Blossom & Monsoon Mist", "Apr", "Aromatic white coffee blossoms across Western Ghats estates.", "LOW"),
        ],
        "Pondicherry": [
            ("Pondicherry Heritage Festival", "Feb", "Guided French Quarter walks, music, and coastal culinary pop-ups.", "MODERATE"),
        ],
        "Goa": [
            ("Goa Carnival", "Feb", "Parades, live brass bands, and Konkan street food across Panaji.", "HIGH_SURGE"),
        ],
    }

    for dest in dest_models:
        for ev_name, ev_month, ev_desc, ev_impact in events_mapping.get(dest.name, []):
            db.add(Event(
                destination_id=dest.id,
                name=ev_name,
                month=ev_month,
                description=ev_desc,
                impact_on_crowd=ev_impact,
            ))

    db.commit()
    db.close()
    print("Database successfully seeded with Vijayawada and Indian destinations.")

def ensure_nationwide_destinations(db):
    """
    Ensures that diverse destinations across North, South, East, West, Central, and North-East India
    are seeded in the database alongside their real attractions and hidden gems.
    Safe to run idempotently: will never duplicate or overwrite existing records.
    """
    nationwide_data = [
        {
            "name": "Jaipur",
            "region": "Aravalli Range",
            "state": "Rajasthan",
            "category": "Culture",
            "description": "The Pink City of Rajasthan famed for royal terracotta architecture, Amer Fort, City Palace, astronomical observatories, and vibrant block-print artisan bazaars.",
            "rating": 4.8,
            "base_daily_cost": 2400.0,
            "image_url": "https://images.unsplash.com/photo-1477587458883-47145ed94245?q=80&w=1200&auto=format&fit=crop",
            "latitude": 26.9124,
            "longitude": 75.7873,
            "best_months": "Oct, Nov, Dec, Jan, Feb, Mar",
            "tags": "Culture, Heritage, Forts, Palaces, Shopping, Architecture",
            "attractions": [
                {
                    "name": "Amber Palace & Fort",
                    "category": "Culture & Heritage",
                    "description": "16th-century hilltop Rajput fortress featuring Sheesh Mahal (Mirror Palace) and panoramic Maota Lake views.",
                    "est_duration_hours": 3.0,
                    "entry_fee": 100.0,
                    "popularity_score": 4.9,
                    "latitude": 26.9855,
                    "longitude": 75.8513,
                    "image_url": "https://images.unsplash.com/photo-1599661046289-e31897846e41?q=80&w=800&auto=format&fit=crop"
                },
                {
                    "name": "Hawa Mahal (Palace of Winds)",
                    "category": "Culture & Architecture",
                    "description": "Five-storey pink sandstone honeycomb facade built in 1799 with 953 jharokha latticed windows.",
                    "est_duration_hours": 1.5,
                    "entry_fee": 50.0,
                    "popularity_score": 4.8,
                    "latitude": 26.9239,
                    "longitude": 75.8267,
                    "image_url": "https://images.unsplash.com/photo-1609137144822-42c8d281d7c3?q=80&w=800&auto=format&fit=crop"
                },
                {
                    "name": "Nahargarh Fort Sunset Ridge",
                    "category": "Nature & Views",
                    "description": "Lesser-crowded hilltop defensive fort offering expansive evening vistas over the illuminated Pink City basin.",
                    "est_duration_hours": 2.0,
                    "entry_fee": 50.0,
                    "popularity_score": 4.5,
                    "latitude": 26.9374,
                    "longitude": 75.8156,
                    "image_url": "https://images.unsplash.com/photo-1599661046289-e31897846e41?q=80&w=800&auto=format&fit=crop"
                },
                {
                    "name": "Panna Meena ka Kund Stepwell",
                    "category": "Culture & Architecture",
                    "description": "16th-century geometric stepwell with interlocking criss-cross stone stairways and tranquil historic ambience.",
                    "est_duration_hours": 1.0,
                    "entry_fee": 0.0,
                    "popularity_score": 4.3,
                    "latitude": 26.9877,
                    "longitude": 75.8542,
                    "image_url": "https://images.unsplash.com/photo-1477587458883-47145ed94245?q=80&w=800&auto=format&fit=crop"
                }
            ]
        },
        {
            "name": "Varanasi",
            "region": "Gangetic Plains",
            "state": "Uttar Pradesh",
            "category": "Culture",
            "description": "Spiritual heart of India and one of the world's oldest living cities, defined by sacred stone ghats, evening Aarti, and riverfront music traditions.",
            "rating": 4.8,
            "base_daily_cost": 1700.0,
            "image_url": "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?q=80&w=1200&auto=format&fit=crop",
            "latitude": 25.3176,
            "longitude": 82.9739,
            "best_months": "Oct, Nov, Dec, Jan, Feb, Mar",
            "tags": "Culture, Spiritual, River, Heritage, Ancient",
            "attractions": [
                {
                    "name": "Dashashwamedh Ghat & Evening Ganga Aarti",
                    "category": "Culture & Spiritual",
                    "description": "Grand evening brass lamp ceremony with Sanskrit chants performed by priests on the holy Ganges riverbank.",
                    "est_duration_hours": 2.0,
                    "entry_fee": 0.0,
                    "popularity_score": 4.9,
                    "latitude": 25.3075,
                    "longitude": 83.0104,
                    "image_url": "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?q=80&w=800&auto=format&fit=crop"
                },
                {
                    "name": "Sarnath Buddhist Deer Park & Dhamek Stupa",
                    "category": "Culture & Heritage",
                    "description": "Historic site where Gautama Buddha delivered his first sermon, featuring ancient 500 CE monolithic stupa and calm gardens.",
                    "est_duration_hours": 2.5,
                    "entry_fee": 25.0,
                    "popularity_score": 4.5,
                    "latitude": 25.3811,
                    "longitude": 83.0214,
                    "image_url": "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?q=80&w=800&auto=format&fit=crop"
                },
                {
                    "name": "Assi Ghat & Subah-e-Banaras",
                    "category": "Culture & Views",
                    "description": "Southernmost river ghat famed for sunrise classical morning concerts, yoga sessions, and traditional lemon chai stalls.",
                    "est_duration_hours": 2.0,
                    "entry_fee": 0.0,
                    "popularity_score": 4.6,
                    "latitude": 25.2889,
                    "longitude": 83.0069,
                    "image_url": "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?q=80&w=800&auto=format&fit=crop"
                }
            ]
        },
        {
            "name": "Manali",
            "region": "Pir Panjal & Beas Valley",
            "state": "Himachal Pradesh",
            "category": "Nature",
            "description": "High-altitude Himalayan valley nestled between snow-clad peaks, pine forests, cascading river valleys, and mountain passes.",
            "rating": 4.7,
            "base_daily_cost": 2900.0,
            "image_url": "https://images.unsplash.com/photo-1586500036706-41963de24d8b?q=80&w=1200&auto=format&fit=crop",
            "latitude": 32.2432,
            "longitude": 77.1892,
            "best_months": "Oct, Nov, Dec, Jan, Feb, Mar, May, Jun",
            "tags": "Nature, Mountains, Snow, Adventure, Trekking, River",
            "attractions": [
                {
                    "name": "Solang Valley Adventure Hub",
                    "category": "Nature & Adventure",
                    "description": "Glacial valley renowned for paragliding, zorbing, winter skiing, and sweeping views of snow-draped Pir Panjal peaks.",
                    "est_duration_hours": 3.5,
                    "entry_fee": 0.0,
                    "popularity_score": 4.8,
                    "latitude": 32.3166,
                    "longitude": 77.1578,
                    "image_url": "https://images.unsplash.com/photo-1586500036706-41963de24d8b?q=80&w=800&auto=format&fit=crop"
                },
                {
                    "name": "Hadimba Temple Cedar Sanctuary",
                    "category": "Culture & Spiritual",
                    "description": "1553 CE pagoda-style wooden temple built amidst giant Himalayan deodar cedar trees in Dhungri Forest.",
                    "est_duration_hours": 1.5,
                    "entry_fee": 20.0,
                    "popularity_score": 4.7,
                    "latitude": 32.2483,
                    "longitude": 77.1804,
                    "image_url": "https://images.unsplash.com/photo-1586500036706-41963de24d8b?q=80&w=800&auto=format&fit=crop"
                },
                {
                    "name": "Vashisht Natural Sulphur Springs & Waterfall Trail",
                    "category": "Nature & Wellness",
                    "description": "Peaceful village perched across the Beas River featuring ancient hot sulphur springs and a scenic pine-fringed trail to Jogini Waterfall.",
                    "est_duration_hours": 2.5,
                    "entry_fee": 0.0,
                    "popularity_score": 4.4,
                    "latitude": 32.2612,
                    "longitude": 77.1983,
                    "image_url": "https://images.unsplash.com/photo-1586500036706-41963de24d8b?q=80&w=800&auto=format&fit=crop"
                }
            ]
        },
        {
            "name": "Rishikesh",
            "region": "Garhwal Himalayas",
            "state": "Uttarakhand",
            "category": "Nature",
            "description": "Yoga capital of the world situated along emerald Himalayan waters of the Ganges, offering white-water rafting, serene ashrams, and mountain breezes.",
            "rating": 4.7,
            "base_daily_cost": 2100.0,
            "image_url": "https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?q=80&w=1200&auto=format&fit=crop",
            "latitude": 30.0869,
            "longitude": 78.2676,
            "best_months": "Sep, Oct, Nov, Dec, Feb, Mar, Apr",
            "tags": "Nature, Spiritual, Adventure, Yoga, River, Hills",
            "attractions": [
                {
                    "name": "Triveni Ghat Evening Maha Aarti",
                    "category": "Culture & Spiritual",
                    "description": "Spiritual river confluence where floating leaf lamps illuminate the Ganges at dusk accompanied by temple bells.",
                    "est_duration_hours": 2.0,
                    "entry_fee": 0.0,
                    "popularity_score": 4.8,
                    "latitude": 30.1039,
                    "longitude": 78.2936,
                    "image_url": "https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?q=80&w=800&auto=format&fit=crop"
                },
                {
                    "name": "The Beatles Ashram (Chaurasi Kutia)",
                    "category": "Culture & Heritage",
                    "description": "Historic 1968 meditation retreat inside Rajaji Tiger Reserve, covered with striking graffiti murals, dome huts, and tranquil birdlife.",
                    "est_duration_hours": 2.5,
                    "entry_fee": 150.0,
                    "popularity_score": 4.4,
                    "latitude": 30.1136,
                    "longitude": 78.3182,
                    "image_url": "https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?q=80&w=800&auto=format&fit=crop"
                },
                {
                    "name": "Neer Garh Waterfall Trail",
                    "category": "Nature & Views",
                    "description": "Multi-tiered natural jade waterfall tucked inside a shaded forest ravine with refreshing shallow pools and minimal crowds.",
                    "est_duration_hours": 2.0,
                    "entry_fee": 30.0,
                    "popularity_score": 4.3,
                    "latitude": 30.1415,
                    "longitude": 78.3371,
                    "image_url": "https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?q=80&w=800&auto=format&fit=crop"
                }
            ]
        },
        {
            "name": "Darjeeling",
            "region": "Eastern Himalayas",
            "state": "West Bengal",
            "category": "Nature",
            "description": "Colonial hill town in Eastern Himalayas world-renowned for orthodox muscatel black tea, Kanchenjunga sunrise panoramas, and the UNESCO Toy Train.",
            "rating": 4.7,
            "base_daily_cost": 2500.0,
            "image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1200&auto=format&fit=crop",
            "latitude": 27.0410,
            "longitude": 88.2663,
            "best_months": "Oct, Nov, Dec, Mar, Apr, May",
            "tags": "Nature, Tea, Mountains, UNESCO, Hills, Heritage",
            "attractions": [
                {
                    "name": "Tiger Hill Kanchenjunga Sunrise",
                    "category": "Nature & Views",
                    "description": "High vantage point at 2,590m offering first rays of sunlight striking Mount Kanchenjunga and Mount Everest.",
                    "est_duration_hours": 2.5,
                    "entry_fee": 50.0,
                    "popularity_score": 4.9,
                    "latitude": 27.0052,
                    "longitude": 88.2435,
                    "image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=800&auto=format&fit=crop"
                },
                {
                    "name": "Happy Valley Tea Estate Heritage Walk",
                    "category": "Nature & Culture",
                    "description": "Historic organic tea plantation established in 1854, with guided factory processing tours and quiet hillside estate trails.",
                    "est_duration_hours": 2.0,
                    "entry_fee": 100.0,
                    "popularity_score": 4.5,
                    "latitude": 27.0531,
                    "longitude": 88.2641,
                    "image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=800&auto=format&fit=crop"
                },
                {
                    "name": "Japanese Peace Pagoda & Nipponzan Myohoji",
                    "category": "Culture & Spiritual",
                    "description": "Pristine white Buddhist stupa set in peaceful pine woods showcasing the four avatars of Buddha in polished sandstone.",
                    "est_duration_hours": 1.5,
                    "entry_fee": 0.0,
                    "popularity_score": 4.4,
                    "latitude": 27.0306,
                    "longitude": 88.2687,
                    "image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=800&auto=format&fit=crop"
                }
            ]
        },
        {
            "name": "Shillong",
            "region": "Khasi Hills",
            "state": "Meghalaya",
            "category": "Nature",
            "description": "Scotland of the East, famed for pine-covered hills, crystal rivers, living root bridges, indie music heritage, and refreshing plateau breezes.",
            "rating": 4.8,
            "base_daily_cost": 2600.0,
            "image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop",
            "latitude": 25.5788,
            "longitude": 91.8933,
            "best_months": "Sep, Oct, Nov, Dec, Mar, Apr, May",
            "tags": "Nature, Waterfalls, Hills, Rock, Living Roots, Culture",
            "attractions": [
                {
                    "name": "Umiam Lake Watersport & Pine Lookout",
                    "category": "Nature & Adventure",
                    "description": "Expansive reservoir lake surrounded by emerald Khasi pine hills offering kayaking, boat rides, and panoramic sunset points.",
                    "est_duration_hours": 2.5,
                    "entry_fee": 50.0,
                    "popularity_score": 4.7,
                    "latitude": 25.6667,
                    "longitude": 91.9000,
                    "image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=800&auto=format&fit=crop"
                },
                {
                    "name": "Laitlum Canyons Gorge Trail",
                    "category": "Nature & Views",
                    "description": "Dramatic cliff precipice dropping into deep forested river valleys, with quiet mist trails and fewer commercial crowds.",
                    "est_duration_hours": 3.0,
                    "entry_fee": 0.0,
                    "popularity_score": 4.3,
                    "latitude": 25.4678,
                    "longitude": 91.8912,
                    "image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=800&auto=format&fit=crop"
                },
                {
                    "name": "Don Bosco Indigenous Museum of Indigenous Cultures",
                    "category": "Culture & Heritage",
                    "description": "Seven-storey cultural research center preserving traditional artifacts, textiles, and tribal architecture of all eight North-Eastern states.",
                    "est_duration_hours": 2.5,
                    "entry_fee": 100.0,
                    "popularity_score": 4.6,
                    "latitude": 25.5925,
                    "longitude": 91.9056,
                    "image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=800&auto=format&fit=crop"
                }
            ]
        },
        {
            "name": "Konark & Puri",
            "region": "Bay of Bengal Coast",
            "state": "Odisha",
            "category": "Culture",
            "description": "Coastal heritage corridor anchored by the 13th-century UNESCO Sun Temple sculpted as a monumental stone chariot and serene golden beaches.",
            "rating": 4.7,
            "base_daily_cost": 2000.0,
            "image_url": "https://images.unsplash.com/photo-1600100397608-f010e423b971?q=80&w=1200&auto=format&fit=crop",
            "latitude": 19.8876,
            "longitude": 86.0945,
            "best_months": "Oct, Nov, Dec, Jan, Feb, Mar",
            "tags": "Culture, UNESCO, Beach, Sun Temple, Heritage, Spiritual",
            "attractions": [
                {
                    "name": "Konark Sun Temple (UNESCO)",
                    "category": "Culture & Architecture",
                    "description": "13th-century architectural marvel built as a 24-wheel chariot of Surya with exquisite stone erotic and musical sculptures.",
                    "est_duration_hours": 3.0,
                    "entry_fee": 40.0,
                    "popularity_score": 4.9,
                    "latitude": 19.8876,
                    "longitude": 86.0945,
                    "image_url": "https://images.unsplash.com/photo-1600100397608-f010e423b971?q=80&w=800&auto=format&fit=crop"
                },
                {
                    "name": "Chandrabhaga Beach Sunrise Point",
                    "category": "Nature & Views",
                    "description": "Tranquil Blue Flag beach where sacred Chandrabhaga river met the sea, ideal for quiet morning coastal walks.",
                    "est_duration_hours": 1.5,
                    "entry_fee": 0.0,
                    "popularity_score": 4.6,
                    "latitude": 19.8661,
                    "longitude": 86.1102,
                    "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop"
                },
                {
                    "name": "Kuruma Ancient Buddhist Archaeological Site",
                    "category": "Culture & Heritage",
                    "description": "9th-century excavated Buddhist monastery with antique terracotta seals, brick foundations, and quiet rural heritage setting.",
                    "est_duration_hours": 1.5,
                    "entry_fee": 0.0,
                    "popularity_score": 4.2,
                    "latitude": 19.8700,
                    "longitude": 86.1300,
                    "image_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop"
                }
            ]
        }
    ]

    new_dests = []
    for d_data in nationwide_data:
        attrs_data = d_data.pop("attractions", [])
        existing = db.query(Destination).filter(Destination.name == d_data["name"]).first()
        if not existing:
            dest = Destination(**d_data)
            db.add(dest)
            db.commit()
            db.refresh(dest)
            new_dests.append((dest, attrs_data))
        else:
            if db.query(Attraction).filter(Attraction.destination_id == existing.id).count() == 0:
                new_dests.append((existing, attrs_data))

    for dest, attrs_data in new_dests:
        for a in attrs_data:
            existing_attr = db.query(Attraction).filter(Attraction.destination_id == dest.id, Attraction.name == a["name"]).first()
            if not existing_attr:
                db.add(Attraction(
                    destination_id=dest.id,
                    opening_time="08:00 AM",
                    closing_time="06:00 PM",
                    **a
                ))

        if db.query(TourismDemand).filter(TourismDemand.destination_id == dest.id).count() == 0:
            for month in range(1, 13):
                peak = month in [10, 11, 12, 1, 2]
                base_count = 18000 if peak else 9000
                db.add(TourismDemand(
                    destination_id=dest.id,
                    year=2025,
                    month=month,
                    tourist_count=base_count,
                    seasonality_index=1.3 if peak else 0.8,
                    crowd_level="HIGH" if peak else "MODERATE"
                ))

        if db.query(CostData).filter(CostData.destination_id == dest.id).count() == 0:
            db.add(CostData(
                destination_id=dest.id,
                avg_hotel_per_night=dest.base_daily_cost * 0.55,
                avg_meal_cost=dest.base_daily_cost * 0.25,
                avg_local_transport=dest.base_daily_cost * 0.12,
                avg_entry_fees=dest.base_daily_cost * 0.08,
                seasonal_multiplier=1.15
            ))

    db.commit()

if __name__ == "__main__":
    seed_database()
